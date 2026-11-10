import assert from "node:assert/strict";
import test from "node:test";
import {
  accessGrantDisplayStatus,
  accessGrantDurationDays,
  authorizedCategories,
  resolveApprovedCategories,
  validateAccessRequest,
} from "../src/lib/tenantAccess.ts";

const now = new Date("2026-11-10T12:00:00.000Z");
const later = new Date("2026-11-17T12:00:00.000Z");
const earlier = new Date("2026-11-09T12:00:00.000Z");

const validRequest = {
  requestingHospitalId: "hospital-b",
  sourceHospitalId: "hospital-a",
  purpose: "Prior echo results for cardiology review",
  recordCategories: ["LAB_RESULTS", "DIAGNOSES"],
  authorizationEvidence: "Signed consent form CF-102",
  requesterIdentityVerified: true,
};

test("a complete, patient-authorized request is valid", () => {
  assert.equal(validateAccessRequest(validRequest), null);
});

test("a request requires in-person identity verification at the requesting hospital", () => {
  assert.ok(validateAccessRequest({ ...validRequest, requesterIdentityVerified: false }));
});

test("a request requires patient authorization evidence and a real purpose", () => {
  assert.ok(validateAccessRequest({ ...validRequest, authorizationEvidence: "  " }));
  assert.ok(validateAccessRequest({ ...validRequest, purpose: "records" }));
});

test("a hospital cannot request records from itself", () => {
  assert.ok(validateAccessRequest({ ...validRequest, sourceHospitalId: "hospital-b" }));
});

test("unknown or non-shareable categories are rejected", () => {
  assert.ok(validateAccessRequest({ ...validRequest, recordCategories: [] }));
  assert.ok(validateAccessRequest({ ...validRequest, recordCategories: ["LAB_RESULTS", "EVERYTHING"] }));
  assert.ok(validateAccessRequest({ ...validRequest, recordCategories: ["COUNTER_REFERRAL"] }));
});

test("the source hospital can release fewer categories than requested, never more", () => {
  assert.deepEqual(resolveApprovedCategories(["LAB_RESULTS", "DIAGNOSES"], ["LAB_RESULTS"]), { categories: ["LAB_RESULTS"] });
  assert.ok("error" in resolveApprovedCategories(["LAB_RESULTS"], ["LAB_RESULTS", "CLINICAL_NOTES"]));
  assert.ok("error" in resolveApprovedCategories(["LAB_RESULTS"], []));
});

test("access periods are bounded to 1-30 whole days", () => {
  assert.equal(accessGrantDurationDays(7), 7);
  for (const bad of [0, 31, 2.5, Number.NaN, -1]) assert.equal(accessGrantDurationDays(bad), null, String(bad));
});

const grant = (overrides) => ({ status: "ACTIVE", authorizedAt: earlier, expiresAt: later, revokedAt: null, recordCategories: ["LAB_RESULTS"], ...overrides });

test("display status distinguishes pending, active, declined, revoked and expired", () => {
  assert.equal(accessGrantDisplayStatus(grant({ status: "PENDING", authorizedAt: null }), now), "PENDING");
  assert.equal(accessGrantDisplayStatus(grant({}), now), "ACTIVE");
  assert.equal(accessGrantDisplayStatus(grant({ status: "REVOKED", authorizedAt: null, revokedAt: now }), now), "DECLINED");
  assert.equal(accessGrantDisplayStatus(grant({ status: "REVOKED", revokedAt: now }), now), "REVOKED");
  assert.equal(accessGrantDisplayStatus(grant({ expiresAt: earlier }), now), "EXPIRED");
});

test("a pending (unapproved) request authorizes nothing", () => {
  const categories = authorizedCategories({ receivingIdentityVerified: true, grants: [grant({ status: "PENDING", authorizedAt: null })], emergencyEvents: [], now });
  assert.equal(categories.size, 0);
});

test("categories from every valid grant are combined; revoked and expired ones are not", () => {
  const categories = authorizedCategories({
    receivingIdentityVerified: true,
    grants: [
      grant({ recordCategories: ["LAB_RESULTS"] }),
      grant({ recordCategories: ["DIAGNOSES", "VITALS"] }),
      grant({ recordCategories: ["CLINICAL_NOTES"], status: "REVOKED", revokedAt: now }),
      grant({ recordCategories: ["PRESCRIPTIONS"], expiresAt: earlier }),
    ],
    emergencyEvents: [],
    now,
  });
  assert.deepEqual([...categories].sort(), ["DIAGNOSES", "LAB_RESULTS", "VITALS"]);
});

test("without in-person verification no categories are readable, even with a valid grant", () => {
  const categories = authorizedCategories({
    receivingIdentityVerified: false,
    grants: [grant({})],
    emergencyEvents: [{ reason: "Unconscious, needs immediate surgical review", expiresAt: later, endedAt: null, recordCategories: ["VITALS"] }],
    now,
  });
  assert.equal(categories.size, 0);
});

test("an active emergency event contributes its categories; an ended one does not", () => {
  const categories = authorizedCategories({
    receivingIdentityVerified: true,
    grants: [],
    emergencyEvents: [
      { reason: "Unconscious, needs immediate surgical review", expiresAt: later, endedAt: null, recordCategories: ["VITALS"] },
      { reason: "Earlier emergency event now ended by clinician", expiresAt: later, endedAt: earlier, recordCategories: ["CLINICAL_NOTES"] },
    ],
    now,
  });
  assert.deepEqual([...categories], ["VITALS"]);
});
