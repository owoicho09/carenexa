"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { screenApplication } from "@/lib/ai/cvScreen";
import { logAudit } from "@/lib/audit";
import type { StaffRole } from "@/generated/prisma/enums";

type ActionState = { error?: string } | undefined;

async function loadApplication(applicationId: string, hospitalId: string) {
  const application = await db.application.findFirst({ where: { id: applicationId, hospitalId } });
  if (!application) throw new Error("Application not found");
  return application;
}

export async function screenApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["ADMIN", "RECRUITER"]);
  const applicationId = String(formData.get("applicationId") ?? "");
  const result = await screenApplication(applicationId, session.hospitalId, session.staffId);
  if (result.error) return { error: result.error };
  revalidatePath(`/recruitment/applications/${applicationId}`);
  return undefined;
}

export async function overrideScreeningAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["ADMIN", "RECRUITER"]);
  const applicationId = String(formData.get("applicationId") ?? "");
  const screeningOverrideNote = String(formData.get("screeningOverrideNote") ?? "").trim();
  if (!screeningOverrideNote) return { error: "Explain why you're overriding the AI's screening." };

  await db.application.updateMany({ where: { id: applicationId, hospitalId: session.hospitalId }, data: { screeningOverrideNote } });
  revalidatePath(`/recruitment/applications/${applicationId}`);
  return undefined;
}

export async function setStageAction(formData: FormData) {
  const session = await requireSession(["ADMIN", "RECRUITER"]);
  const applicationId = String(formData.get("applicationId") ?? "");
  const stage = String(formData.get("stage") ?? "") as
    | "SHORTLISTED"
    | "REJECTED";
  await db.application.updateMany({ where: { id: applicationId, hospitalId: session.hospitalId }, data: { stage } });
  revalidatePath(`/recruitment/applications/${applicationId}`);
}

export async function scheduleInterviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["ADMIN", "RECRUITER"]);
  const applicationId = String(formData.get("applicationId") ?? "");
  const scheduledFor = String(formData.get("scheduledFor") ?? "");
  if (!scheduledFor) return { error: "Pick a date and time." };

  const application = await loadApplication(applicationId, session.hospitalId);
  await db.interview.create({ data: { applicationId, scheduledFor: new Date(scheduledFor) } });
  await db.application.update({ where: { id: application.id, hospitalId: session.hospitalId }, data: { stage: "SHORTLISTED" } });
  revalidatePath(`/recruitment/applications/${applicationId}`);
  return undefined;
}

export async function recordInterviewOutcomeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["ADMIN", "RECRUITER"]);
  const applicationId = String(formData.get("applicationId") ?? "");
  const outcome = String(formData.get("outcome") ?? "").trim();
  if (!outcome) return { error: "Record what happened at interview." };

  const application = await loadApplication(applicationId, session.hospitalId);
  await db.interview.update({ where: { applicationId }, data: { outcome } });
  await db.application.update({ where: { id: application.id, hospitalId: session.hospitalId }, data: { stage: "INTERVIEWED" } });
  revalidatePath(`/recruitment/applications/${applicationId}`);
  return undefined;
}

export type HireState = { error?: string; tempPassword?: string; staffEmail?: string } | undefined;

export async function hireAction(_prev: HireState, formData: FormData): Promise<HireState> {
  const session = await requireSession(["ADMIN", "RECRUITER"]);
  const applicationId = String(formData.get("applicationId") ?? "");
  const role = String(formData.get("role") ?? "") as StaffRole;
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!role || !jobTitle || !email) return { error: "Fill in role, job title, and a login email." };

  const application = await db.application.findFirst({ where: { id: applicationId, hospitalId: session.hospitalId }, include: { candidate: true } });
  if (!application) return { error: "Application not found." };
  if (departmentId && !(await db.department.findFirst({ where: { id: departmentId, hospitalId: session.hospitalId } }))) {
    return { error: "Choose a department in this hospital." };
  }

  const existing = await db.staffMember.findUnique({ where: { email } });
  if (existing) return { error: `${email} is already in use by another staff account.` };

  const tempPassword = crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const staff = await db.staffMember.create({
    data: {
      fullName: application.candidate.fullName,
      hospitalId: session.hospitalId,
      email,
      passwordHash,
      role,
      jobTitle,
      departmentId,
      hiredFromCandidateId: application.candidateId,
    },
  });

  await db.application.update({ where: { id: applicationId, hospitalId: session.hospitalId }, data: { stage: "HIRED" } });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "STAFF_HIRED",
    targetType: "StaffMember",
    targetId: staff.id,
    targetLabel: staff.fullName,
    detail: `From application ${applicationId}`,
  });

  revalidatePath(`/recruitment/applications/${applicationId}`);
  return { tempPassword, staffEmail: email };
}
