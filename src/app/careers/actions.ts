"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type ApplyState = { error?: string; success?: boolean } | undefined;

export async function submitApplicationAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const cvText = String(formData.get("cvText") ?? "").trim();
  const coverNote = String(formData.get("coverNote") ?? "").trim();

  if (!fullName || !email || !phone || !cvText) {
    return { error: "Fill in your name, email, phone, and CV text." };
  }

  const vacancy = await db.vacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy || vacancy.status !== "PUBLISHED") {
    return { error: "This vacancy is no longer accepting applications." };
  }

  const candidate = await db.candidate.create({ data: { fullName, email, phone } });
  await db.application.create({
    data: { vacancyId, candidateId: candidate.id, cvText, coverNote: coverNote || null },
  });

  revalidatePath(`/careers/${vacancyId}`);
  return { success: true };
}
