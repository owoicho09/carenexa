export type HospitalPrincipal = {
  hospitalId: string | null;
  isPlatformAdmin: boolean;
};

export type PatientAccessGrantState = {
  status: string;
  authorizedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  recordCategories: string[];
};

export type EmergencyAccessState = {
  reason: string;
  expiresAt: Date;
  endedAt: Date | null;
  recordCategories: string[];
};

export function canAccessHospital(principal: HospitalPrincipal, hospitalId: string, hospitalIsActive: boolean) {
  return hospitalIsActive && (principal.isPlatformAdmin || principal.hospitalId === hospitalId);
}

export function hasActivePatientGrant(
  grant: PatientAccessGrantState | null | undefined,
  now = new Date(),
  category?: string,
) {
  return Boolean(
    grant &&
      grant.status === "ACTIVE" &&
      grant.authorizedAt &&
      !grant.revokedAt &&
      (!grant.expiresAt || grant.expiresAt > now) &&
      (!category || grant.recordCategories.includes(category)),
  );
}

export function hasActiveEmergencyAccess(
  access: EmergencyAccessState | null | undefined,
  now = new Date(),
  category?: string,
) {
  return Boolean(
    access &&
      access.reason.trim().length >= 20 &&
      !access.endedAt &&
      access.expiresAt > now &&
      (!category || access.recordCategories.includes(category)),
  );
}

export function canReadSharedPatientRecords(input: {
  receivingIdentityVerified: boolean;
  grant?: PatientAccessGrantState | null;
  emergencyAccess?: EmergencyAccessState | null;
  now?: Date;
}) {
  return input.receivingIdentityVerified && (
    hasActivePatientGrant(input.grant, input.now) ||
    hasActiveEmergencyAccess(input.emergencyAccess, input.now)
  );
}

// ---------------------------------------------------------------------------
// Independent record requests (not tied to a referral).
// ---------------------------------------------------------------------------

export const SHAREABLE_CATEGORIES = ["DEMOGRAPHICS", "VISITS", "VITALS", "LAB_RESULTS", "DIAGNOSES", "PRESCRIPTIONS", "CLINICAL_NOTES"] as const;
export const CATEGORY_LABEL: Record<string, string> = {
  DEMOGRAPHICS: "Demographics and allergies",
  VISITS: "Visit history",
  VITALS: "Vitals",
  LAB_RESULTS: "Laboratory results",
  DIAGNOSES: "Diagnoses and plans",
  PRESCRIPTIONS: "Prescriptions",
  CLINICAL_NOTES: "Clinical notes",
  COUNTER_REFERRAL: "Counter-referral summary",
};
export const ACCESS_GRANT_MIN_DAYS = 1;
export const ACCESS_GRANT_MAX_DAYS = 30;

export function validateAccessRequest(input: {
  requestingHospitalId: string;
  sourceHospitalId: string;
  purpose: string;
  recordCategories: string[];
  authorizationEvidence: string;
  requesterIdentityVerified: boolean;
}): string | null {
  if (!input.requesterIdentityVerified) return "Verify the patient's identity in person at this hospital before requesting records.";
  if (!input.sourceHospitalId || input.sourceHospitalId === input.requestingHospitalId) return "Choose a different hospital to request records from.";
  if (input.purpose.trim().length < 10) return "Describe the clinical purpose of the request.";
  if (!input.authorizationEvidence.trim()) return "Record the patient's authorization evidence.";
  const valid = input.recordCategories.filter((category) => (SHAREABLE_CATEGORIES as readonly string[]).includes(category));
  if (valid.length === 0 || valid.length !== input.recordCategories.length) return "Select at least one valid record category.";
  return null;
}

// The source hospital may release fewer categories than requested, never more.
export function resolveApprovedCategories(requested: string[], approved: string[]): { categories: string[] } | { error: string } {
  const unique = [...new Set(approved)];
  const outside = unique.filter((category) => !requested.includes(category));
  if (outside.length) return { error: "Only categories the patient authorized in the request can be released." };
  if (unique.length === 0) return { error: "Select at least one category to release, or decline the request." };
  return { categories: unique };
}

export function accessGrantDurationDays(raw: number): number | null {
  if (!Number.isInteger(raw) || raw < ACCESS_GRANT_MIN_DAYS || raw > ACCESS_GRANT_MAX_DAYS) return null;
  return raw;
}

export type AccessGrantDisplayStatus = "PENDING" | "ACTIVE" | "DECLINED" | "REVOKED" | "EXPIRED";

// A declined request is stored as REVOKED with no authorizedAt — it was never
// authorized. Expiry is evaluated at read time, so it needs no background job.
export function accessGrantDisplayStatus(grant: PatientAccessGrantState, now = new Date()): AccessGrantDisplayStatus {
  if (grant.status === "PENDING") return "PENDING";
  if (grant.status === "REVOKED") return grant.authorizedAt ? "REVOKED" : "DECLINED";
  if (grant.status === "EXPIRED" || (grant.expiresAt && grant.expiresAt <= now)) return "EXPIRED";
  return hasActivePatientGrant(grant, now) ? "ACTIVE" : "EXPIRED";
}

// Union of categories the receiving hospital may read from one source hospital,
// across every currently valid grant and emergency access event. Requires
// in-person identity verification at the receiving hospital regardless.
export function authorizedCategories(input: {
  receivingIdentityVerified: boolean;
  grants: PatientAccessGrantState[];
  emergencyEvents: EmergencyAccessState[];
  now?: Date;
}): Set<string> {
  const now = input.now ?? new Date();
  const categories = new Set<string>();
  if (!input.receivingIdentityVerified) return categories;
  for (const grant of input.grants) {
    if (hasActivePatientGrant(grant, now)) grant.recordCategories.forEach((c) => categories.add(c));
  }
  for (const event of input.emergencyEvents) {
    if (hasActiveEmergencyAccess(event, now)) event.recordCategories.forEach((c) => categories.add(c));
  }
  return categories;
}

// ---------------------------------------------------------------------------
// CareNexa ID confirmation at the receiving hospital.
// ---------------------------------------------------------------------------

// Tolerant of case, spaces and missing dashes as typed from a patient's card.
export function normalizeCareNexaId(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function careNexaIdMatches(entered: string, actual: string) {
  const a = normalizeCareNexaId(entered);
  return a.length >= 6 && a === normalizeCareNexaId(actual);
}

// Shown to a receiving hospital before it has confirmed the ID, so staff can't
// simply copy it off the screen: e.g. CNX-••••91C3.
export function maskCareNexaId(value: string) {
  const tail = value.replace(/[^A-Za-z0-9]/g, "").slice(-4);
  return `CNX-••••${tail}`;
}
