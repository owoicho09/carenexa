"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { generateHistorySummary } from "@/lib/ai/summary";
import { generateDischargeSummary, generateReferralLetter } from "@/lib/ai/documents";

export type SummaryState = { text?: string | null; error?: string; generatedAt?: string } | undefined;

export async function generateSummaryAction(_prev: SummaryState, formData: FormData): Promise<SummaryState> {
  await requireSession();
  const patientId = String(formData.get("patientId") ?? "");
  if (!patientId) return { error: "Missing patient." };

  const result = await generateHistorySummary(patientId);
  if (!result.text) return { error: result.reason ?? "Could not generate a summary." };

  revalidatePath(`/patients/${patientId}`);
  return { text: result.text, generatedAt: new Date().toISOString() };
}

export type DocumentState = { error?: string } | undefined;

export async function generateDischargeSummaryAction(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  await requireSession();
  const visitId = String(formData.get("visitId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");

  const result = await generateDischargeSummary(visitId);
  if (!result.text) return { error: result.reason ?? "Could not generate the summary." };

  revalidatePath(`/patients/${patientId}`);
  return undefined;
}

export async function generateReferralLetterAction(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  await requireSession();
  const visitId = String(formData.get("visitId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const referredTo = String(formData.get("referredTo") ?? "").trim();
  const referralReason = String(formData.get("referralReason") ?? "").trim();

  if (!referredTo || !referralReason) return { error: "Enter who this is referred to and why." };

  const result = await generateReferralLetter(visitId, referralReason, referredTo);
  if (!result.text) return { error: result.reason ?? "Could not generate the letter." };

  revalidatePath(`/patients/${patientId}`);
  return undefined;
}

export async function approveDocumentAction(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const session = await requireSession();
  const artifactId = String(formData.get("artifactId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");

  await db.aiArtifact.update({
    where: { id: artifactId },
    data: { approvedById: session.staffId, approvedAt: new Date() },
  });

  revalidatePath(`/patients/${patientId}`);
  return undefined;
}
