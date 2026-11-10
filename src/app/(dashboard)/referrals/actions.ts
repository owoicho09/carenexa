"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ReferralStatus, RequestUrgency } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { allowedTransitions, requiresConfirmedId, STATUS_NEEDS_NOTE, validateEmergencySubmission } from "@/lib/referralRules";
import { careNexaIdMatches } from "@/lib/tenantAccess";
import { issueHospitalNumber } from "@/lib/hospitalNumber";

const SHARED_CATEGORIES = ["DEMOGRAPHICS", "VISITS", "VITALS", "LAB_RESULTS", "DIAGNOSES", "PRESCRIPTIONS", "CLINICAL_NOTES"];

export type ReferralActionState = { error?: string; success?: boolean } | undefined;

// Copies only the categories the patient authorized into the referral, so the
// receiving hospital sees a snapshot limited to what was consented to.
async function buildAuthorizedSnapshot(
  referral: { sourceVisitId: string | null; patientId: string },
  hospitalId: string,
  recordCategories: string[],
): Promise<Prisma.InputJsonObject | null> {
  const visit = referral.sourceVisitId
    ? await db.visit.findFirst({
        where: { id: referral.sourceVisitId, hospitalId, patientId: referral.patientId },
        include: { patient: true, vitals: true, labResults: true, diagnoses: true, prescriptions: true, notes: true },
      })
    : null;
  const patient = await db.patient.findFirst({ where: { id: referral.patientId, hospitalId } });
  if (!patient) return null;

  const clinicalInformation: Record<string, unknown> = {};
  if (recordCategories.includes("DEMOGRAPHICS")) {
    clinicalInformation.patient = {
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth.toISOString(),
      sex: patient.sex,
      hospitalNumber: patient.hospitalNumber,
      allergies: patient.allergies,
      bloodGroup: patient.bloodGroup,
      genotype: patient.genotype,
      phone: patient.phone,
      address: patient.address,
      nextOfKinName: patient.nextOfKinName,
      nextOfKinPhone: patient.nextOfKinPhone,
      nextOfKinRelation: patient.nextOfKinRelation,
    };
  }
  if (visit && recordCategories.includes("VISITS")) {
    clinicalInformation.visit = {
      id: visit.id,
      openedAt: visit.openedAt.toISOString(),
      presentingComplaint: visit.presentingComplaint,
      followUpDate: visit.followUpDate?.toISOString() ?? null,
    };
  }
  if (visit && recordCategories.includes("VITALS")) clinicalInformation.vitals = visit.vitals;
  if (visit && recordCategories.includes("LAB_RESULTS")) clinicalInformation.labResults = visit.labResults;
  if (visit && recordCategories.includes("DIAGNOSES")) clinicalInformation.diagnoses = visit.diagnoses;
  if (visit && recordCategories.includes("PRESCRIPTIONS")) clinicalInformation.prescriptions = visit.prescriptions;
  if (visit && recordCategories.includes("CLINICAL_NOTES")) clinicalInformation.notes = visit.notes;
  return JSON.parse(JSON.stringify(clinicalInformation));
}

