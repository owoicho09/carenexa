import assert from "node:assert/strict";
import test from "node:test";
import { allowedTransitions, recipientTransitions, validateEmergencySubmission } from "../src/lib/referralRules.ts";

test("routine referrals must be reviewed and accepted before treatment", () => {
  for (const status of ["SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW"]) {
    assert.equal(recipientTransitions(status, "ROUTINE").includes("TREATMENT_IN_PROGRESS"), false, status);
    assert.equal(recipientTransitions(status, "URGENT").includes("TREATMENT_IN_PROGRESS"), false, status);
  }
  assert.ok(recipientTransitions("ACCEPTED", "ROUTINE").includes("TREATMENT_IN_PROGRESS"));
});

test("emergency referrals can go straight to treatment from any intake state", () => {
  for (const status of ["SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW"]) {
    assert.ok(recipientTransitions(status, "EMERGENCY").includes("TREATMENT_IN_PROGRESS"), status);
  }
});

test("emergency fast-track does not reopen closed or later states", () => {
  assert.deepEqual(recipientTransitions("DECLINED", "EMERGENCY"), []);
  assert.deepEqual(recipientTransitions("COMPLETED", "EMERGENCY"), []);
  assert.deepEqual(recipientTransitions("DISCHARGED", "EMERGENCY"), ["COMPLETED"]);
});

test("the referring hospital can only resubmit after more information is requested", () => {
  assert.deepEqual(allowedTransitions({ isRecipient: false, status: "MORE_INFORMATION_REQUESTED", urgency: "ROUTINE" }), ["SUBMITTED"]);
  assert.deepEqual(allowedTransitions({ isRecipient: false, status: "SUBMITTED", urgency: "EMERGENCY" }), []);
  assert.equal(allowedTransitions({ isRecipient: true, status: "MORE_INFORMATION_REQUESTED", urgency: "ROUTINE" }).includes("SUBMITTED"), false);
});

const validEmergency = { status: "DRAFT", urgency: "EMERGENCY", justification: "Unconscious after RTA, GCS 7, needs neurosurgery", patientUnableToAuthorize: true };

test("a valid emergency submission is accepted", () => {
  assert.equal(validateEmergencySubmission(validEmergency), null);
});

test("emergency submission without consent is refused for non-emergency referrals", () => {
  assert.ok(validateEmergencySubmission({ ...validEmergency, urgency: "URGENT" }));
  assert.ok(validateEmergencySubmission({ ...validEmergency, urgency: "ROUTINE" }));
});

test("emergency submission requires a specific justification and an explicit attestation", () => {
  assert.ok(validateEmergencySubmission({ ...validEmergency, justification: "emergency" }));
  assert.ok(validateEmergencySubmission({ ...validEmergency, justification: "                         " }));
  assert.ok(validateEmergencySubmission({ ...validEmergency, patientUnableToAuthorize: false }));
});

test("emergency submission only applies to drafts", () => {
  assert.ok(validateEmergencySubmission({ ...validEmergency, status: "SUBMITTED" }));
});
