import assert from "node:assert/strict";
import test from "node:test";
import { computePilotMetrics } from "../src/lib/pilotMetrics.ts";

const B = "hospital-b";
const t0 = new Date("2026-06-01T09:00:00.000Z").getTime();
const at = (minutes) => new Date(t0 + minutes * 60_000);
const ev = (status, minutes) => ({ status, createdAt: at(minutes) });

// Mirrors the two historical referrals seeded for the demo.
const completed = {
  destinationHospitalId: B,
  submittedAt: at(0),
  status: "COMPLETED",
  events: [ev("DRAFT", -20), ev("SUBMITTED", 0), ev("ACKNOWLEDGED", 42), ev("ACCEPTED", 1440), ev("ARRIVAL_CONFIRMED", 12960), ev("DISCHARGED", 13200), ev("COUNTER_REFERRAL_SUBMITTED", 14400), ev("COMPLETED", 17280)],
};
const awaitingArrival = {
  destinationHospitalId: B,
  submittedAt: at(0),
  status: "APPOINTMENT_SCHEDULED",
  // Resubmitted after more information was requested: the FIRST submission is what counts.
  events: [ev("SUBMITTED", 1440), ev("DRAFT", -20), ev("SUBMITTED", 0), ev("ACKNOWLEDGED", 185), ev("MORE_INFORMATION_REQUESTED", 320), ev("ACCEPTED", 1530), ev("APPOINTMENT_SCHEDULED", 1540)],
};

test("no referrals gives empty metrics rather than zeros", () => {
  assert.deepEqual(computePilotMetrics([], B), {
    averageAcknowledgmentMinutes: null,
    completionRate: null,
    missingInformationRate: null,
    arrivalConfirmationRate: null,
    dischargeSummaryReturnRate: null,
  });
});

test("seeded demo history produces the expected receiving-hospital metrics", () => {
  assert.deepEqual(computePilotMetrics([completed, awaitingArrival], B), {
    averageAcknowledgmentMinutes: 114, // (42 + 185) / 2, measured from the first submission
    completionRate: 50,
    missingInformationRate: 50,
    arrivalConfirmationRate: 50,
    dischargeSummaryReturnRate: 100,
  });
});

test("acknowledgment time is measured from the first submission even if events are unordered", () => {
  assert.equal(computePilotMetrics([awaitingArrival], B).averageAcknowledgmentMinutes, 185);
});

test("acknowledgment time is only measured on referrals this hospital received", () => {
  assert.equal(computePilotMetrics([completed, awaitingArrival], "hospital-a").averageAcknowledgmentMinutes, null);
  assert.equal(computePilotMetrics([completed, awaitingArrival], "hospital-a").completionRate, 50);
});

test("drafts that were never submitted do not count toward rates", () => {
  const draft = { destinationHospitalId: B, submittedAt: null, status: "DRAFT", events: [ev("DRAFT", 0)] };
  assert.equal(computePilotMetrics([completed, draft], B).completionRate, 100);
});

test("summary return rate is out of discharged referrals only", () => {
  const dischargedNoSummary = { destinationHospitalId: B, submittedAt: at(0), status: "DISCHARGED", events: [ev("SUBMITTED", 0), ev("DISCHARGED", 600)] };
  assert.equal(computePilotMetrics([completed, dischargedNoSummary, awaitingArrival], B).dischargeSummaryReturnRate, 50);
});
