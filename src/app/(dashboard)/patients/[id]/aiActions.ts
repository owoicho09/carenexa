"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { generateHistorySummary } from "@/lib/ai/summary";
import { generateDischargeSummary, generateReferralLetter } from "@/lib/ai/documents";
import { generateClinicalInsights } from "@/lib/ai/clinicalInsights";
import type { ClinicalInsightType } from "@/generated/prisma/enums";

export type SummaryState = { text?: string | null; error?: string; generatedAt?: string } | undefined;

export async function generateSummaryAction(_prev: SummaryState, formData: FormData): Promise<SummaryState> {
  const session = await requireSession();
  const patientId = String(formData.get("patientId") ?? "");
  if (!patientId) return { error: "Missing patient." };

  const result = await generateHistorySummary(patientId, session.hospitalId, session.staffId);
  if (!result.text) return { error: result.reason ?? "Could not generate a summary." };

  revalidatePath(`/patients/${patientId}`);
  return { text: result.text, generatedAt: new Date().toISOString() };
}

export type DocumentState = { error?: string } | undefined;

export async function generateDischargeSummaryAction(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const visitId = String(formData.get("visitId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");

  const result = await generateDischargeSummary(visitId, session.hospitalId, session.staffId);
  if (!result.text) return { error: result.reason ?? "Could not generate the summary." };

  revalidatePath(`/patients/${patientId}`);
  return undefined;
}

export async function generateReferralLetterAction(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const visitId = String(formData.get("visitId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const referredTo = String(formData.get("referredTo") ?? "").trim();
  const referralReason = String(formData.get("referralReason") ?? "").trim();

  if (!referredTo || !referralReason) return { error: "Enter who this is referred to and why." };

  const result = await generateReferralLetter(visitId, session.hospitalId, session.staffId, referralReason, referredTo);
  if (!result.text) return { error: result.reason ?? "Could not generate the letter." };

  revalidatePath(`/patients/${patientId}`);
  return undefined;
}

export async function approveDocumentAction(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const artifactId = String(formData.get("artifactId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const artifact = await db.aiArtifact.findFirst({
    where: { id: artifactId, hospitalId: session.hospitalId, visit: { patientId, hospitalId: session.hospitalId } },
  });
  if (!artifact) return { error: "Document not found in this hospital." };

  await db.aiArtifact.update({
    where: { id: artifact.id },
    data: { approvedById: session.staffId, approvedAt: new Date() },
  });

  revalidatePath(`/patients/${patientId}`);
  return undefined;
}

export type ClinicalInsightState = { error?: string; generated?: boolean } | undefined;

export async function generateClinicalInsightsAction(_prev: ClinicalInsightState, formData: FormData): Promise<ClinicalInsightState> {
  const session = await requireSession();
  const patientId = String(formData.get("patientId") ?? "");
  const type = String(formData.get("type") ?? "CLINICAL_INSIGHT") as ClinicalInsightType;
  if (!["RISK_ASSESSMENT", "PATTERN_DETECTION", "CLINICAL_INSIGHT", "LONGITUDINAL_SUMMARY"].includes(type)) {
    return { error: "Choose a valid insight type." };
  }

  const result = await generateClinicalInsights(patientId, session.hospitalId, session.staffId, type);
  if (result.error) return { error: result.error };
  revalidatePath(`/patients/${patientId}`);
  return { generated: true };
}

export async function reviewClinicalInsightAction(formData: FormData) {
  const session = await requireSession(["ADMIN", "CLINICIAN"]);
  const insightId = String(formData.get("insightId") ?? "");
  const insight = await db.clinicalInsight.findFirst({ where: { id: insightId, hospitalId: session.hospitalId } });
  if (!insight) return;

  await db.clinicalInsight.update({
    where: { id: insight.id },
    data: { requiresReview: false, reviewedById: session.staffId, reviewedAt: new Date() },
  });
  revalidatePath(`/patients/${insight.patientId}`);
}
