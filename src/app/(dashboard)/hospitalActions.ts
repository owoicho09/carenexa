"use server";

import { redirect } from "next/navigation";
import { createSession, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { switchDestination } from "@/lib/hospitalTheme";

export async function switchHospitalAction(formData: FormData) {
  const session = await requireSession();
  if (!session.isPlatformAdmin) throw new Error("Only platform administrators can switch hospitals.");

  const hospitalId = String(formData.get("hospitalId") ?? "");
  const hospital = await db.hospital.findFirst({ where: { id: hospitalId, isActive: true } });
  if (!hospital) throw new Error("Hospital is unavailable.");

  await createSession({
    ...session,
    hospitalId: hospital.id,
    departmentId: null,
    departmentSlug: null,
  });
  await logAudit({
    hospitalId: hospital.id,
    actorId: session.staffId,
    action: "PLATFORM_HOSPITAL_SWITCHED",
    targetType: "Hospital",
    targetId: hospital.id,
    targetLabel: hospital.name,
  });

  redirect(switchDestination(String(formData.get("returnTo") ?? "")));
}