export async function createReferralDraftAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const patientId = String(formData.get("patientId") ?? "");
  const visitId = String(formData.get("visitId") ?? "") || null;
  // The referring hospital chooses only the hospital; the receiving hospital
  // routes the referral internally based on the requested service.
  const destinationHospitalId = String(formData.get("destinationHospitalId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const requestedService = String(formData.get("requestedService") ?? "").trim();
  const urgency = String(formData.get("urgency") ?? "ROUTINE") as RequestUrgency;

  if (!patientId || !destinationHospitalId || !reason || !requestedService) return { error: "Complete the destination, reason, and requested service." };
  if (!["ROUTINE", "URGENT", "EMERGENCY"].includes(urgency)) return { error: "Choose a valid urgency." };
  if (destinationHospitalId === session.hospitalId) return { error: "Choose a different hospital for an inter-hospital referral." };

  const [patient, destinationHospital, identityLink] = await Promise.all([
    db.patient.findFirst({ where: { id: patientId, hospitalId: session.hospitalId, isDeleted: false } }),
    db.hospital.findFirst({ where: { id: destinationHospitalId, isActive: true } }),
    db.patientHospitalLink.findFirst({ where: { patientId, hospitalId: session.hospitalId } }),
  ]);
  if (!patient || !destinationHospital || !identityLink) return { error: "Patient or destination is unavailable in this referral context." };
  if (visitId && !(await db.visit.findFirst({ where: { id: visitId, patientId, hospitalId: session.hospitalId } }))) {
    return { error: "The selected visit does not belong to this patient and hospital." };
  }

  const referral = await db.$transaction(async (tx) => {
    const created = await tx.referral.create({
      data: {
        identityId: identityLink.identityId,
        patientId,
        sourceVisitId: visitId,
        sourceHospitalId: session.hospitalId,
        destinationHospitalId,
        sourceDepartmentId: session.departmentId,
        destinationDepartmentId: null,
        referringStaffId: session.staffId,
        reason,
        urgency,
        requestedService,
        clinicalInformation: {},
        status: "DRAFT",
      },
    });
    await tx.referralEvent.create({ data: { referralId: created.id, actorId: session.staffId, status: "DRAFT", detail: "Referral draft created." } });
    return created;
  });

  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "REFERRAL_DRAFTED", targetType: "Referral", targetId: referral.id, targetLabel: requestedService });
  redirect(`/referrals/${referral.id}`);
}

export async function authorizeAndSubmitReferralAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const referralId = String(formData.get("referralId") ?? "");
  const authorizationEvidence = String(formData.get("authorizationEvidence") ?? "").trim();
  const recordCategories = [...new Set(formData.getAll("recordCategories").map(String))].filter((category) => SHARED_CATEGORIES.includes(category));
  if (!authorizationEvidence || recordCategories.length === 0) return { error: "Record the patient's authorization evidence and select at least one record category." };

  const referral = await db.referral.findFirst({ where: { id: referralId, sourceHospitalId: session.hospitalId, status: "DRAFT" } });
  if (!referral) return { error: "Referral draft not found in this hospital." };
  const sourceVerification = await db.patientIdentityVerification.findFirst({
    where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: referral.patientId, status: "VERIFIED", revokedAt: null },
  });
  if (!sourceVerification) return { error: "Verify the patient's identity at the referring hospital before submitting a referral." };

  const snapshot = await buildAuthorizedSnapshot(referral, session.hospitalId, recordCategories);
  if (!snapshot) return { error: "Patient record is no longer available." };
  const clinicalInformationSnapshot = snapshot;

  const authorizedAt = new Date();
  const expiresAt = new Date(authorizedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const grant = await db.$transaction(async (tx) => {
    const createdGrant = await tx.patientAccessGrant.create({
      data: {
        identityId: referral.identityId,
        sourceHospitalId: referral.sourceHospitalId,
        receivingHospitalId: referral.destinationHospitalId,
        requestingStaffId: session.staffId,
        purpose: `Referral ${referral.id}: ${referral.requestedService}`,
        recordCategories,
        status: "ACTIVE",
        authorizationEvidence,
        authorizedAt,
        expiresAt,
        referralId: referral.id,
      },
    });
    await tx.referral.update({ where: { id: referral.id }, data: { status: "SUBMITTED", clinicalInformation: clinicalInformationSnapshot, submittedAt: authorizedAt } });
    await tx.referralEvent.create({ data: { referralId: referral.id, actorId: session.staffId, status: "SUBMITTED", detail: "Patient authorization recorded; referral submitted." } });
    return createdGrant;
  });

  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "REFERRAL_SUBMITTED", targetType: "Referral", targetId: referral.id, targetLabel: referral.requestedService, detail: `Access grant ${grant.id}` });
  revalidatePath(`/referrals/${referral.id}`);
  revalidatePath("/referrals");
  return undefined;
}

