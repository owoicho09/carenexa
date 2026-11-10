// Deterministic, record-derived clinical flags — shown separately from AI
// output. These rules restate what is already recorded; they introduce no new
// clinical thresholds (abnormality comes from the laboratory's own reference
// range / isAbnormal flag). Thresholds beyond these require clinical review
// before being added. Pure: no database or framework imports.

export const CLINICAL_RULES_VERSION = "clinical-rules-v1";

export type RuleEvidence = { recordId: string; recordType: string; recordedAt: string; fact: string };
export type RuleFlag = { ruleId: string; title: string; detail: string; evidence: RuleEvidence[] };

type LabInput = {
  id: string;
  testName: string;
  resultType: string;
  value: number | null;
  qualitativeValue: string | null;
  unit: string;
  isAbnormal: boolean;
  enteredAt: Date;
};
type VisitInput = {
  id: string;
  openedAt: Date;
  followUpDate: Date | null;
  labResults: LabInput[];
  vitals: unknown[];
  diagnoses: unknown[];
  prescriptions: unknown[];
};
export type PatientRuleInput = {
  id: string;
  registeredAt: Date;
  allergies: string[];
  genotype: string | null;
  visits: VisitInput[];
};

function labDisplay(l: LabInput) {
  return l.resultType === "NUMERIC" ? `${l.value} ${l.unit}`.trim() : (l.qualitativeValue ?? "");
}

export function deterministicFlags(patient: PatientRuleInput, now = new Date()): RuleFlag[] {
  const flags: RuleFlag[] = [];

  if (patient.allergies.length > 0) {
    flags.push({
      ruleId: "DOCUMENTED_ALLERGY",
      title: "Documented allergies",
      detail: patient.allergies.join(", "),
      evidence: [{ recordId: patient.id, recordType: "PATIENT", recordedAt: patient.registeredAt.toISOString(), fact: `Allergies: ${patient.allergies.join(", ")}` }],
    });
  }

  if (patient.genotype === "SS" || patient.genotype === "SC") {
    flags.push({
      ruleId: "SICKLE_CELL_GENOTYPE",
      title: `Sickle cell genotype (${patient.genotype})`,
      detail: "Recorded genotype.",
      evidence: [{ recordId: patient.id, recordType: "PATIENT", recordedAt: patient.registeredAt.toISOString(), fact: `Genotype ${patient.genotype}` }],
    });
  }

  const labs = patient.visits.flatMap((v) => v.labResults).sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());
  const byTest = new Map<string, LabInput[]>();
  for (const lab of labs) byTest.set(lab.testName, [...(byTest.get(lab.testName) ?? []), lab]);

  for (const [testName, results] of byTest) {
    const latest = results[results.length - 1];
    const abnormal = results.filter((r) => r.isAbnormal);
    const toEvidence = (r: LabInput): RuleEvidence => ({ recordId: r.id, recordType: "LAB_RESULT", recordedAt: r.enteredAt.toISOString(), fact: `${testName}: ${labDisplay(r)}${r.isAbnormal ? " (outside reference range)" : ""}` });
    if (abnormal.length >= 2) {
      flags.push({
        ruleId: "REPEATED_ABNORMAL_RESULT",
        title: `${testName} outside reference range on ${abnormal.length} occasions`,
        detail: latest.isAbnormal ? "Most recent result is also outside the range." : "Most recent result is within the range.",
        evidence: abnormal.map(toEvidence),
      });
    } else if (latest.isAbnormal) {
      flags.push({
        ruleId: "ABNORMAL_LATEST_RESULT",
        title: `Latest ${testName} outside reference range`,
        detail: labDisplay(latest),
        evidence: [toEvidence(latest)],
      });
    }
  }

  const visitsByTime = patient.visits.slice().sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  for (const visit of visitsByTime) {
    if (!visit.followUpDate || visit.followUpDate > now) continue;
    const followUp = visit.followUpDate;
    const attended = visitsByTime.some((v) => v.id !== visit.id && v.openedAt >= followUp);
    if (!attended) {
      flags.push({
        ruleId: "OVERDUE_FOLLOW_UP",
        title: "Follow-up date passed with no later visit",
        detail: `Follow-up was due ${followUp.toISOString().slice(0, 10)}.`,
        evidence: [{ recordId: visit.id, recordType: "VISIT", recordedAt: visit.openedAt.toISOString(), fact: `Follow-up due ${followUp.toISOString().slice(0, 10)}` }],
      });
    }
  }

  return flags;
}

export type CoverageSource = { hospitalName: string; local: boolean; categories: string[] };

const CATEGORY_NAMES: Record<string, string> = {
  VITALS: "vitals",
  LAB_RESULTS: "laboratory results",
  DIAGNOSES: "diagnoses",
  PRESCRIPTIONS: "prescriptions",
  CLINICAL_NOTES: "clinical notes",
  VISITS: "visit history",
  DEMOGRAPHICS: "demographics",
};

// Plain-language list of what the analysis could NOT see. Never names or hints
// at hospitals whose records are not shared — that would disclose visit history.
export function describeDataGaps(input: {
  patient: PatientRuleInput;
  identityVerifiedHere: boolean;
  sources: CoverageSource[];
}): string[] {
  const gaps: string[] = [];
  const visits = input.patient.visits;
  if (visits.length === 0) gaps.push("No visits are recorded at this hospital.");
  if (!visits.some((v) => v.vitals.length)) gaps.push("No vitals are recorded at this hospital.");
  if (!visits.some((v) => v.labResults.length)) gaps.push("No laboratory results are recorded at this hospital.");
  if (!visits.some((v) => v.diagnoses.length)) gaps.push("No diagnoses are recorded at this hospital.");
  if (!visits.some((v) => v.prescriptions.length)) gaps.push("No prescriptions are recorded at this hospital.");

  if (!input.identityVerifiedHere) {
    gaps.push("Identity is not verified in person here, so no records from other hospitals can be included.");
  } else {
    for (const source of input.sources.filter((s) => !s.local)) {
      const missing = Object.keys(CATEGORY_NAMES).filter((c) => !source.categories.includes(c));
      if (missing.length) gaps.push(`From ${source.hospitalName}: ${missing.map((c) => CATEGORY_NAMES[c]).join(", ")} not authorized.`);
    }
  }
  gaps.push("Records held elsewhere are included only when the patient has authorized sharing with this hospital.");
  return gaps;
}
