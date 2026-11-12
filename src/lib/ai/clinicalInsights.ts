import "server-only";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { authorizedCategories } from "@/lib/tenantAccess";
import { AI_MODEL_CLINICAL, AI_MODEL_REASONING, generateText, isAiConfigured, isOpenAiConfigured, type AiProvider } from "@/lib/ai/client";
import { attachEvidence, INSIGHT_JSON_SCHEMA, parseInsightResponse } from "@/lib/ai/insightParsing";
import { CLINICAL_RULES_VERSION, deterministicFlags, describeDataGaps, type CoverageSource } from "@/lib/clinicalRules";
import type { ClinicalInsightType } from "@/generated/prisma/enums";

const PROMPT_VERSION = "clinical-insights-v3";

const SYSTEM_PROMPT = `You are CareNexa Clinical Insights, an expert clinical decision-support assistant working for a busy clinician in a Nigerian hospital. Think like an experienced consultant physician reviewing the chart before a ward round: notice what matters, connect findings across visits, and surface it crisply. Use ONLY the structured records in "evidence".

How to analyse:
- Read every record. Compute the patient's age from date of birth and "today". Build a timeline across visits and hospitals.
- Interpret values against standard adult reference ranges (adjust for age and sex where relevant). Examples: BP >=140/90 elevated, >=180/120 severely elevated; temperature >=38.0 C febrile; pulse >100 tachycardic, <50 bradycardic; respiratory rate >20 raised; BMI from weight and height when both exist; fasting glucose >=7.0 mmol/L or random >=11.1 mmol/L raised; HbA1c >=6.5%; haemoglobin low if <12 g/dL (female) or <13 g/dL (male); creatinine/eGFR, potassium, sodium, liver enzymes, WBC and platelets against usual ranges. Respect the unit given in the record.
- Look for: values trending in the wrong direction across encounters (quote the actual numbers and dates, e.g. "BP rose from 132/84 on 3 Feb to 158/98 on 9 Jun"); recurrent complaints; abnormal results without a documented follow-up; missed or overdue follow-up dates; medications that may conflict with a recorded allergy, genotype (e.g. SS/SC) or another active medication; medicines prescribed but not dispensed; combinations of risk factors (e.g. raised BP + raised glucose + weight gain); conditions common in Nigeria such as recurrent malaria, sickle cell disease, hypertension, diabetes and typhoid.
- Prioritise. Order observations from most to least clinically important. Lead with anything that may need attention today.

How to write:
- "title": a short, specific clinical headline starting with a priority tag "[High]", "[Moderate]" or "[Low]", e.g. "[High] Blood pressure rising across last 3 visits". Never vague titles like "Vitals observation".
- "summary": 2-4 sentences in plain clinical English. State what the records show with concrete values and dates, why it matters, and what a clinician might consider reviewing ("consider repeating", "worth confirming", "may warrant review of"). No filler.
- Return 3-6 high-quality observations when the evidence supports it; fewer when it does not. Quality over quantity, never pad.
- Every observation must cite the exact recordId values it relies on from "evidence". Never cite an ID that is not in "evidence".
- "ruleFlags" are simple automatic flags already shown to the clinician. Do not merely restate them; add the context, trend or connection they miss.
- If records come from several hospitals (hospitalName), say when a pattern spans hospitals.

Safety boundaries (non-negotiable):
- Do not state a definitive diagnosis, do not prescribe, and do not tell the clinician to start, stop or change a specific drug or dose. You may say a finding "may warrant review" of a medication or plan.
- Do not invent data or claim certainty the record cannot support.
- In "limitations", list concrete missing or sparse information that would change the picture (use "dataGaps" as a starting point), e.g. "No HbA1c recorded", "Only one BP reading available".

Requested insight types:
- RISK_ASSESSMENT: the most important potential risks for this patient right now, each with the supporting evidence and why it matters.
- PATTERN_DETECTION: recurring or trending findings across multiple encounters, with the dates and values that form the pattern.
- CLINICAL_INSIGHT: the key things a clinician should notice before seeing this patient: abnormal results, unaddressed issues, safety concerns, follow-up gaps.
- LONGITUDINAL_SUMMARY: a concise history across all records, one observation per clinical theme (e.g. cardiovascular, infections, medications, follow-up adherence).`;