// Emergency referral without patient authorization. Shares NO clinical
// content: the referral carries only its reason and requested service. The
// receiving hospital must still verify identity in person and open its own
// reasoned, time-limited, audited emergency access event to read records.
// Patient authorization is recorded retrospectively once obtainable.
export async function submitEmergencyReferralAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const referralId = String(formData.get("referralId") ?? "");
  const justification = String(formData.get("justification") ?? "").trim();
  const patientUnableToAuthorize = formData.get("patientUnableToAuthorize") === "on";

  const referral = await db.referral.findFirst({ where: { id: referralId, sourceHospitalId: session.hospitalId } });
  if (!referral) return { error: "Referral draft not found in this hospital." };
  const invalid = validateEmergencySubmission({ status: referral.status, urgency: referral.urgency, justification, patientUnableToAuthorize });
  if (invalid) return { error: invalid };

  const sourceVerification = await db.patientIdentityVerification.findFirst({
    where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: referral.patientId, status: "VERIFIED", revokedAt: null },
  });
  const submittedAt = new Date();
  await db.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referral.id },
      data: {
        status: "SUBMITTED",
        submittedAt,
        clinicalInformation: {
          emergency: {
            justification,
            submittedAt: submittedAt.toISOString(),
            patientAuthorization: "PENDING",
            sourceIdentityVerifiedInPerson: Boolean(sourceVerification),
          },
        },
      },
    });
    await tx.referralEvent.create({
      data: {
        referralId: referral.id,
        actorId: session.staffId,
        status: "SUBMITTED",
        detail: `Emergency submission without patient authorization (patient unable to authorize). ${justification}`,
      },
    });
  });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "EMERGENCY_REFERRAL_SUBMITTED",
    targetType: "Referral",
    targetId: referral.id,
    targetLabel: referral.requestedService,
    detail: `${justification}${sourceVerification ? "" : " · source identity not verified in person"}`,
  });
  revalidatePath(`/referrals/${referral.id}`);
  revalidatePath("/referrals");
  return undefined;
}

// Records the patient's authorization after an emergency submission, creating
// the ordinary consent grant and the consent-filtered snapshot.
export async function recordRetrospectiveAuthorizationAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const referralId = String(formData.get("referralId") ?? "");
  const authorizationEvidence = String(formData.get("authorizationEvidence") ?? "").trim();
  const recordCategories = [...new Set(formData.getAll("recordCategories").map(String))].filter((category) => SHARED_CATEGORIES.includes(category));
  if (!authorizationEvidence || recordCategories.length === 0) return { error: "Record the patient's authorization evidence and select at least one record category." };

  const referral = await db.referral.findFirst({
    where: { id: referralId, sourceHospitalId: session.hospitalId, status: { notIn: ["DRAFT", "DECLINED", "COMPLETED"] } },
  });
  if (!referral) return { error: "Active referral not found in this hospital." };
  const info = referral.clinicalInformation && typeof referral.clinicalInformation === "object" && !Array.isArray(referral.clinicalInformation)
    ? referral.clinicalInformation as Record<string, unknown>
    : {};
  const emergency = info.emergency && typeof info.emergency === "object" ? info.emergency as Record<string, unknown> : null;
  if (!emergency || emergency.patientAuthorization !== "PENDING") return { error: "This referral has no outstanding patient authorization." };

  const snapshot = await buildAuthorizedSnapshot(referral, session.hospitalId, recordCategories);
  if (!snapshot) return { error: "Patient record is no longer available." };

  const authorizedAt = new Date();
  const grant = await db.$transaction(async (tx) => {
    const createdGrant = await tx.patientAccessGrant.create({
      data: {
        identityId: referral.identityId,
        sourceHospitalId: referral.sourceHospitalId,
        receivingHospitalId: referral.destinationHospitalId,
        requestingStaffId: session.staffId,
        purpose: `Referral ${referral.id}: ${referral.requestedService} (retrospective authorization)`,
        recordCategories,
        status: "ACTIVE",
        authorizationEvidence,
        authorizedAt,
        expiresAt: new Date(authorizedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        referralId: referral.id,
      },
    });
    await tx.referral.update({
      where: { id: referral.id },
      data: {
        clinicalInformation: JSON.parse(JSON.stringify({
          ...info,
          ...snapshot,
          emergency: { ...emergency, patientAuthorization: "RECORDED", authorizedAt: authorizedAt.toISOString() },
        })),
      },
    });
    await tx.referralEvent.create({
      data: { referralId: referral.id, actorId: session.staffId, status: referral.status, detail: "Retrospective patient authorization recorded." },
    });
    return createdGrant;
  });

  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "RETROSPECTIVE_AUTHORIZATION_RECORDED", targetType: "Referral", targetId: referral.id, targetLabel: referral.requestedService, detail: `Access grant ${grant.id}` });
  revalidatePath(`/referrals/${referral.id}`);
  return undefined;
}

