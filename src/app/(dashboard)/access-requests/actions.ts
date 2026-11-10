"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { accessGrantDurationDays, resolveApprovedCategories, validateAccessRequest } from "@/lib/tenantAccess";

export type AccessRequestState = { error?: string; success?: boolean } | undefined;

function categoriesFrom(formData: FormData) {
  return [...new Set(formData.getAll("recordCategories").map(String))];
}

// Requesting hospital: patient is present and verified in person here, and has
// authorized this hospital to obtain specific categories from another hospital.
// Creates a PENDING grant, which authorizes nothing until the source releases it.
export async function requestPatientRecordsAction(_prev: AccessRequestState, formData: FormData): Promise<AccessRequestState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const patientId = String(formData.get("patientId") ?? "");
  const sourceHospitalId = String(formData.get("sourceHospitalId") ?? "");
  const purpose = String(formData.get("purpose") ?? "").trim();
  const authorizationEvidence = String(formData.get("authorizationEvidence") ?? "").trim();
  const recordCategories = categoriesFrom(formData);

  const link = await db.patientHospitalLink.findFirst({
    where: { patientId, hospitalId: session.hospitalId, verificationStatus: "VERIFIED", patient: { isDeleted: false } },
  });
  if (!link) return { error: "Patient not found in this hospital." };
  const verification = await db.patientIdentityVerification.findFirst({
    where: { identityId: link.identityId, hospitalId: session.hospitalId, patientId, status: "VERIFIED", revokedAt: null },
  });

  const invalid = validateAccessRequest({
    requestingHospitalId: session.hospitalId,
    sourceHospitalId,
    purpose,
    recordCategories,
    authorizationEvidence,
    requesterIdentityVerified: Boolean(verification),
  });
  if (invalid) return { error: invalid };

  const sourceHospital = await db.hospital.findFirst({ where: { id: sourceHospitalId, isActive: true } });
  if (!sourceHospital) return { error: "That hospital is unavailable." };

  const duplicate = await db.patientAccessGrant.findFirst({
    where: { identityId: link.identityId, sourceHospitalId, receivingHospitalId: session.hospitalId, status: "PENDING", referralId: null },
  });
  if (duplicate) return { error: `A request to ${sourceHospital.name} for this patient is already awaiting a decision.` };

  // Deliberately does not reveal whether the source hospital holds records for
  // this identity — that is itself information about the patient.
  const grant = await db.patientAccessGrant.create({
    data: {
      identityId: link.identityId,
      sourceHospitalId,
      receivingHospitalId: session.hospitalId,
      requestingStaffId: session.staffId,
      purpose,
      recordCategories,
      status: "PENDING",
      authorizationEvidence,
    },
  });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "RECORD_ACCESS_REQUESTED",
    targetType: "PatientAccessGrant",
    targetId: grant.id,
    targetLabel: sourceHospital.name,
    detail: `${recordCategories.join(", ")} · ${purpose}`,
  });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/access-requests");
  return { success: true };
}

// Source hospital: releases some or all requested categories for a bounded period.
export async function approveAccessRequestAction(_prev: AccessRequestState, formData: FormData): Promise<AccessRequestState> {
  const session = await requireSession(["ADMIN", "CLINICIAN", "RECORDS_OFFICER"]);
  const grantId = String(formData.get("grantId") ?? "");
  const releaseNote = String(formData.get("releaseNote") ?? "").trim();
  const days = accessGrantDurationDays(Number(formData.get("durationDays")));
  if (!days) return { error: "Choose an access period between 1 and 30 days." };

  const grant = await db.patientAccessGrant.findFirst({
    where: { id: grantId, sourceHospitalId: session.hospitalId, status: "PENDING", referralId: null },
  });
  if (!grant) return { error: "Request not found or already decided." };

  const resolved = resolveApprovedCategories(grant.recordCategories, categoriesFrom(formData));
  if ("error" in resolved) return { error: resolved.error };

  const localLink = await db.patientHospitalLink.findFirst({ where: { identityId: grant.identityId, hospitalId: session.hospitalId } });
  if (!localLink) return { error: "This hospital holds no record for that CareNexa identity. Decline the request instead." };

  const authorizedAt = new Date();
  await db.patientAccessGrant.update({
    where: { id: grant.id },
    data: {
      status: "ACTIVE",
      recordCategories: resolved.categories,
      authorizedAt,
      expiresAt: new Date(authorizedAt.getTime() + days * 24 * 60 * 60 * 1000),
      authorizationEvidence: `${grant.authorizationEvidence ?? ""} · Released by ${session.fullName}${releaseNote ? `: ${releaseNote}` : ""}`,
    },
  });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "RECORD_ACCESS_APPROVED",
    targetType: "PatientAccessGrant",
    targetId: grant.id,
    targetLabel: localLink.patientId,
    detail: `${resolved.categories.join(", ")} for ${days} days${releaseNote ? ` · ${releaseNote}` : ""}`,
  });
  revalidatePath("/access-requests");
  return { success: true };
}

export async function declineAccessRequestAction(_prev: AccessRequestState, formData: FormData): Promise<AccessRequestState> {
  const session = await requireSession(["ADMIN", "CLINICIAN", "RECORDS_OFFICER"]);
  const grantId = String(formData.get("grantId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Give a reason for declining." };

  const grant = await db.patientAccessGrant.findFirst({
    where: { id: grantId, sourceHospitalId: session.hospitalId, status: "PENDING", referralId: null },
  });
  if (!grant) return { error: "Request not found or already decided." };

  // Stored as REVOKED with no authorizedAt: it was never authorized.
  await db.patientAccessGrant.update({ where: { id: grant.id }, data: { status: "REVOKED", revokedAt: new Date() } });
  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "RECORD_ACCESS_DECLINED",
    targetType: "PatientAccessGrant",
    targetId: grant.id,
    detail: reason,
  });
  revalidatePath("/access-requests");
  return { success: true };
}