const PATIENT_RECORD_INCLUDE = {
  visits: {
    orderBy: { openedAt: "asc" as const },
    include: {
      vitals: true,
      labResults: true,
      diagnoses: true,
      prescriptions: true,
      notes: true,
    },
  },
};

type EvidenceRecord = {
  recordId: string;
  recordType: string;
  hospitalId: string;
  hospitalName: string;
  visitId: string | null;
  recordedAt: string;
  fact: string;
};

function recordsForPatient(
  patient: NonNullable<Awaited<ReturnType<typeof loadPatient>>>,
  hospitalName: string,
  categories?: Set<string>,
): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  const allowAll = !categories;
  const allow = (category: string) => allowAll || categories?.has(category) === true;
  const add = (recordId: string, recordType: string, visitId: string | null, recordedAt: Date, fact: string) => {
    records.push({ recordId, recordType, hospitalId: patient.hospitalId, hospitalName, visitId, recordedAt: recordedAt.toISOString(), fact });
  };

  if (allow("DEMOGRAPHICS")) {
    add(patient.id, "PATIENT", null, patient.registeredAt, `Name ${patient.fullName}; date of birth ${patient.dateOfBirth.toISOString().slice(0, 10)}; sex ${patient.sex}; blood group ${patient.bloodGroup ?? "unknown"}; genotype ${patient.genotype ?? "unknown"}; allergies ${patient.allergies.join(", ") || "none recorded"}.`);
  }

  for (const visit of patient.visits) {
    if (allow("VISITS")) {
      add(visit.id, "VISIT", visit.id, visit.openedAt, `Visit ${visit.status}; presenting complaint ${visit.presentingComplaint ?? "not recorded"}; follow-up ${visit.followUpDate?.toISOString().slice(0, 10) ?? "not recorded"}.`);
    }
    if (allow("VITALS")) {
      for (const value of visit.vitals ?? []) add(value.id, "VITALS", visit.id, value.recordedAt, `BP ${value.systolicBp ?? "?"}/${value.diastolicBp ?? "?"}; temperature ${value.temperatureC ?? "?"} C; pulse ${value.pulseBpm ?? "?"}; respiratory rate ${value.respiratoryRate ?? "?"}; weight ${value.weightKg ?? "?"} kg; height ${value.heightCm ?? "?"} cm.`);
    }
    if (allow("LAB_RESULTS")) {
      for (const value of visit.labResults ?? []) add(value.id, "LAB_RESULT", visit.id, value.enteredAt, `${value.testName}: ${value.resultType === "NUMERIC" ? `${value.value} ${value.unit}` : value.qualitativeValue}; abnormal flag ${value.isAbnormal}.`);
    }
    if (allow("DIAGNOSES")) {
      for (const value of visit.diagnoses ?? []) add(value.id, "DIAGNOSIS", visit.id, value.createdAt, `${value.description}; documented plan: ${value.plan}.`);
    }
    if (allow("PRESCRIPTIONS")) {
      for (const value of visit.prescriptions ?? []) add(value.id, "PRESCRIPTION", visit.id, value.createdAt, `${value.drugName}, ${value.dosage}, ${value.frequency}, ${value.duration}; status ${value.status}.`);
    }
    if (allow("CLINICAL_NOTES")) {
      for (const value of visit.notes ?? []) add(value.id, "CLINICAL_NOTE", visit.id, value.createdAt, value.content);
    }
  }

  return records;
}

async function loadPatient(patientId: string, hospitalId: string) {
  return db.patient.findFirst({
    where: { id: patientId, hospitalId, isDeleted: false },
    include: PATIENT_RECORD_INCLUDE,
  });
}