export async function transitionReferralAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession();
  const referralId = String(formData.get("referralId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as ReferralStatus;
  const detail = String(formData.get("detail") ?? "").trim() || null;
  const appointmentDateRaw = String(formData.get("appointmentScheduledFor") ?? "");
  const referral = await db.referral.findFirst({
    where: { id: referralId, OR: [{ sourceHospitalId: session.hospitalId }, { destinationHospitalId: session.hospitalId }] },
  });
  if (!referral) return { error: "Referral not found in this hospital." };

  const isRecipient = referral.destinationHospitalId === session.hospitalId;
  const allowed: string[] = allowedTransitions({ isRecipient, status: referral.status, urgency: referral.urgency });
  if (!allowed.includes(nextStatus)) return { error: "That referral transition is not allowed from its current state." };
  if (STATUS_NEEDS_NOTE.includes(nextStatus) && !detail) return { error: "Add a note so the other hospital knows why." };
  if (isRecipient && requiresConfirmedId(nextStatus, referral.urgency)) {
    const confirmedLink = await db.patientHospitalLink.findFirst({ where: { identityId: referral.identityId, hospitalId: session.hospitalId, verificationStatus: "VERIFIED" } });
    const confirmed = confirmedLink && await db.patientIdentityVerification.findFirst({
      where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: confirmedLink.patientId, status: "VERIFIED", revokedAt: null },
    });
    if (!confirmed) return { error: "Confirm the patient's CareNexa ID before accepting or treating them." };
  }
  const appointmentScheduledFor = nextStatus === "APPOINTMENT_SCHEDULED" ? new Date(appointmentDateRaw) : undefined;
  if (nextStatus === "APPOINTMENT_SCHEDULED" && (!appointmentDateRaw || Number.isNaN(appointmentScheduledFor?.getTime()) || appointmentScheduledFor! <= new Date())) {
    return { error: "Choose a future appointment time." };
  }

  const clinicalTransitions: ReferralStatus[] = ["UNDER_REVIEW", "MORE_INFORMATION_REQUESTED", "ACCEPTED", "DECLINED", "REDIRECTED", "TREATMENT_IN_PROGRESS", "DISCHARGED", "COMPLETED"];
  const receptionTransitions: ReferralStatus[] = ["ACKNOWLEDGED", "APPOINTMENT_SCHEDULED", "ARRIVAL_CONFIRMED"];
  if (clinicalTransitions.includes(nextStatus) && !["ADMIN", "CLINICIAN"].includes(session.role)) {
    return { error: "A clinician or hospital administrator must make this referral decision." };
  }
  if (receptionTransitions.includes(nextStatus) && !["ADMIN", "CLINICIAN", "RECORDS_OFFICER", "RECEPTIONIST"].includes(session.role)) {
    return { error: "Your role cannot update this referral step." };
  }

  if (nextStatus === "ARRIVAL_CONFIRMED") {
    const receivingLink = await db.patientHospitalLink.findFirst({ where: { identityId: referral.identityId, hospitalId: session.hospitalId, verificationStatus: "VERIFIED" } });
    const verification = receivingLink && await db.patientIdentityVerification.findFirst({
      where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: receivingLink.patientId, status: "VERIFIED", revokedAt: null },
    });
    if (!receivingLink || !verification) return { error: "Verify the patient's identity in person at this hospital before confirming arrival." };
  }

  await db.$transaction(async (tx) => {
    await tx.referral.update({ where: { id: referral.id }, data: { status: nextStatus, appointmentScheduledFor } });
    await tx.referralEvent.create({ data: { referralId: referral.id, actorId: session.staffId, status: nextStatus, detail } });
    // Checking the patient in (or starting emergency treatment directly) opens a
    // local visit, so they appear as present at this hospital.
    if (isRecipient && (nextStatus === "ARRIVAL_CONFIRMED" || nextStatus === "TREATMENT_IN_PROGRESS")) {
      const localLink = await tx.patientHospitalLink.findFirst({ where: { identityId: referral.identityId, hospitalId: session.hospitalId } });
      if (localLink && !(await tx.visit.findFirst({ where: { patientId: localLink.patientId, hospitalId: session.hospitalId, status: "OPEN" } }))) {
        await tx.visit.create({
          data: {
            hospitalId: session.hospitalId,
            patientId: localLink.patientId,
            openedById: session.staffId,
            presentingComplaint: `Referral: ${referral.requestedService}`,
          },
        });
      }
    }
  });
  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "REFERRAL_STATUS_CHANGED", targetType: "Referral", targetId: referral.id, targetLabel: nextStatus, detail: detail ?? undefined });
  revalidatePath(`/referrals/${referral.id}`);
  revalidatePath("/referrals");
  return undefined;
}

export async function verifyIncomingReferralIdentityAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "RECORDS_OFFICER", "RECEPTIONIST"]);
  const referralId = String(formData.get("referralId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const careNexaId = String(formData.get("careNexaId") ?? "").trim();
  const note = String(formData.get("evidenceReference") ?? "").trim();
  if (!patientId || !careNexaId) return { error: "Enter the CareNexa ID from the patient's card." };

  const referral = await db.referral.findFirst({ where: { id: referralId, destinationHospitalId: session.hospitalId }, include: { identity: true } });
  const patient = await db.patient.findFirst({ where: { id: patientId, hospitalId: session.hospitalId, isDeleted: false } });
  if (!referral || !patient) return { error: "Referral or patient record not found at this hospital." };
  if (!careNexaIdMatches(careNexaId, referral.identity.universalPatientNumber)) {
    await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "CARENEXA_ID_MISMATCH", targetType: "Referral", targetId: referral.id });
    return { error: "That CareNexa ID doesn't match this referral. Check the patient's card and try again." };
  }
  const evidenceReference = `CareNexa ID confirmed from patient's card${note ? ` · ${note}` : ""}`;

  const link = await db.patientHospitalLink.findFirst({ where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId } });
  if (!link) return { error: "This local patient record is not linked to the referral's CareNexa identity. Register or link the identity after checking the patient in person." };

  await db.$transaction(async (tx) => {
    await tx.patientHospitalLink.update({ where: { id: link.id }, data: { verificationStatus: "VERIFIED" } });
    const existingVerification = await tx.patientIdentityVerification.findFirst({
      where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId, status: "VERIFIED", revokedAt: null },
    });
    if (!existingVerification) {
      await tx.patientIdentityVerification.create({
        data: {
          identityId: referral.identityId,
          hospitalId: session.hospitalId,
          patientId,
          verifiedById: session.staffId,
          status: "VERIFIED",
          method: "IN_PERSON_REFERRAL_ARRIVAL",
          evidenceReference,
        },
      });
    }
    if (referral.status === "SUBMITTED") {
      await tx.referral.update({ where: { id: referral.id }, data: { status: "ACKNOWLEDGED" } });
      await tx.referralEvent.create({ data: { referralId: referral.id, actorId: session.staffId, status: "ACKNOWLEDGED", detail: "CareNexa ID confirmed; referral acknowledged." } });
    }
  });

  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "REFERRAL_IDENTITY_VERIFIED", targetType: "Referral", targetId: referral.id, targetLabel: referral.identityId, detail: evidenceReference });
  revalidatePath(`/referrals/${referral.id}`);
  return undefined;
}

