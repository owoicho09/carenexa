// Pure referral lifecycle rules, shared by the server actions and the referral
// page so what the UI offers can never drift from what the server accepts.
// No database or framework imports — unit-tested directly in tests/.

export type ReferralStatusValue =
  | "DRAFT"
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "REDIRECTED"
  | "APPOINTMENT_SCHEDULED"
  | "ARRIVAL_CONFIRMED"
  | "TREATMENT_IN_PROGRESS"
  | "DISCHARGED"
  | "COUNTER_REFERRAL_SUBMITTED"
  | "COMPLETED";

export type UrgencyValue = "ROUTINE" | "URGENT" | "EMERGENCY";

const RECIPIENT_TRANSITIONS: Partial<Record<ReferralStatusValue, ReferralStatusValue[]>> = {
  SUBMITTED: ["ACKNOWLEDGED", "UNDER_REVIEW", "MORE_INFORMATION_REQUESTED", "ACCEPTED", "DECLINED", "REDIRECTED"],
  ACKNOWLEDGED: ["UNDER_REVIEW", "MORE_INFORMATION_REQUESTED", "ACCEPTED", "DECLINED", "REDIRECTED"],
  UNDER_REVIEW: ["MORE_INFORMATION_REQUESTED", "ACCEPTED", "DECLINED", "REDIRECTED"],
  ACCEPTED: ["APPOINTMENT_SCHEDULED", "ARRIVAL_CONFIRMED", "TREATMENT_IN_PROGRESS"],
  APPOINTMENT_SCHEDULED: ["ARRIVAL_CONFIRMED", "TREATMENT_IN_PROGRESS"],
  ARRIVAL_CONFIRMED: ["TREATMENT_IN_PROGRESS"],
  TREATMENT_IN_PROGRESS: ["DISCHARGED"],
  DISCHARGED: ["COMPLETED"],
  COUNTER_REFERRAL_SUBMITTED: ["COMPLETED"],
};

// Emergency stabilization must not wait on review, acceptance or scheduling:
// an emergency referral can move straight to treatment from any intake state.
const EMERGENCY_FAST_TRACK_FROM: ReferralStatusValue[] = ["SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW"];

export function recipientTransitions(status: ReferralStatusValue, urgency: UrgencyValue): ReferralStatusValue[] {
  const base = RECIPIENT_TRANSITIONS[status] ?? [];
  if (urgency === "EMERGENCY" && EMERGENCY_FAST_TRACK_FROM.includes(status) && !base.includes("TREATMENT_IN_PROGRESS")) {
    return [...base, "TREATMENT_IN_PROGRESS"];
  }
  return base;
}

export function sourceTransitions(status: ReferralStatusValue): ReferralStatusValue[] {
  return status === "MORE_INFORMATION_REQUESTED" ? ["SUBMITTED"] : [];
}

export function allowedTransitions(input: { isRecipient: boolean; status: ReferralStatusValue; urgency: UrgencyValue }) {
  return input.isRecipient ? recipientTransitions(input.status, input.urgency) : sourceTransitions(input.status);
}

export const MIN_EMERGENCY_JUSTIFICATION = 20;

// An emergency submission skips patient authorization, so it is only valid for
// an EMERGENCY referral, with a specific written justification and an explicit
// attestation that the patient cannot authorize sharing right now.
export function validateEmergencySubmission(input: {
  status: ReferralStatusValue;
  urgency: UrgencyValue;
  justification: string;
  patientUnableToAuthorize: boolean;
}): string | null {
  if (input.status !== "DRAFT") return "Only a referral draft can be submitted.";
  if (input.urgency !== "EMERGENCY") return "Only an emergency referral can be submitted without patient authorization.";
  if (input.justification.trim().length < MIN_EMERGENCY_JUSTIFICATION) return "Describe the emergency specifically (at least 20 characters).";
  if (!input.patientUnableToAuthorize) return "Confirm that the patient cannot authorize sharing at this time.";
  return null;
}

// Human-readable step names and the progress tracker shown to BOTH hospitals.
export const STATUS_ACTION_LABEL: Partial<Record<ReferralStatusValue, string>> = {
  SUBMITTED: "Resubmit with more information",
  ACKNOWLEDGED: "Acknowledge receipt",
  UNDER_REVIEW: "Start clinical review",
  MORE_INFORMATION_REQUESTED: "Request more information",
  ACCEPTED: "Accept referral",
  DECLINED: "Decline referral",
  REDIRECTED: "Redirect elsewhere",
  APPOINTMENT_SCHEDULED: "Schedule appointment",
  ARRIVAL_CONFIRMED: "Confirm patient checked in",
  TREATMENT_IN_PROGRESS: "Start treatment",
  DISCHARGED: "Discharge patient",
  COMPLETED: "Mark referral completed",
};

// Steps that need a written note (the other hospital should know why).
export const STATUS_NEEDS_NOTE: ReferralStatusValue[] = ["MORE_INFORMATION_REQUESTED", "DECLINED", "REDIRECTED"];

export const PROGRESS_STEPS: { label: string; reachedBy: ReferralStatusValue[] }[] = [
  { label: "Sent", reachedBy: ["SUBMITTED"] },
  { label: "Received", reachedBy: ["ACKNOWLEDGED", "UNDER_REVIEW"] },
  { label: "Accepted", reachedBy: ["ACCEPTED"] },
  { label: "Checked in", reachedBy: ["ARRIVAL_CONFIRMED"] },
  { label: "In treatment", reachedBy: ["TREATMENT_IN_PROGRESS"] },
  { label: "Discharged", reachedBy: ["DISCHARGED"] },
  { label: "Report returned", reachedBy: ["COUNTER_REFERRAL_SUBMITTED"] },
  { label: "Completed", reachedBy: ["COMPLETED"] },
];

// Which tracker steps are done, from the persisted event history. A step counts
// as done if it, or any later step, has happened (e.g. emergency fast-track
// skips "Accepted" but still passes it).
export function progressState(eventStatuses: string[]) {
  const reached = PROGRESS_STEPS.map((step) => step.reachedBy.some((s) => eventStatuses.includes(s)));
  const lastReached = reached.lastIndexOf(true);
  return PROGRESS_STEPS.map((step, i) => ({ label: step.label, done: i <= lastReached && lastReached >= 0 }));
}

export function isClosedWithoutCare(eventStatuses: string[]) {
  return eventStatuses.includes("DECLINED") || eventStatuses.includes("REDIRECTED");
}
