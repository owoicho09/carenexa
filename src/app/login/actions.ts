"use server";

import { redirect } from "next/navigation";
import { createSession, verifyCredentials, homeRoute } from "@/lib/auth";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const staff = await verifyCredentials(email, password);
  if (!staff) {
    return { error: "That email and password combination doesn't match our records." };
  }

  const session = {
    staffId: staff.id,
    fullName: staff.fullName,
    role: staff.role,
    departmentId: staff.departmentId,
    departmentSlug: staff.department?.slug ?? null,
  };
  await createSession(session);

  redirect(homeRoute(session));
}
