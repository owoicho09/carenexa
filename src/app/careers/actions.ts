"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { readCvFile } from "@/lib/cvUpload";

export type ApplyState = { error?: string; success?: boolean } | undefined;

export async function submitApplicationAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const coverNote = String(formData.get("coverNote") ?? "").trim();

  if (!fullName || !email || !phone) {
    return { error: "Fill in your name, email, and phone." };
  }

  const { file, error } = await readCvFile(formData);
  if (error) return { error };

  const vacancy = await db.vacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy || vacancy.status !== "PUBLISHED") {
    return { error: "This vacancy is no longer accepting applications." };
  }

  const candidate = await db.candidate.create({ data: { fullName, email, phone } });
  await db.application.create({
    data: {
      vacancyId,
      candidateId: candidate.id,
      cvFileName: file!.name,
      cvFileMimeType: file!.mimeType,
      cvFileData: file!.data,
      coverNote: coverNote || null,
    },
  });

  revalidatePath(`/careers/${vacancyId}`);
  return { success: true };
}