// Receiving hospital, first arrival: creates this hospital's own local record
// for the referred patient, linked to the same CareNexa identity, and records
// the in-person identity check. Demographics come from the referral when the
// patient authorized sharing them; otherwise staff enter them.
export async function registerReferredPatientAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "RECORDS_OFFICER", "RECEPTIONIST"]);
  const referralId = String(formData.get("referralId") ?? "");
  const careNexaId = String(formData.get("careNexaId") ?? "").trim();
  const note = String(formData.get("evidenceReference") ?? "").trim();
  if (!careNexaId) return { error: "Enter the CareNexa ID from the patient's card." };

  const referral = await db.referral.findFirst({
    where: { id: referralId, destinationHospitalId: session.hospitalId, status: { notIn: ["DRAFT", "DECLINED", "REDIRECTED", "COMPLETED"] } },
    include: { identity: true },
  });
  if (!referral) return { error: "Active incoming referral not found at this hospital." };
  if (!careNexaIdMatches(careNexaId, referral.identity.universalPatientNumber)) {
    await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "CARENEXA_ID_MISMATCH", targetType: "Referral", targetId: referral.id });
    return { error: "That CareNexa ID doesn't match this referral. Check the patient's card and try again." };
  }
  const evidenceReference = `CareNexa ID confirmed from patient's card${note ? ` · ${note}` : ""}`;
  if (await db.patientHospitalLink.findFirst({ where: { identityId: referral.identityId, hospitalId: session.hospitalId } })) {
    return { error: "This patient already has a record at this hospital." };
  }

  const info = referral.clinicalInformation && typeof referral.clinicalInformation === "object" && !Array.isArray(referral.clinicalInformation)
    ? referral.clinicalInformation as Record<string, unknown>
    : {};
  const shared = (info.patient && typeof info.patient === "object" ? info.patient : {}) as Record<string, unknown>;
  const text = (key: string) => {
    const typed = String(formData.get(key) ?? "").trim();
    return typed || (typeof shared[key] === "string" ? (shared[key] as string).trim() : "");
  };
  const fullName = text("fullName");
  const dateOfBirth = new Date(text("dateOfBirth"));
  const sex = text("sex");
  if (!fullName || Number.isNaN(dateOfBirth.getTime()) || (sex !== "MALE" && sex !== "FEMALE")) {
    return { error: "Enter the patient's name, date of birth and sex." };
  }
  const genotypes = ["AA", "AS", "SS", "AC", "SC"];
  const genotype = typeof shared.genotype === "string" && genotypes.includes(shared.genotype) ? shared.genotype as "AA" : null;

  const cardType = await db.cardType.findFirst({ where: { hospitalId: session.hospitalId, seriesCode: "GOP" } })
    ?? await db.cardType.findFirst({ where: { hospitalId: session.hospitalId }, orderBy: { name: "asc" } });
  if (!cardType) return { error: "Set up a card type for this hospital first (Admin → Card Types)." };
  const hospitalNumber = await issueHospitalNumber(cardType.id, session.hospitalId);

  const patient = await db.$transaction(async (tx) => {
    const created = await tx.patient.create({
      data: {
        hospitalId: session.hospitalId,
        hospitalNumber,
        cardTypeId: cardType.id,
        fullName,
        dateOfBirth,
        sex,
        phone: text("phone") || "Not recorded",
        address: text("address") || "Not recorded",
        bloodGroup: typeof shared.bloodGroup === "string" ? shared.bloodGroup : null,
        genotype,
        allergies: Array.isArray(shared.allergies) ? shared.allergies.filter((a): a is string => typeof a === "string") : [],
        nextOfKinName: text("nextOfKinName") || "Not recorded",
        nextOfKinPhone: text("nextOfKinPhone") || "Not recorded",
        nextOfKinRelation: text("nextOfKinRelation") || "Not recorded",
      },
    });
    await tx.patientHospitalLink.create({
      data: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: created.id, verificationStatus: "VERIFIED" },
    });
    await tx.patientIdentityVerification.create({
      data: {
        identityId: referral.identityId,
        hospitalId: session.hospitalId,
        patientId: created.id,
        verifiedById: session.staffId,
        status: "VERIFIED",
        method: "IN_PERSON_REFERRAL_ARRIVAL",
        evidenceReference,
      },
    });
    if (referral.status === "SUBMITTED") {
      await tx.referral.update({ where: { id: referral.id }, data: { status: "ACKNOWLEDGED" } });
      await tx.referralEvent.create({
        data: { referralId: referral.id, actorId: session.staffId, status: "ACKNOWLEDGED", detail: `CareNexa ID confirmed; registered at this hospital as ${hospitalNumber}.` },
      });
    }
    return created;
  });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "REFERRED_PATIENT_REGISTERED",
    targetType: "Patient",
    targetId: patient.id,
    targetLabel: `${patient.fullName} (${hospitalNumber})`,
    detail: `Referral ${referral.id} · ${evidenceReference}`,
  });
  revalidatePath(`/referrals/${referral.id}`);
  revalidatePath("/patients");
  return { success: true };
}