async function loadAuthorizedEvidence(patientId: string, hospitalId: string) {
  const patient = await loadPatient(patientId, hospitalId);
  if (!patient) return null;

  const hospital = await db.hospital.findUnique({ where: { id: hospitalId }, select: { name: true } });
  if (!hospital) return null;

  const records = recordsForPatient(patient, hospital.name);
  const sources: CoverageSource[] = [{ hospitalName: hospital.name, local: true, categories: ["DEMOGRAPHICS", "VISITS", "VITALS", "LAB_RESULTS", "DIAGNOSES", "PRESCRIPTIONS", "CLINICAL_NOTES"] }];
  const link = await db.patientHospitalLink.findFirst({
    where: { patientId, hospitalId, verificationStatus: "VERIFIED" },
    include: { identity: true },
  });
  if (!link) return { patient, identityId: null, identityVerifiedHere: false, records, sources };

  const inPersonVerification = await db.patientIdentityVerification.findFirst({
    where: { identityId: link.identityId, hospitalId, patientId, status: "VERIFIED", revokedAt: null },
  });
  if (!inPersonVerification) return { patient, identityId: link.identityId, identityVerifiedHere: false, records, sources };

  const now = new Date();
  const otherLinks = await db.patientHospitalLink.findMany({
    where: { identityId: link.identityId, hospitalId: { not: hospitalId }, verificationStatus: "VERIFIED" },
    include: { hospital: { select: { name: true } } },
  });

  for (const otherLink of otherLinks) {
    const [grants, emergencyEvents] = await Promise.all([
      db.patientAccessGrant.findMany({
        where: {
          identityId: link.identityId,
          sourceHospitalId: otherLink.hospitalId,
          receivingHospitalId: hospitalId,
          status: "ACTIVE",
          authorizedAt: { not: null },
          revokedAt: null,
          AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
        },
      }),
      db.emergencyAccessEvent.findMany({
        where: {
          identityId: link.identityId,
          sourceHospitalId: otherLink.hospitalId,
          accessingHospitalId: hospitalId,
          endedAt: null,
          expiresAt: { gt: now },
        },
      }),
    ]);
    // The DB filter narrows; the pure rule is the authority (and is unit-tested).
    const categories = authorizedCategories({ receivingIdentityVerified: true, grants, emergencyEvents, now });
    if (categories.size === 0) continue;
    const remotePatient = await db.patient.findFirst({
      where: { id: otherLink.patientId, hospitalId: otherLink.hospitalId, isDeleted: false },
      include: {
        visits: {
          orderBy: { openedAt: "asc" },
          include: {
            vitals: categories.has("VITALS"),
            labResults: categories.has("LAB_RESULTS"),
            diagnoses: categories.has("DIAGNOSES"),
            prescriptions: categories.has("PRESCRIPTIONS"),
            notes: categories.has("CLINICAL_NOTES"),
          },
        },
      },
    });
    if (remotePatient) {
      records.push(...recordsForPatient(remotePatient as typeof patient, otherLink.hospital.name, categories));
      sources.push({ hospitalName: otherLink.hospital.name, local: false, categories: [...categories] });
    }
  }

  return { patient, identityId: link.identityId, identityVerifiedHere: true, records, sources };
}

export type SharedRecord = EvidenceRecord;

// Records from other hospitals that this hospital may currently see for the
// patient: requires local in-person identity verification AND an active,
// unexpired patient grant (or a recorded emergency access event). Same checks
// the AI context uses, so the UI never shows more than the AI could read.
export async function loadSharedRecordsForPatient(patientId: string, hospitalId: string, actorId: string) {
  const context = await loadAuthorizedEvidence(patientId, hospitalId);
  if (!context) return { identityId: null, records: [] as SharedRecord[], sources: [] as CoverageSource[] };
  const records = context.records.filter((record) => record.hospitalId !== hospitalId);
  if (records.length) {
    await logAudit({
      hospitalId,
      actorId,
      action: "SHARED_RECORDS_VIEWED",
      targetType: "PatientIdentity",
      targetId: context.identityId ?? undefined,
      detail: `Patient record view; source hospitals: ${[...new Set(records.map((r) => r.hospitalName))].join(", ")}; ${records.length} records`,
    });
  }
  return { identityId: context.identityId, records, sources: context.sources };
}

