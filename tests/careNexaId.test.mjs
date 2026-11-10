import assert from "node:assert/strict";
import test from "node:test";
import { careNexaIdMatches, maskCareNexaId, normalizeCareNexaId } from "../src/lib/tenantAccess.ts";
import { requiresConfirmedId } from "../src/lib/referralRules.ts";

test("the CareNexa ID matches regardless of case, spaces or dashes", () => {
  assert.equal(careNexaIdMatches("cnx-7f2a91c3", "CNX-7F2A91C3"), true);
  assert.equal(careNexaIdMatches(" CNX 7F2A 91C3 ", "CNX-7F2A91C3"), true);
  assert.equal(normalizeCareNexaId("cnx-7f2a-91c3"), "CNX7F2A91C3");
});

test("a wrong, partial or empty ID does not match", () => {
  assert.equal(careNexaIdMatches("CNX-7F2A91C4", "CNX-7F2A91C3"), false);
  assert.equal(careNexaIdMatches("91C3", "CNX-7F2A91C3"), false);
  assert.equal(careNexaIdMatches("", "CNX-7F2A91C3"), false);
  assert.equal(careNexaIdMatches("CNX", "CNX"), false);
});

test("the masked ID shows only the last four characters", () => {
  assert.equal(maskCareNexaId("CNX-7F2A91C3"), "CNX-••••91C3");
  assert.ok(!maskCareNexaId("CNX-7F2A91C3").includes("7F2A"));
});

test("accepting and treating need a confirmed ID; paperwork steps do not", () => {
  for (const s of ["ACCEPTED", "APPOINTMENT_SCHEDULED", "ARRIVAL_CONFIRMED", "TREATMENT_IN_PROGRESS", "DISCHARGED", "COMPLETED"]) {
    assert.equal(requiresConfirmedId(s, "ROUTINE"), true, s);
  }
  for (const s of ["ACKNOWLEDGED", "UNDER_REVIEW", "MORE_INFORMATION_REQUESTED", "DECLINED", "REDIRECTED"]) {
    assert.equal(requiresConfirmedId(s, "ROUTINE"), false, s);
  }
});

test("emergencies never wait for ID confirmation", () => {
  assert.equal(requiresConfirmedId("TREATMENT_IN_PROGRESS", "EMERGENCY"), false);
  assert.equal(requiresConfirmedId("ACCEPTED", "EMERGENCY"), false);
});
