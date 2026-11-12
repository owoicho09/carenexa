import "server-only";
import { db } from "@/lib/db";
import { generateText, AI_MODEL_REASONING, isAiConfigured } from "@/lib/ai/client";

async function loadVisitContext(visitId: string, hospitalId: string) {
  return db.visit.findUnique({
    where: { id: visitId, hospitalId },
    include: {
      patient: true,
      vitals: true,
      labResults: true,
      diagnoses: true,
      prescriptions: true,
      notes: true,
    },
  });
}

function formatVisitForPrompt(visit: NonNullable<Awaited<ReturnType<typeof loadVisitContext>>>) {
  const p = visit.patient;
  const lines: string[] = [
    `Patient: ${p.fullName}, ${p.sex === "MALE" ? "male" : "female"}, DOB ${p.dateOfBirth.toISOString().slice(0, 10)}, hospital number ${p.hospitalNumber}.`,
    `Allergies: ${p.allergies.length ? p.allergies.join(", ") : "none known"}. Genotype ${p.genotype ?? "unknown"}.`,
    `Visit opened ${visit.openedAt.toISOString().slice(0, 10)}${visit.presentingComplaint ? `, presenting complaint: ${visit.presentingComplaint}` : ""}.`,
  ];
  for (const v of visit.vitals) {
    const bp = v.systolicBp && v.diastolicBp ? `BP ${v.systolicBp}/${v.diastolicBp}` : null;
    lines.push(`Vitals: ${[bp, v.temperatureC ? `Temp ${v.temperatureC}C` : null, v.pulseBpm ? `Pulse ${v.pulseBpm}` : null, v.respiratoryRate ? `RR ${v.respiratoryRate}` : null, v.weightKg ? `Weight ${v.weightKg}kg` : null].filter(Boolean).join(", ")}`);
  }
  for (const l of visit.labResults) {
    lines.push(`Lab: ${l.testName} = ${l.resultType === "NUMERIC" ? `${l.value}${l.unit}` : l.qualitativeValue}${l.isAbnormal ? " (abnormal)" : ""}`);
  }
  for (const d of visit.diagnoses) lines.push(`Diagnosis: ${d.description}. Plan: ${d.plan}`);
  for (const p2 of visit.prescriptions) lines.push(`Medication: ${p2.drugName} ${p2.dosage} ${p2.frequency} for ${p2.duration}`);
  for (const n of visit.notes) lines.push(`Clinical note: ${n.content}`);
  return lines.join("\n");
}

async function generateDocument(visitId: string, hospitalId: string, actorId: string, type: "DISCHARGE_SUMMARY" | "REFERRAL_LETTER", system: string, extraPrompt = "") {
  if (!isAiConfigured()) return { text: null, reason: "AI is not configured (ANTHROPIC_API_KEY missing)." as const };

  const visit = await loadVisitContext(visitId, hospitalId);
  if (!visit) return { text: null, reason: "Visit not found." as const };

  const prompt = `${formatVisitForPrompt(visit)}${extraPrompt ? `\n\n${extraPrompt}` : ""}`;
  const text = await generateText({ model: AI_MODEL_REASONING, system, prompt, maxTokens: 1200 });

  const artifact = await db.aiArtifact.create({
    data: {
      hospitalId,
      type,
      visitId,
      model: AI_MODEL_REASONING,
      provider: "ANTHROPIC",
      generatedById: actorId,
      promptVersion: type === "DISCHARGE_SUMMARY" ? "discharge-summary-v1" : "referral-letter-v1",
      input: { prompt },
      output: { text },
      requiresApproval: true,
    },
  });

  return { text, artifactId: artifact.id, reason: null };
}

export async function generateDischargeSummary(visitId: string, hospitalId: string, actorId: string) {
  return generateDocument(
    visitId,
    hospitalId,
    actorId,
    "DISCHARGE_SUMMARY",
    `You write a discharge summary from a hospital visit record for the patient's file and for their own
copy. Only state what's in the record — no invented findings, no new instructions beyond what was recorded.
Plain prose, organised as: reason for visit, what was found, what was done, medications, follow-up. This
draft will be reviewed and approved by a clinician before it's issued.`
  );
}

export async function generateReferralLetter(visitId: string, hospitalId: string, actorId: string, referralReason: string, referredTo: string) {
  return generateDocument(
    visitId,
    hospitalId,
    actorId,
    "REFERRAL_LETTER",
    `You write a referral letter from one clinician to another (or to another facility), based on a hospital
visit record. Formal letter tone, addressed generically ("Dear Colleague") unless a name is given. Only state
what's in the record plus the stated reason for referral — no invented findings. Include: brief history,
relevant findings/results, current medications, and the specific reason for referral. This draft will be
reviewed and approved by a clinician before it's sent.`,
    `Referring to: ${referredTo}\nReason for referral: ${referralReason}`
  );
}