export async function generateClinicalInsights(
  patientId: string,
  hospitalId: string,
  actorId: string,
  type: ClinicalInsightType,
) {
  // Prefer Claude; fall back to OpenAI if only that key is present.
  const provider: AiProvider | null = isAiConfigured() ? "ANTHROPIC" : isOpenAiConfigured() ? "OPENAI" : null;
  if (!provider) return { error: "Clinical insights are not configured (no AI API key set)." };
  const model = provider === "ANTHROPIC" ? AI_MODEL_REASONING : AI_MODEL_CLINICAL;

  const context = await loadAuthorizedEvidence(patientId, hospitalId);
  if (!context) return { error: "Patient not found in this hospital." };
  if (context.records.length === 0) return { error: "There are no structured records to analyze." };

  const externalHospitals = [...new Set(context.records.map((record) => record.hospitalId).filter((sourceId) => sourceId !== hospitalId))];
  if (externalHospitals.length) {
    await logAudit({
      hospitalId,
      actorId,
      action: "AI_CROSS_HOSPITAL_RECORDS_ACCESSED",
      targetType: "PatientIdentity",
      targetId: context.identityId ?? undefined,
      detail: `Source hospitals: ${externalHospitals.join(", ")}; insight type: ${type}`,
    });
  }

  const ruleFlags = deterministicFlags(context.patient);
  const dataGaps = describeDataGaps({ patient: context.patient, identityVerifiedHere: context.identityVerifiedHere, sources: context.sources });
  const prompt = JSON.stringify({
    requestedInsight: type,
    today: new Date().toISOString().slice(0, 10),
    sources: context.sources,
    ruleFlags: ruleFlags.map(({ ruleId, title }) => ({ ruleId, title })),
    dataGaps,
    evidence: context.records,
  });
  let raw: string;
  try {
    raw = await generateText({ provider, model, system: SYSTEM_PROMPT, prompt, maxTokens: 3000, jsonSchema: INSIGHT_JSON_SCHEMA });
  } catch (e) {
    console.error("[clinical-insights]", e);
    return { error: "The AI service could not be reached. Try again shortly." };
  }
  const parsed = parseInsightResponse(raw);
  if (!parsed) return { error: "The AI response did not match the required structured format." };
  const validObservations = attachEvidence(parsed.observations, context.records);

  await db.aiArtifact.create({
    data: {
      hospitalId,
      type: "RESULT_CONTEXT",
      visitId: context.patient.visits.at(-1)?.id,
      model,
      provider,
      generatedById: actorId,
      promptVersion: PROMPT_VERSION,
      input: { patientId, requestedInsight: type, rulesVersion: CLINICAL_RULES_VERSION, sources: context.sources, dataGaps, evidence: context.records },
      output: { observations: validObservations, limitations: parsed.limitations, droppedObservations: parsed.observations.length - validObservations.length },
      requiresApproval: true,
    },
  });

  if (validObservations.length === 0) return { insights: [], error: null };

  const insights = await db.$transaction(
    validObservations.map((observation) => db.clinicalInsight.create({
      data: {
        hospitalId,
        identityId: context.identityId,
        patientId,
        visitId: observation.evidence.find((record) => record.hospitalId === hospitalId)?.visitId ?? null,
        type,
        title: observation.title,
        summary: observation.summary,
        evidence: observation.evidence,
        model,
        provider,
        promptVersion: PROMPT_VERSION,
        requiresReview: true,
      },
      select: { id: true, title: true, summary: true, evidence: true, type: true, createdAt: true, reviewedAt: true },
    })),
  );

  return { insights, error: null };
}
