// Database integration tests for cross-hospital access (blueprint section 10).
//
// SAFETY: runs only when TEST_DATABASE_URL is set, refuses to run if it equals
// DATABASE_URL, creates its own uniquely-named hospitals, and deletes only the
// rows it created. Point it at a dedicated, migrated test database:
//
//   DATABASE_URL=<test-url> npx prisma migrate deploy
//   TEST_DATABASE_URL=<test-url> npm run test:integration
//
// OpenAI is stubbed (global fetch) — no network calls or API costs.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import "dotenv/config";

const TEST_URL = process.env.TEST_DATABASE_URL;
const skip = !TEST_URL
  ? "TEST_DATABASE_URL not set"
  : TEST_URL === process.env.DATABASE_URL
    ? "TEST_DATABASE_URL must differ from DATABASE_URL — refusing to touch the main database"
    : false;

if (!skip) {
  process.env.DATABASE_URL = TEST_URL;
  process.env.OPENAI_API_KEY = "test-key-not-used";
}

type Db = typeof import("../../src/lib/db").db;
type InsightsModule = typeof import("../../src/lib/ai/clinicalInsights");

const run = `it${Date.now().toString(36)}`;
const DAY = 24 * 60 * 60 * 1000;

describe("cross-hospital access", { skip }, () => {
  let db: Db;
  let insights: InsightsModule;
  const ids = {
    hospitalA: "", hospitalB: "", staffA: "", staffB: "", identity: "",
    patientA: "", patientB: "", visitA: "", labA: "", noteA: "",
  };

  async function grant(overrides: Record<string, unknown> = {}) {
    return db.patientAccessGrant.create({
      data: {
        identityId: ids.identity,
        sourceHospitalId: ids.hospitalA,
        receivingHospitalId: ids.hospitalB,
        requestingStaffId: ids.staffB,
        purpose: "Integration test",
        recordCategories: ["LAB_RESULTS"],
        status: "ACTIVE",
        authorizationEvidence: "test consent",
        authorizedAt: new Date(),
        expiresAt: new Date(Date.now() + DAY),
        ...overrides,
      },
    });
  }
  const clearGrants = () => db.patientAccessGrant.deleteMany({ where: { identityId: ids.identity } });
  const clearEmergency = () => db.emergencyAccessEvent.deleteMany({ where: { identityId: ids.identity } });
  const sharedFor = (patientId: string, hospitalId: string, actorId: string) => insights.loadSharedRecordsForPatient(patientId, hospitalId, actorId);
  const recordTypes = (records: { recordType: string }[]) => [...new Set(records.map((r) => r.recordType))].sort();

  async function verifyAtB() {
    await db.patientHospitalLink.updateMany({ where: { patientId: ids.patientB, hospitalId: ids.hospitalB }, data: { verificationStatus: "VERIFIED" } });
    await db.patientIdentityVerification.create({
      data: { identityId: ids.identity, hospitalId: ids.hospitalB, patientId: ids.patientB, verifiedById: ids.staffB, status: "VERIFIED", method: "IN_PERSON", evidenceReference: "test" },
    });
  }
  const unverifyAtB = () => db.patientIdentityVerification.deleteMany({ where: { patientId: ids.patientB } });

  before(async () => {
    db = (await import("../../src/lib/db")).db;
    insights = await import("../../src/lib/ai/clinicalInsights");

    const [hospitalA, hospitalB] = await Promise.all([
      db.hospital.create({ data: { name: `Test General ${run}`, slug: `test-a-${run}` } }),
      db.hospital.create({ data: { name: `Test Specialist ${run}`, slug: `test-b-${run}` } }),
    ]);
    ids.hospitalA = hospitalA.id;
    ids.hospitalB = hospitalB.id;

    const staff = (hospitalId: string, tag: string) => db.staffMember.create({
      data: { fullName: `Test ${tag}`, email: `${tag}-${run}@test.invalid`, passwordHash: "x", role: "CLINICIAN", jobTitle: "Test", hospitalId },
    });
    ids.staffA = (await staff(ids.hospitalA, "a")).id;
    ids.staffB = (await staff(ids.hospitalB, "b")).id;

    const identity = await db.careNexaIdentity.create({ data: { universalPatientNumber: `CNX-TEST-${run}`.toUpperCase() } });
    ids.identity = identity.id;

    const patient = async (hospitalId: string, tag: string) => {
      const cardType = await db.cardType.create({ data: { hospitalId, name: `Test ${tag}`, seriesCode: `T${tag}`, description: "test" } });
      return db.patient.create({
        data: {
          hospitalId, hospitalNumber: `T${tag}/${run}`, cardTypeId: cardType.id, fullName: "Test Patient",
          dateOfBirth: new Date("1980-01-01"), sex: "FEMALE", phone: "0", address: "x",
          nextOfKinName: "x", nextOfKinPhone: "0", nextOfKinRelation: "x",
        },
      });
    };
    ids.patientA = (await patient(ids.hospitalA, "A")).id;
    ids.patientB = (await patient(ids.hospitalB, "B")).id;

    await db.patientHospitalLink.createMany({
      data: [
        { identityId: ids.identity, hospitalId: ids.hospitalA, patientId: ids.patientA, verificationStatus: "VERIFIED" },
        { identityId: ids.identity, hospitalId: ids.hospitalB, patientId: ids.patientB, verificationStatus: "PENDING" },
      ],
    });

    const visit = await db.visit.create({ data: { hospitalId: ids.hospitalA, patientId: ids.patientA, presentingComplaint: "Test complaint" } });
    ids.visitA = visit.id;
    ids.labA = (await db.labResult.create({
      data: { visitId: visit.id, enteredById: ids.staffA, testName: "Glucose", value: 180, unit: "mg/dL", referenceLow: 70, referenceHigh: 140, isAbnormal: true },
    })).id;
    ids.noteA = (await db.clinicalNote.create({ data: { visitId: visit.id, authorId: ids.staffA, content: "Confidential note at A" } })).id;
  });

  after(async () => {
    if (!db || !ids.hospitalA) return;
    const hospitals = [ids.hospitalA, ids.hospitalB].filter(Boolean);
    await db.clinicalInsight.deleteMany({ where: { hospitalId: { in: hospitals } } });
    await db.aiArtifact.deleteMany({ where: { hospitalId: { in: hospitals } } });
    await db.auditLog.deleteMany({ where: { hospitalId: { in: hospitals } } });
    await clearEmergency();
    await clearGrants();
    await db.patientIdentityVerification.deleteMany({ where: { identityId: ids.identity } });
    await db.patientHospitalLink.deleteMany({ where: { identityId: ids.identity } });
    await db.labResult.deleteMany({ where: { visit: { hospitalId: { in: hospitals } } } });
    await db.clinicalNote.deleteMany({ where: { visit: { hospitalId: { in: hospitals } } } });
    await db.diagnosis.deleteMany({ where: { visit: { hospitalId: { in: hospitals } } } });
    await db.prescription.deleteMany({ where: { visit: { hospitalId: { in: hospitals } } } });
    await db.visit.deleteMany({ where: { hospitalId: { in: hospitals } } });
    await db.patient.deleteMany({ where: { hospitalId: { in: hospitals } } });
    await db.careNexaIdentity.deleteMany({ where: { id: ids.identity } });
    await db.cardType.deleteMany({ where: { hospitalId: { in: hospitals } } });
    await db.staffMember.deleteMany({ where: { hospitalId: { in: hospitals } } });
    await db.hospital.deleteMany({ where: { id: { in: hospitals } } });
    await db.$disconnect();
  });

  test("Hospital B cannot load Hospital A's patient by ID", async () => {
    const result = await sharedFor(ids.patientA, ids.hospitalB, ids.staffB);
    assert.equal(result.records.length, 0);
    assert.equal(await db.patient.findFirst({ where: { id: ids.patientA, hospitalId: ids.hospitalB } }), null);
  });

  test("Hospital A cannot load Hospital B's patient by ID", async () => {
    const result = await sharedFor(ids.patientB, ids.hospitalA, ids.staffA);
    assert.equal(result.records.length, 0);
  });

  test("a linked universal identity alone grants no access", async () => {
    await verifyAtB();
    try {
      const result = await sharedFor(ids.patientB, ids.hospitalB, ids.staffB);
      assert.equal(result.records.length, 0);
    } finally {
      await unverifyAtB();
    }
  });

  test("a pending (unapproved) grant is rejected", async () => {
    await verifyAtB();
    await grant({ status: "PENDING", authorizedAt: null });
    try {
      assert.equal((await sharedFor(ids.patientB, ids.hospitalB, ids.staffB)).records.length, 0);
    } finally {
      await clearGrants();
      await unverifyAtB();
    }
  });

  test("an active grant without in-person verification at B is rejected (checks are separate)", async () => {
    await grant();
    try {
      assert.equal((await sharedFor(ids.patientB, ids.hospitalB, ids.staffB)).records.length, 0);
    } finally {
      await clearGrants();
    }
  });

  test("verification plus an active grant discloses only the authorized categories", async () => {
    await verifyAtB();
    await grant({ recordCategories: ["LAB_RESULTS"] });
    try {
      const result = await sharedFor(ids.patientB, ids.hospitalB, ids.staffB);
      assert.deepEqual(recordTypes(result.records), ["LAB_RESULT"]);
      assert.ok(!result.records.some((r) => r.recordId === ids.noteA), "clinical note must not be disclosed");
      const audit = await db.auditLog.findFirst({ where: { hospitalId: ids.hospitalB, action: "SHARED_RECORDS_VIEWED", actorId: ids.staffB } });
      assert.ok(audit, "shared-record view must be audited");
    } finally {
      await clearGrants();
      await unverifyAtB();
    }
  });

  test("revoked and expired grants no longer authorize access", async () => {
    await verifyAtB();
    try {
      await grant({ status: "REVOKED", revokedAt: new Date() });
      assert.equal((await sharedFor(ids.patientB, ids.hospitalB, ids.staffB)).records.length, 0, "revoked");
      await clearGrants();
      await grant({ expiresAt: new Date(Date.now() - 1000) });
      assert.equal((await sharedFor(ids.patientB, ids.hospitalB, ids.staffB)).records.length, 0, "expired");
    } finally {
      await clearGrants();
      await unverifyAtB();
    }
  });

  test("emergency access is time-limited and ends when ended", async () => {
    await verifyAtB();
    const event = await db.emergencyAccessEvent.create({
      data: {
        identityId: ids.identity, sourceHospitalId: ids.hospitalA, accessingHospitalId: ids.hospitalB, grantedById: ids.staffB,
        reason: "Unconscious on arrival, needs immediate review", recordCategories: ["LAB_RESULTS"], expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    try {
      assert.deepEqual(recordTypes((await sharedFor(ids.patientB, ids.hospitalB, ids.staffB)).records), ["LAB_RESULT"]);
      await db.emergencyAccessEvent.update({ where: { id: event.id }, data: { endedAt: new Date() } });
      assert.equal((await sharedFor(ids.patientB, ids.hospitalB, ids.staffB)).records.length, 0);
    } finally {
      await clearEmergency();
      await unverifyAtB();
    }
  });

  test("AI cannot use unauthorized records and its output is never a confirmed clinical action", async () => {
    await verifyAtB();
    await grant({ recordCategories: ["LAB_RESULTS"] });
    const realFetch = globalThis.fetch;
    let promptSent = "";
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      promptSent = String(init?.body ?? "");
      const content = JSON.stringify({
        observations: [
          { title: "Elevated glucose", summary: "May warrant review.", evidenceRefs: [ids.labA] },
          { title: "Invented from unshared note", summary: "Should be dropped.", evidenceRefs: [ids.noteA] },
        ],
        limitations: [],
      });
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
    }) as typeof fetch;

    const counts = async () => Promise.all([
      db.diagnosis.count({ where: { visit: { patientId: { in: [ids.patientA, ids.patientB] } } } }),
      db.prescription.count({ where: { visit: { patientId: { in: [ids.patientA, ids.patientB] } } } }),
      db.clinicalNote.count({ where: { visit: { patientId: { in: [ids.patientA, ids.patientB] } } } }),
    ]);
    const before = await counts();
    try {
      const result = await insights.generateClinicalInsights(ids.patientB, ids.hospitalB, ids.staffB, "CLINICAL_INSIGHT");
      assert.equal(result.error, null);

      assert.ok(promptSent.includes(ids.labA), "authorized lab result is sent to the model");
      assert.ok(!promptSent.includes(ids.noteA) && !promptSent.includes("Confidential note at A"), "unauthorized note is never sent");
      assert.ok(promptSent.includes('"json_schema"'), "structured output is requested");

      const stored = await db.clinicalInsight.findMany({ where: { patientId: ids.patientB, hospitalId: ids.hospitalB } });
      assert.equal(stored.length, 1, "observation citing an unauthorized record is dropped");
      assert.equal(stored[0].requiresReview, true);
      assert.equal(stored[0].provider, "OPENAI");
      assert.equal(stored[0].promptVersion, "clinical-insights-v2");

      assert.deepEqual(await counts(), before, "no diagnosis, prescription or note is created by AI");
      assert.ok(await db.auditLog.findFirst({ where: { hospitalId: ids.hospitalB, action: "AI_CROSS_HOSPITAL_RECORDS_ACCESSED" } }));
    } finally {
      globalThis.fetch = realFetch;
      await clearGrants();
      await unverifyAtB();
    }
  });
});