export async function revokePatientAccessGrantAction(formData: FormData) {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const grantId = String(formData.get("grantId") ?? "");
  const grant = await db.patientAccessGrant.findFirst({ where: { id: grantId, sourceHospitalId: session.hospitalId, status: "ACTIVE" } });
  if (!grant) return;

  await db.patientAccessGrant.update({ where: { id: grant.id }, data: { status: "REVOKED", revokedAt: new Date() } });
  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "PATIENT_ACCESS_REVOKED", targetType: "PatientAccessGrant", targetId: grant.id, targetLabel: grant.identityId });
  if (grant.referralId) revalidatePath(`/referrals/${grant.referralId}`);
  revalidatePath("/access-requests");
}

export async function createEmergencyAccessAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const referralId = String(formData.get("referralId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const recordCategories = [...new Set(formData.getAll("recordCategories").map(String))].filter((category) => SHARED_CATEGORIES.includes(category));
  if (reason.length < 20 || recordCategories.length === 0) return { error: "Enter a specific emergency reason and select the needed record categories." };

  const referral = await db.referral.findFirst({
    where: { id: referralId, destinationHospitalId: session.hospitalId, status: { notIn: ["DRAFT", "DECLINED", "COMPLETED"] } },
  });
  if (!referral) return { error: "An active incoming referral is required for emergency access." };

  const now = new Date();
  const event = await db.emergencyAccessEvent.create({
    data: {
      identityId: referral.identityId,
      sourceHospitalId: referral.sourceHospitalId,
      accessingHospitalId: session.hospitalId,
      referralId: referral.id,
      grantedById: session.staffId,
      reason,
      recordCategories,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    },
  });
  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "EMERGENCY_RECORD_ACCESS_GRANTED", targetType: "EmergencyAccessEvent", targetId: event.id, targetLabel: referral.identityId, detail: reason });
  revalidatePath(`/referrals/${referral.id}`);
  return undefined;
}

export async function endEmergencyAccessAction(formData: FormData) {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const eventId = String(formData.get("eventId") ?? "");
  const event = await db.emergencyAccessEvent.findFirst({ where: { id: eventId, accessingHospitalId: session.hospitalId, endedAt: null } });
  if (!event) return;
  await db.emergencyAccessEvent.update({ where: { id: event.id }, data: { endedAt: new Date() } });
  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "EMERGENCY_RECORD_ACCESS_ENDED", targetType: "EmergencyAccessEvent", targetId: event.id, targetLabel: event.identityId });
  if (event.referralId) revalidatePath(`/referrals/${event.referralId}`);
}

export async function submitCounterReferralAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const referralId = String(formData.get("referralId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const authorizationEvidence = String(formData.get("authorizationEvidence") ?? "").trim();
  if (!summary || !authorizationEvidence) return { error: "Enter the reviewed care summary and patient authorization evidence." };

  const referral = await db.referral.findFirst({ where: { id: referralId, destinationHospitalId: session.hospitalId, status: "DISCHARGED" } });
  if (!referral) return { error: "Only a discharged referral at this hospital can return a summary." };
  const receivingLink = await db.patientHospitalLink.findFirst({ where: { identityId: referral.identityId, hospitalId: session.hospitalId, verificationStatus: "VERIFIED" } });
  const identityVerification = receivingLink && await db.patientIdentityVerification.findFirst({
    where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: receivingLink.patientId, status: "VERIFIED", revokedAt: null },
  });
  if (!receivingLink || !identityVerification) return { error: "Verify the patient's identity in person before returning care information." };
  const now = new Date();
  const grant = await db.$transaction(async (tx) => {
    const createdGrant = await tx.patientAccessGrant.create({
      data: {
        identityId: referral.identityId,
        sourceHospitalId: session.hospitalId,
        receivingHospitalId: referral.sourceHospitalId,
        requestingStaffId: session.staffId,
        purpose: `Counter-referral ${referral.id}`,
        recordCategories: ["COUNTER_REFERRAL"],
        status: "ACTIVE",
        authorizationEvidence,
        authorizedAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        referralId: referral.id,
      },
    });
    const existingInfo = referral.clinicalInformation && typeof referral.clinicalInformation === "object" && !Array.isArray(referral.clinicalInformation)
      ? referral.clinicalInformation as Record<string, unknown>
      : {};
    await tx.referral.update({
      where: { id: referral.id },
      data: { status: "COUNTER_REFERRAL_SUBMITTED", clinicalInformation: { ...existingInfo, counterReferral: { summary, createdAt: now.toISOString() } } },
    });
    await tx.referralEvent.create({ data: { referralId: referral.id, actorId: session.staffId, status: "COUNTER_REFERRAL_SUBMITTED", detail: "Patient-authorized counter-referral summary submitted." } });
    return createdGrant;
  });

  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "COUNTER_REFERRAL_SUBMITTED", targetType: "Referral", targetId: referral.id, targetLabel: referral.requestedService, detail: `Access grant ${grant.id}` });
  revalidatePath(`/referrals/${referral.id}`);
  revalidatePath("/referrals");
  return undefined;
}

