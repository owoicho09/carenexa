"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createRequest } from "@/lib/requests";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { RequestUrgency, Genotype, Sex } from "@/generated/prisma/enums";

export type SendToDepartmentState = { error?: string } | undefined;

export async function sendToDepartmentAction(
  _prevState: SendToDepartmentState,
  formData: FormData
): Promise<SendToDepartmentState> {
  const session = await requireSession();

  const visitId = String(formData.get("visitId") ?? "");
  const toDepartmentId = String(formData.get("toDepartmentId") ?? "");
  const requestType = String(formData.get("requestType") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const urgency = String(formData.get("urgency") ?? "ROUTINE") as RequestUrgency;

  if (!visitId || !toDepartmentId || !requestType || !reason) {
    return { error: "Choose a department, request type, and reason before sending." };
  }

  const visit = await db.visit.findFirst({ where: { id: visitId, hospitalId: session.hospitalId } });
  if (!visit || visit.status !== "OPEN") {
    return { error: "This visit is closed and can no longer receive requests." };
  }

  const toDepartment = await db.department.findFirst({ where: { id: toDepartmentId, hospitalId: session.hospitalId } });
  if (!toDepartment) return { error: "Choose a department in this hospital." };

  const fromDepartmentId = session.departmentId;
  if (!fromDepartmentId) {
    return { error: "Your account has no department assigned, so it can't send requests." };
  }

  await createRequest({
    hospitalId: session.hospitalId,
    visitId,
    fromDepartmentId,
    toDepartmentId,
    requestedById: session.staffId,
    requestType,
    reason,
    urgency,
  });

  revalidatePath(`/patients/${visit.patientId}`);
  return undefined;
}

export type CloseVisitState = { error?: string } | undefined;

export async function closeVisitAction(
  _prevState: CloseVisitState,
  formData: FormData
): Promise<CloseVisitState> {
  const session = await requireSession();

  const visitId = String(formData.get("visitId") ?? "");
  const followUpDate = String(formData.get("followUpDate") ?? "");
  const followUpNote = String(formData.get("followUpNote") ?? "").trim();

  const visit = await db.visit.findFirst({ where: { id: visitId, hospitalId: session.hospitalId } });
  if (!visit || visit.status !== "OPEN") {
    return { error: "This visit is already closed." };
  }

  await db.visit.update({
    where: { id: visitId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      followUpNote: followUpNote || null,
    },
  });

  revalidatePath(`/patients/${visit.patientId}`);
  return undefined;
}

export type UpdatePatientState = { error?: string } | undefined;

export async function updatePatientAction(_prev: UpdatePatientState, formData: FormData): Promise<UpdatePatientState> {
  const session = await requireSession();

  const patientId = String(formData.get("patientId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const sex = String(formData.get("sex") ?? "") as Sex;
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const bloodGroup = String(formData.get("bloodGroup") ?? "").trim();
  const genotype = String(formData.get("genotype") ?? "") as Genotype | "";
  const allergiesRaw = String(formData.get("allergies") ?? "").trim();
  const nextOfKinName = String(formData.get("nextOfKinName") ?? "").trim();
  const nextOfKinPhone = String(formData.get("nextOfKinPhone") ?? "").trim();
  const nextOfKinRelation = String(formData.get("nextOfKinRelation") ?? "").trim();

  if (!fullName || !dateOfBirth || !sex || !phone || !address || !nextOfKinName || !nextOfKinPhone || !nextOfKinRelation) {
    return { error: "Fill in every required field." };
  }

  const allergies = allergiesRaw ? allergiesRaw.split(",").map((a) => a.trim()).filter(Boolean) : [];

  const updated = await db.patient.updateMany({
    where: { id: patientId, hospitalId: session.hospitalId },
    data: {
      fullName,
      dateOfBirth: new Date(dateOfBirth),
      sex,
      phone,
      address,
      bloodGroup: bloodGroup || null,
      genotype: genotype || null,
      allergies,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelation,
    },
  });
  if (!updated.count) return { error: "Patient not found in this hospital." };

  redirect(`/patients/${patientId}`);
}

export type DeletePatientState = { error?: string } | undefined;

export async function deletePatientAction(_prev: DeletePatientState, formData: FormData): Promise<DeletePatientState> {
  const session = await requireSession();
  const patientId = String(formData.get("patientId") ?? "");

  const allowed = await hasPermission(session.role, "CAN_DELETE_PATIENT", session.hospitalId);
  if (!allowed) return { error: "Your role doesn't have permission to delete patients." };

  const patient = await db.patient.findFirst({ where: { id: patientId, hospitalId: session.hospitalId } });
  if (!patient) return { error: "Patient not found in this hospital." };
  await db.patient.update({ where: { id: patient.id }, data: { isDeleted: true, deletedAt: new Date() } });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "PATIENT_DELETED",
    targetType: "Patient",
    targetId: patient.id,
    targetLabel: patient.fullName,
  });

  redirect("/records");
}

export type OpenVisitState = { error?: string } | undefined;

export type IdentityVerificationState = { error?: string } | undefined;

export async function verifyPatientIdentityAction(_prev: IdentityVerificationState, formData: FormData): Promise<IdentityVerificationState> {
  const session = await requireSession(["ADMIN", "RECORDS_OFFICER", "RECEPTIONIST"]);
  const patientId = String(formData.get("patientId") ?? "");
  const evidenceReference = String(formData.get("evidenceReference") ?? "").trim();
  if (!evidenceReference) return { error: "Enter the in-person verification evidence reference." };

  const link = await db.patientHospitalLink.findFirst({ where: { patientId, hospitalId: session.hospitalId } });
  if (!link) return { error: "Patient identity link not found in this hospital." };

  await db.$transaction(async (tx) => {
    await tx.patientHospitalLink.update({ where: { id: link.id }, data: { verificationStatus: "VERIFIED" } });
    await tx.patientIdentityVerification.create({
      data: {
        identityId: link.identityId,
        hospitalId: session.hospitalId,
        patientId,
        verifiedById: session.staffId,
        status: "VERIFIED",
        method: "IN_PERSON",
        evidenceReference,
      },
    });
    await tx.careNexaIdentity.update({ where: { id: link.identityId }, data: { verificationStatus: "VERIFIED", verificationMethod: "IN_PERSON", verifiedAt: new Date() } });
  });

  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "PATIENT_IDENTITY_VERIFIED", targetType: "Patient", targetId: patientId, detail: evidenceReference });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/referrals/[id]", "page");
  return undefined;
}

