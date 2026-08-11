"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function restorePatientAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const patientId = String(formData.get("patientId") ?? "");
  const patient = await db.patient.update({ where: { id: patientId }, data: { isDeleted: false, deletedAt: null } });

  await logAudit({
    actorId: session.staffId,
    action: "PATIENT_RESTORED",
    targetType: "Patient",
    targetId: patient.id,
    targetLabel: patient.fullName,
  });

  revalidatePath("/admin/deleted-patients");
}