export async function incorporateCounterReferralAction(_prev: ReferralActionState, formData: FormData): Promise<ReferralActionState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const referralId = String(formData.get("referralId") ?? "");
  const referral = await db.referral.findFirst({
    where: { id: referralId, sourceHospitalId: session.hospitalId, status: { in: ["COUNTER_REFERRAL_SUBMITTED", "COMPLETED"] } },
    include: { destinationHospital: true },
  });
  if (!referral) return { error: "Counter-referral not found in this hospital." };

  const link = await db.patientHospitalLink.findFirst({ where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: referral.patientId, verificationStatus: "VERIFIED" } });
  const verification = link && await db.patientIdentityVerification.findFirst({
    where: { identityId: referral.identityId, hospitalId: session.hospitalId, patientId: referral.patientId, status: "VERIFIED", revokedAt: null },
  });
  const grant = await db.patientAccessGrant.findFirst({
    where: {
      referralId: referral.id,
      identityId: referral.identityId,
      sourceHospitalId: referral.destinationHospitalId,
      receivingHospitalId: session.hospitalId,
      status: "ACTIVE",
      revokedAt: null,
      recordCategories: { has: "COUNTER_REFERRAL" },
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
    },
  });
  if (!link || !verification || !grant) return { error: "Identity verification or counter-referral authorization is no longer active." };

  const information = referral.clinicalInformation && typeof referral.clinicalInformation === "object" && !Array.isArray(referral.clinicalInformation)
    ? referral.clinicalInformation as Record<string, unknown>
    : {};
  const counterReferral = information.counterReferral as { summary?: unknown; incorporatedAt?: unknown } | undefined;
  if (typeof counterReferral?.summary !== "string" || !counterReferral.summary.trim()) return { error: "No counter-referral summary is available." };
  if (counterReferral.incorporatedAt) return { error: "This report is already stored on the patient's record." };
  const summary = counterReferral.summary;

  const sourceVisit = referral.sourceVisitId
    ? await db.visit.findFirst({ where: { id: referral.sourceVisitId, patientId: referral.patientId, hospitalId: session.hospitalId } })
    : null;
  const incorporatedAt = new Date();
  await db.$transaction(async (tx) => {
    // Store against the visit the referral came from; if there was none, file it
    // in its own (closed) record entry so the report is never lost.
    const visit = sourceVisit ?? await tx.visit.create({
      data: {
        hospitalId: session.hospitalId,
        patientId: referral.patientId,
        openedById: session.staffId,
        status: "CLOSED",
        closedAt: incorporatedAt,
        presentingComplaint: `Care report returned from ${referral.destinationHospital.name}`,
      },
    });
    await tx.clinicalNote.create({
      data: {
        visitId: visit.id,
        authorId: session.staffId,
        content: `Reviewed counter-referral from ${referral.destinationHospital.name}:\n\n${summary}`,
      },
    });
    await tx.referral.update({
      where: { id: referral.id },
      data: { clinicalInformation: JSON.parse(JSON.stringify({ ...information, counterReferral: { ...counterReferral, incorporatedAt: incorporatedAt.toISOString() } })) },
    });
    await tx.referralEvent.create({
      data: { referralId: referral.id, actorId: session.staffId, status: referral.status, detail: "Counter-referral reviewed and incorporated as an unsigned local note." },
    });
  });
  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "COUNTER_REFERRAL_INCORPORATED", targetType: "Referral", targetId: referral.id, targetLabel: referral.requestedService });
  revalidatePath(`/patients/${referral.patientId}`);
  revalidatePath(`/referrals/${referral.id}`);
  return { success: true };
}
