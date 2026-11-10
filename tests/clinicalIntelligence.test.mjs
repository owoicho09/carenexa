import assert from "node:assert/strict";
import test from "node:test";
import { deterministicFlags, describeDataGaps } from "../src/lib/clinicalRules.ts";
import { attachEvidence, INSIGHT_JSON_SCHEMA, parseInsightResponse } from "../src/lib/ai/insightParsing.ts";

const now = new Date("2026-11-10T12:00:00.000Z");
const d = (iso) => new Date(iso);

const lab = (id, testName, value, isAbnormal, enteredAt) => ({
  id, testName, resultType: "NUMERIC", value, qualitativeValue: null, unit: "mg/dL", isAbnormal, enteredAt: d(enteredAt),
});
const visit = (id, openedAt, extra = {}) => ({
  id, openedAt: d(openedAt), followUpDate: null, labResults: [], vitals: [], diagnoses: [], prescriptions: [], ...extra,
});
const patient = (extra = {}) => ({ id: "p1", registeredAt: d("2026-01-01T00:00:00Z"), allergies: [], genotype: "AA", visits: [], ...extra });

const ruleIds = (flags) => flags.map((f) => f.ruleId).sort();

// --- deterministic rules ----------------------------------------------------

test("no data produces no rule flags", () => {
  assert.deepEqual(deterministicFlags(patient(), now), []);
});

test("allergies and sickle cell genotype are flagged from the record", () => {
  const flags = deterministicFlags(patient({ allergies: ["Penicillin"], genotype: "SS" }), now);
  assert.deepEqual(ruleIds(flags), ["DOCUMENTED_ALLERGY", "SICKLE_CELL_GENOTYPE"]);
  assert.equal(deterministicFlags(patient({ genotype: "AS" }), now).length, 0);
});

test("abnormality comes only from the lab's own flag, not a new threshold", () => {
  const normalButHigh = patient({ visits: [visit("v1", "2026-03-01", { labResults: [lab("l1", "Glucose", 400, false, "2026-03-01")] })] });
  assert.equal(deterministicFlags(normalButHigh, now).length, 0);
  const flagged = patient({ visits: [visit("v1", "2026-03-01", { labResults: [lab("l1", "Glucose", 140, true, "2026-03-01")] })] });
  assert.deepEqual(ruleIds(deterministicFlags(flagged, now)), ["ABNORMAL_LATEST_RESULT"]);
});

test("repeated abnormal results are detected across encounters, with each record as evidence", () => {
  const p = patient({
    visits: [
      visit("v1", "2026-03-01", { labResults: [lab("l1", "Glucose", 160, true, "2026-03-01")] }),
      visit("v2", "2026-06-01", { labResults: [lab("l2", "Glucose", 170, true, "2026-06-01")] }),
    ],
  });
  const [flag] = deterministicFlags(p, now);
  assert.equal(flag.ruleId, "REPEATED_ABNORMAL_RESULT");
  assert.deepEqual(flag.evidence.map((e) => e.recordId), ["l1", "l2"]);
});

test("a passed follow-up date is overdue only if no later visit happened", () => {
  const missed = patient({ visits: [visit("v1", "2026-03-01", { followUpDate: d("2026-04-01") })] });
  assert.deepEqual(ruleIds(deterministicFlags(missed, now)), ["OVERDUE_FOLLOW_UP"]);
  const attended = patient({ visits: [visit("v1", "2026-03-01", { followUpDate: d("2026-04-01") }), visit("v2", "2026-04-02")] });
  assert.equal(deterministicFlags(attended, now).length, 0);
  const future = patient({ visits: [visit("v1", "2026-11-01", { followUpDate: d("2026-12-01") })] });
  assert.equal(deterministicFlags(future, now).length, 0);
});

// --- data gaps --------------------------------------------------------------

test("gaps list categories with no local data", () => {
  const gaps = describeDataGaps({ patient: patient({ visits: [visit("v1", "2026-03-01")] }), identityVerifiedHere: true, sources: [] });
  assert.ok(gaps.some((g) => g.includes("No vitals")));
  assert.ok(gaps.some((g) => g.includes("No laboratory results")));
});

test("gaps explain that unverified identity blocks external records", () => {
  const gaps = describeDataGaps({ patient: patient(), identityVerifiedHere: false, sources: [] });
  assert.ok(gaps.some((g) => g.includes("not verified in person")));
});

test("gaps name categories not authorized from a sharing hospital", () => {
  const gaps = describeDataGaps({
    patient: patient(),
    identityVerifiedHere: true,
    sources: [{ hospitalName: "General Hospital", local: false, categories: ["LAB_RESULTS", "DIAGNOSES"] }],
  });
  const line = gaps.find((g) => g.startsWith("From General Hospital"));
  assert.ok(line && line.includes("clinical notes") && !line.includes("laboratory results"));
});

test("gaps never name hospitals that have not shared records", () => {
  const gaps = describeDataGaps({ patient: patient(), identityVerifiedHere: true, sources: [{ hospitalName: "This Hospital", local: true, categories: [] }] });
  assert.ok(gaps.every((g) => !g.includes("Specialist") && !g.includes("General")));
});

// --- AI output parsing ------------------------------------------------------

const records = [
  { recordId: "l1", recordType: "LAB_RESULT", hospitalName: "General Hospital", recordedAt: "2026-03-01T00:00:00Z", fact: "Glucose 160" },
  { recordId: "l2", recordType: "LAB_RESULT", hospitalName: "Specialist Hospital", recordedAt: "2026-06-01T00:00:00Z", fact: "Glucose 170" },
];

test("well-formed output is parsed, including limitations", () => {
  const parsed = parseInsightResponse(JSON.stringify({ observations: [{ title: "Rising glucose", summary: "May warrant review", evidenceRefs: ["l1", "l2"] }], limitations: ["No HbA1c recorded"] }));
  assert.equal(parsed.observations.length, 1);
  assert.deepEqual(parsed.limitations, ["No HbA1c recorded"]);
});

test("output wrapped in a markdown fence is still parsed", () => {
  const parsed = parseInsightResponse('```json\n{"observations":[],"limitations":[]}\n```');
  assert.deepEqual(parsed, { observations: [], limitations: [] });
});

test("malformed output is rejected rather than guessed at", () => {
  assert.equal(parseInsightResponse("Patient looks fine."), null);
  assert.equal(parseInsightResponse('{"insights":[]}'), null);
  const partial = parseInsightResponse('{"observations":[{"title":"x"},{"title":"ok","summary":"s","evidenceRefs":["l1"]}]}');
  assert.equal(partial.observations.length, 1);
});

test("evidence IDs the model invented (i.e. not authorized records) are dropped", () => {
  const result = attachEvidence(
    [
      { title: "Uses real and fake refs", summary: "s", evidenceRefs: ["l1", "unauthorized-record-999"] },
      { title: "Only fake refs", summary: "s", evidenceRefs: ["unauthorized-record-999"] },
    ],
    records,
  );
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].evidence.map((e) => e.recordId), ["l1"]);
});

test("observations with empty titles or summaries are discarded", () => {
  assert.equal(attachEvidence([{ title: "  ", summary: "s", evidenceRefs: ["l1"] }], records).length, 0);
  assert.equal(attachEvidence([{ title: "t", summary: " ", evidenceRefs: ["l1"] }], records).length, 0);
});

test("the JSON schema is strict-mode compatible", () => {
  const check = (node) => {
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort());
      Object.values(node.properties).forEach(check);
    }
    if (node.type === "array") check(node.items);
  };
  check(INSIGHT_JSON_SCHEMA.schema);
});
