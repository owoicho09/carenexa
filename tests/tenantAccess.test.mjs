import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessHospital,
  canReadSharedPatientRecords,
  hasActiveEmergencyAccess,
  hasActivePatientGrant,
} from "../src/lib/tenantAccess.ts";

const now = new Date("2026-11-09T12:00:00.000Z");

const activeGrant = {
  status: "ACTIVE",
  authorizedAt: new Date("2026-11-09T10:00:00.000Z"),
  expiresAt: new Date("2026-11-10T10:00:00.000Z"),
  revokedAt: null,
  recordCategories: ["VITALS", "LAB_RESULTS"],
};

test("hospital staff cannot switch to another hospital", () => {
  assert.equal(canAccessHospital({ hospitalId: "hospital-a", isPlatformAdmin: false }, "hospital-b", true), false);
  assert.equal(canAccessHospital({ hospitalId: "hospital-a", isPlatformAdmin: false }, "hospital-a", true), true);
});

test("platform administrators may select active hospitals only", () => {
  const platformAdmin = { hospitalId: null, isPlatformAdmin: true };
  assert.equal(canAccessHospital(platformAdmin, "hospital-b", true), true);
  assert.equal(canAccessHospital(platformAdmin, "hospital-b", false), false);
});

test("a universal patient number alone never grants cross-hospital record access", () => {
  assert.equal(canReadSharedPatientRecords({ receivingIdentityVerified: false }), false);
  assert.equal(canReadSharedPatientRecords({ receivingIdentityVerified: true }), false);
});

test("an active grant is limited to its authorized categories", () => {
  assert.equal(hasActivePatientGrant(activeGrant, now, "VITALS"), true);
  assert.equal(hasActivePatientGrant(activeGrant, now, "CLINICAL_NOTES"), false);
});

test("revoked or expired grants do not authorize access", () => {
  assert.equal(hasActivePatientGrant({ ...activeGrant, revokedAt: now }, now), false);
  assert.equal(hasActivePatientGrant({ ...activeGrant, expiresAt: now }, now), false);
  assert.equal(canReadSharedPatientRecords({ receivingIdentityVerified: true, grant: { ...activeGrant, revokedAt: now }, now }), false);
});

test("emergency access is separate, reasoned, and expires", () => {
  const emergencyAccess = {
    reason: "Immediate emergency stabilization is required before routine review.",
    expiresAt: new Date("2026-11-09T13:00:00.000Z"),
    endedAt: null,
    recordCategories: ["VITALS"],
  };
  assert.equal(hasActiveEmergencyAccess(emergencyAccess, now, "VITALS"), true);
  assert.equal(hasActiveEmergencyAccess(emergencyAccess, now, "CLINICAL_NOTES"), false);
  assert.equal(canReadSharedPatientRecords({ receivingIdentityVerified: true, emergencyAccess, now }), true);
  assert.equal(canReadSharedPatientRecords({ receivingIdentityVerified: false, emergencyAccess, now }), false);
  assert.equal(hasActiveEmergencyAccess({ ...emergencyAccess, endedAt: now }, now), false);
  assert.equal(hasActiveEmergencyAccess({ ...emergencyAccess, expiresAt: now }, now), false);
});
