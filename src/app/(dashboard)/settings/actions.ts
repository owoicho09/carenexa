"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export type UpdateProfileState = { error?: string; success?: boolean } | undefined;

export async function updateProfileAction(_prev: UpdateProfileState, formData: FormData): Promise<UpdateProfileState> {
  const session = await requireSession();
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) return { error: "Name can't be empty." };

  await db.staffMember.update({ where: { id: session.staffId }, data: { fullName } });
  revalidatePath("/settings");
  return { success: true };
}

export type ChangePasswordState = { error?: string; success?: boolean } | undefined;

export async function changePasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const session = await requireSession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Fill in every field." };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation don't match." };
  }

  const staff = await db.staffMember.findUniqueOrThrow({ where: { id: session.staffId } });
  const valid = await bcrypt.compare(currentPassword, staff.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.staffMember.update({ where: { id: session.staffId }, data: { passwordHash } });
  return { success: true };
}

export async function toggleToastNotificationsAction(formData: FormData) {
  const session = await requireSession();
  const enabled = formData.get("enabled") === "true";
  await db.staffMember.update({ where: { id: session.staffId }, data: { toastNotificationsEnabled: enabled } });
  revalidatePath("/settings");
}
