"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { StaffRole } from "@/generated/prisma/enums";

export type CreateStaffState = { error?: string; tempPassword?: string; email?: string } | undefined;

export async function createStaffAction(_prev: CreateStaffState, formData: FormData): Promise<CreateStaffState> {
  const session = await requireSession(["ADMIN"]);

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as StaffRole;
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "") || null;

  if (!fullName || !email || !role || !jobTitle) {
    return { error: "Fill in name, email, role, and job title." };
  }

  const existing = await db.staffMember.findUnique({ where: { email } });
  if (existing) return { error: `${email} is already in use.` };
  if (departmentId && !(await db.department.findFirst({ where: { id: departmentId, hospitalId: session.hospitalId } }))) {
    return { error: "Choose a department in this hospital." };
  }

  const tempPassword = crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const staff = await db.staffMember.create({
    data: { fullName, email, passwordHash, role, jobTitle, departmentId, hospitalId: session.hospitalId },
  });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "STAFF_CREATED",
    targetType: "StaffMember",
    targetId: staff.id,
    targetLabel: staff.fullName,
    detail: `Role ${role}`,
  });

  revalidatePath("/admin/staff");
  return { tempPassword, email };
}

export type UpdateStaffState = { error?: string } | undefined;

export async function updateStaffAction(_prev: UpdateStaffState, formData: FormData): Promise<UpdateStaffState> {
  const session = await requireSession(["ADMIN"]);

  const staffId = String(formData.get("staffId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "") as StaffRole;
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "") || null;

  if (!fullName || !role || !jobTitle) return { error: "Fill in name, role, and job title." };
  if (departmentId && !(await db.department.findFirst({ where: { id: departmentId, hospitalId: session.hospitalId } }))) {
    return { error: "Choose a department in this hospital." };
  }

  const existing = await db.staffMember.findFirst({ where: { id: staffId, hospitalId: session.hospitalId } });
  if (!existing) return { error: "Staff member not found in this hospital." };

  await db.staffMember.update({
    where: { id: existing.id },
    data: { fullName, role, jobTitle, departmentId },
  });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "STAFF_EDITED",
    targetType: "StaffMember",
    targetId: staffId,
    targetLabel: fullName,
  });

  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}

export async function toggleStaffActiveAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const staffId = String(formData.get("staffId") ?? "");
  const isActive = formData.get("isActive") === "true";

  const existing = await db.staffMember.findFirst({ where: { id: staffId, hospitalId: session.hospitalId } });
  if (!existing) return;
  const staff = await db.staffMember.update({ where: { id: existing.id }, data: { isActive } });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: isActive ? "STAFF_REACTIVATED" : "STAFF_DEACTIVATED",
    targetType: "StaffMember",
    targetId: staffId,
    targetLabel: staff.fullName,
  });

  revalidatePath("/admin/staff");
}
