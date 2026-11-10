import assert from "node:assert/strict";
import test from "node:test";
import { isClosedWithoutCare, progressState, recipientTransitions, STATUS_ACTION_LABEL, STATUS_NEEDS_NOTE } from "../src/lib/referralRules.ts";
import { hospitalAccent, switchDestination } from "../src/lib/hospitalTheme.ts";

const done = (statuses) => progressState(statuses).filter((s) => s.done).map((s) => s.label);

test("a walk-in patient can be checked in straight after acceptance", () => {
  assert.ok(recipientTransitions("ACCEPTED", "ROUTINE").includes("ARRIVAL_CONFIRMED"));
  assert.ok(recipientTransitions("ACCEPTED", "ROUTINE").includes("APPOINTMENT_SCHEDULED"));
});

test("progress tracker follows the persisted events", () => {
  assert.deepEqual(done([]), []);
  assert.deepEqual(done(["DRAFT", "SUBMITTED"]), ["Sent"]);
  assert.deepEqual(done(["DRAFT", "SUBMITTED", "ACKNOWLEDGED", "ACCEPTED", "ARRIVAL_CONFIRMED"]), ["Sent", "Received", "Accepted", "Checked in"]);
  assert.equal(done(["SUBMITTED", "ACKNOWLEDGED", "ACCEPTED", "ARRIVAL_CONFIRMED", "TREATMENT_IN_PROGRESS", "DISCHARGED", "COUNTER_REFERRAL_SUBMITTED", "COMPLETED"]).length, 8);
});

test("skipped steps count as passed (emergency fast-track to treatment)", () => {
  assert.deepEqual(done(["SUBMITTED", "TREATMENT_IN_PROGRESS"]), ["Sent", "Received", "Accepted", "Checked in", "In treatment"]);
});

test("declined or redirected referrals are reported as closed without care", () => {
  assert.equal(isClosedWithoutCare(["SUBMITTED", "DECLINED"]), true);
  assert.equal(isClosedWithoutCare(["SUBMITTED", "ACCEPTED"]), false);
});

test("every step offered to the receiving hospital has a readable button label", () => {
  for (const status of ["SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW", "ACCEPTED", "APPOINTMENT_SCHEDULED", "ARRIVAL_CONFIRMED", "TREATMENT_IN_PROGRESS", "DISCHARGED", "COUNTER_REFERRAL_SUBMITTED"]) {
    for (const next of recipientTransitions(status, "EMERGENCY")) assert.ok(STATUS_ACTION_LABEL[next], `${status} -> ${next}`);
  }
  assert.deepEqual([...STATUS_NEEDS_NOTE].sort(), ["DECLINED", "MORE_INFORMATION_REQUESTED", "REDIRECTED"]);
});

test("switching hospital keeps hospital-neutral pages and drops patient-specific ones", () => {
  assert.equal(switchDestination("/referrals/abc123"), "/referrals/abc123");
  assert.equal(switchDestination("/referrals"), "/referrals");
  assert.equal(switchDestination("/guide"), "/guide");
  assert.equal(switchDestination("/access-requests"), "/access-requests");
  assert.equal(switchDestination("/admin/audit-log"), "/admin/audit-log");
  assert.equal(switchDestination("/patients/abc123"), "/patients");
  assert.equal(switchDestination("/records/register"), "/admin");
});

test("switch destination cannot be used as an open redirect", () => {
  assert.equal(switchDestination("https://evil.example"), "/admin");
  assert.equal(switchDestination("//evil.example/referrals"), "/admin");
  assert.equal(switchDestination(""), "/admin");
  assert.equal(switchDestination(undefined), "/admin");
});

test("the two demo hospitals have distinct colours", () => {
  assert.notEqual(hospitalAccent("general-hospital"), hospitalAccent("specialist-hospital"));
});
