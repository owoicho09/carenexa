// CareNexa Connect pilot indicators, computed only from persisted referral
// events — never from manually entered figures. Pure, so it is unit-tested.

export type MetricReferral = {
  destinationHospitalId: string;
  submittedAt: Date | null;
  status: string;
  events: { status: string; createdAt: Date }[];
};

export type PilotMetrics = {
  averageAcknowledgmentMinutes: number | null;
  completionRate: number | null;
  missingInformationRate: number | null;
  arrivalConfirmationRate: number | null;
  dischargeSummaryReturnRate: number | null;
};

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);
const hasEvent = (r: MetricReferral, status: string) => r.events.some((e) => e.status === status);
const firstEvent = (r: MetricReferral, status: string) =>
  r.events
    .filter((e) => e.status === status)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]?.createdAt;

export function computePilotMetrics(referrals: MetricReferral[], hospitalId: string): PilotMetrics {
  const submitted = referrals.filter((r) => r.submittedAt);

  // Acknowledgment time is the receiving hospital's responsiveness, so it is
  // measured only on referrals this hospital received.
  const acknowledgedMinutes = referrals
    .filter((r) => r.destinationHospitalId === hospitalId)
    .flatMap((r) => {
      const submittedAt = firstEvent(r, "SUBMITTED");
      const acknowledgedAt = firstEvent(r, "ACKNOWLEDGED");
      return submittedAt && acknowledgedAt ? [(acknowledgedAt.getTime() - submittedAt.getTime()) / 60000] : [];
    });

  const discharged = referrals.filter((r) => hasEvent(r, "DISCHARGED")).length;

  return {
    averageAcknowledgmentMinutes: acknowledgedMinutes.length
      ? Math.round(acknowledgedMinutes.reduce((sum, value) => sum + value, 0) / acknowledgedMinutes.length)
      : null,
    completionRate: pct(referrals.filter((r) => r.status === "COMPLETED").length, submitted.length),
    missingInformationRate: pct(referrals.filter((r) => hasEvent(r, "MORE_INFORMATION_REQUESTED")).length, submitted.length),
    arrivalConfirmationRate: pct(referrals.filter((r) => hasEvent(r, "ARRIVAL_CONFIRMED")).length, submitted.length),
    dischargeSummaryReturnRate: pct(referrals.filter((r) => hasEvent(r, "COUNTER_REFERRAL_SUBMITTED")).length, discharged),
  };
}