export async function openVisitAction(_prev: OpenVisitState, formData: FormData): Promise<OpenVisitState> {
  const session = await requireSession();
  const patientId = String(formData.get("patientId") ?? "");
  const presentingComplaint = String(formData.get("presentingComplaint") ?? "").trim();

  const patient = await db.patient.findFirst({ where: { id: patientId, hospitalId: session.hospitalId, isDeleted: false } });
  if (!patient) return { error: "Patient not found in this hospital." };

  const existingOpen = await db.visit.findFirst({ where: { hospitalId: session.hospitalId, patientId, status: "OPEN" } });
  if (existingOpen) {
    return { error: "This patient already has an open visit." };
  }

  await db.visit.create({
    data: { hospitalId: session.hospitalId, patientId, openedById: session.staffId, presentingComplaint: presentingComplaint || null },
  });

  redirect(`/patients/${patientId}`);
}

export type BookAppointmentState = { error?: string } | undefined;

export async function bookAppointmentAction(_prev: BookAppointmentState, formData: FormData): Promise<BookAppointmentState> {
  const session = await requireSession();
  const patientId = String(formData.get("patientId") ?? "");
  const scheduledFor = String(formData.get("scheduledFor") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!scheduledFor || !reason) {
    return { error: "Pick a date/time and enter a reason." };
  }

  await db.appointment.create({
    data: {
      hospitalId: session.hospitalId,
      patientId,
      departmentId: session.departmentId,
      scheduledFor: new Date(scheduledFor),
      reason,
      createdById: session.staffId,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/records/appointments");
  return undefined;
}

export async function setAppointmentStatusAction(formData: FormData) {
  const session = await requireSession();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const status = String(formData.get("status") ?? "") as "COMPLETED" | "CANCELLED" | "NO_SHOW";
  const appointment = await db.appointment.findFirst({ where: { id: appointmentId, hospitalId: session.hospitalId } });
  if (!appointment) return;
  await db.appointment.update({ where: { id: appointment.id }, data: { status } });
  revalidatePath(`/patients/${appointment.patientId}`);
  revalidatePath("/records/appointments");
}

export type SendCommunicationState = { error?: string; communicationId?: string } | undefined;

export async function sendCommunicationAction(_prev: SendCommunicationState, formData: FormData): Promise<SendCommunicationState> {
  const session = await requireSession();
  const patientId = String(formData.get("patientId") ?? "");
  const channel = String(formData.get("channel") ?? "") as "WHATSAPP" | "EMAIL";
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const templateUsed = String(formData.get("templateUsed") ?? "") || null;

  if (!body) return { error: "Write a message before sending." };
  if (channel === "EMAIL" && !subject) return { error: "Email needs a subject line." };

  const communication = await db.communication.create({
    data: {
      hospitalId: session.hospitalId,
      patientId,
      channel,
      subject: channel === "EMAIL" ? subject : null,
      body,
      templateUsed,
      sentById: session.staffId,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  return { communicationId: communication.id };
}

export async function confirmDeliveryAction(communicationId: string) {
  const session = await requireSession();
  const communication = await db.communication.findFirst({ where: { id: communicationId, hospitalId: session.hospitalId } });
  if (!communication) return;
  await db.communication.update({
    where: { id: communication.id },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  revalidatePath(`/patients/${communication.patientId}`);
}
