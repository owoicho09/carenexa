"use server";

import { redirect } from "next/navigation";
import { createSession, verifyCredentials, homeRoute } from "@/lib/auth";
import { db } from "@/lib/db";

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

  const defaultHospital = staff.isPlatformAdmin
    ? await db.hospital.findFirst({ where: { isActive: true }, orderBy: { name: "asc" } })
    : null;
  const hospitalId = staff.hospitalId ?? staff.department?.hospitalId ?? defaultHospital?.id;
  if (!hospitalId) return { error: "Your account is not assigned to a hospital." };

  const session = {
    staffId: staff.id,
    fullName: staff.fullName,
    role: staff.role,
    hospitalId,
    isPlatformAdmin: staff.isPlatformAdmin,
    departmentId: staff.departmentId,
    departmentSlug: staff.department?.slug ?? null,
  };
  await createSession(session);

  // Presentation mode: the master demo account lands on the onboarding guide.
  if (process.env.DEMO_MODE === "true" && staff.isPlatformAdmin) redirect("/guide");
  redirect(homeRoute(session));
}
