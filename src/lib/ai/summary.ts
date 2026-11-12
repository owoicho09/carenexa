import "server-only";
import { db } from "@/lib/db";
import { generateText, AI_MODEL_REASONING, isAiConfigured } from "@/lib/ai/client";

const SYSTEM_PROMPT = `You are CareNexa's clinical summariser. A clinician is about to walk in to see this patient and has fifteen seconds. Brief them the way a sharp senior colleague would at handover.
Use ONLY what is in the record provided. Never diagnose, never suggest a treatment or medication change, never predict how a condition will progress, and never invent a fact. If the record is thin, say so in one sentence instead of padding.
Write 3-6 short sentences of plain prose (no headers, no bullet points, no markdown). Open with who the patient is (age, sex, key conditions). Then cover, in order of importance: active problems and current medications; anything trending the wrong way across visits (quote actual values and dates, e.g. "BP up from 130/82 in March to 156/96 today"); abnormal results; allergies and genotype where relevant; and anything overdue or left open (missed follow-up, undispensed prescription, result not acted on). Interpret values against standard adult reference ranges so the clinician immediately sees what is abnormal.`;

async function loadPatientHistory(patientId: string, hospitalId: string) {
  return db.patient.findUnique({
    where: { id: patientId, hospitalId },
    include: {
      visits: {
        orderBy: { openedAt: "asc" },
        include: { vitals: true, labResults: true, diagnoses: true, prescriptions: true, notes: true },
      },
    },
  });
}

function formatHistoryForPrompt(patient: NonNullable<Awaited<ReturnType<typeof loadPatientHistory>>>) {
  const header = `Today: ${new Date().toISOString().slice(0, 10)}. Patient: ${patient.fullName}, age ${Math.floor((Date.now() - patient.dateOfBirth.getTime()) / 31_557_600_000)}, ${patient.sex === "MALE" ? "male" : "female"}, DOB ${patient.dateOfBirth.toISOString().slice(0, 10)}. Blood group ${patient.bloodGroup ?? "unknown"}, genotype ${patient.genotype ?? "unknown"}. Allergies: ${patient.allergies.length ? patient.allergies.join(", ") : "none known"}.`;

  const visitLines = patient.visits.map((v) => {
    const date = v.openedAt.toISOString().slice(0, 10);
    const parts: string[] = [`Visit ${date} (${v.status.toLowerCase()})${v.presentingComplaint ? `: ${v.presentingComplaint}` : ""}`];
    for (const vt of v.vitals) {
      const bp = vt.systolicBp && vt.diastolicBp ? `BP ${vt.systolicBp}/${vt.diastolicBp}` : null;
      const bits = [bp, vt.temperatureC ? `Temp ${vt.temperatureC}C` : null, vt.pulseBpm ? `Pulse ${vt.pulseBpm}` : null, vt.respiratoryRate ? `RR ${vt.respiratoryRate}` : null, vt.weightKg ? `Weight ${vt.weightKg}kg` : null, vt.heightCm ? `Height ${vt.heightCm}cm` : null].filter(Boolean);
      if (bits.length) parts.push(`  Vitals: ${bits.join(", ")}`);
    }
    for (const l of v.labResults) {
      const value = l.resultType === "NUMERIC" ? `${l.value}${l.unit}` : l.qualitativeValue;
      parts.push(`  Lab: ${l.testName} = ${value}${l.isAbnormal ? " (ABNORMAL)" : ""}`);
    }
    for (const d of v.diagnoses) parts.push(`  Diagnosis: ${d.description} — plan: ${d.plan}`);
    for (const p of v.prescriptions) parts.push(`  Prescribed: ${p.drugName} ${p.dosage} ${p.frequency} for ${p.duration} (${p.status.toLowerCase()})`);
    if (v.followUpDate) parts.push(`  Follow-up due: ${v.followUpDate.toISOString().slice(0, 10)}${v.status === "OPEN" ? "" : v.followUpDate < new Date() ? " — appears overdue" : ""}`);
    return parts.join("\n");
  });

  return `${header}\n\n${visitLines.join("\n\n") || "No visits recorded yet."}`;
}

export async function generateHistorySummary(patientId: string, hospitalId: string, actorId: string) {
  if (!isAiConfigured()) {
    return { text: null, reason: "AI is not configured (ANTHROPIC_API_KEY missing)." as const };
  }

  const patient = await loadPatientHistory(patientId, hospitalId);
  if (!patient) return { text: null, reason: "Patient not found." as const };

  const latestVisit = patient.visits.at(-1);
  const promptInput = formatHistoryForPrompt(patient);

  const text = await generateText({
    model: AI_MODEL_REASONING,
    system: SYSTEM_PROMPT,
    prompt: promptInput,
    maxTokens: 700,
  });

  await db.aiArtifact.create({
    data: {
      hospitalId,
      type: "HISTORY_SUMMARY",
      visitId: latestVisit?.id,
      model: AI_MODEL_REASONING,
      provider: "ANTHROPIC",
      generatedById: actorId,
      promptVersion: "history-summary-v2",
      input: { prompt: promptInput, patientId, visitIds: patient.visits.map((visit) => visit.id) },
      output: { text },
      requiresApproval: false,
    },
  });

  return { text, reason: null };
}

export async function getLatestHistorySummary(patientId: string, hospitalId: string) {
  const artifact = await db.aiArtifact.findFirst({
    where: { hospitalId, type: "HISTORY_SUMMARY", visit: { patientId, hospitalId } },
    orderBy: { createdAt: "desc" },
  });
  if (!artifact) return null;
  const output = artifact.output as { text?: string };
  return { text: output.text ?? "", createdAt: artifact.createdAt, model: artifact.model };
}
