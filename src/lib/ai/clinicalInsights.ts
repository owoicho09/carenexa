import "server-only";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { authorizedCategories } from "@/lib/tenantAccess";
import { AI_MODEL_CLINICAL, generateText, isOpenAiConfigured } from "@/lib/ai/client";
import { attachEvidence, INSIGHT_JSON_SCHEMA, parseInsightResponse } from "@/lib/ai/insightParsing";
import { CLINICAL_RULES_VERSION, deterministicFlags, describeDataGaps, type CoverageSource } from "@/lib/clinicalRules";
import type { ClinicalInsightType } from "@/generated/prisma/enums";

const PROMPT_VERSION = "clinical-insights-v2";

const SYSTEM_PROMPT = `You are a clinical decision-support assistant for clinicians. Use only the structured records provided in "evidence".
Rules:
- Do not diagnose, prescribe, recommend starting/stopping/changing medication, or claim clinical validation or accuracy.
- Every observation must cite one or more exact recordId values from "evidence". Never cite an ID that is not in "evidence".
- "ruleFlags" are deterministic flags already shown to the clinician. Do not restate them; add context, trends or patterns across encounters instead.
- Records may come from several hospitals (hospitalName). Note when a pattern spans hospitals.
- State uncertainty plainly. Prefer "may", "consider reviewing", "documented as".
- In "limitations", list information that is missing, unavailable or too sparse to support conclusions, using "dataGaps" as a starting point.
- If evidence is insufficient, return an empty observations array and explain why in limitations.
Requested insight types:
- RISK_ASSESSMENT: potential concerns for clinician review, with the evidence behind each.
- PATTERN_DETECTION: recurring or trending findings across multiple encounters, with dates.
- CLINICAL_INSIGHT: abnormal results, relevant history and possible follow-up considerations.
- LONGITUDINAL_SUMMARY: a concise history across all provided records, one observation per theme.`;

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
      for (const value of visit.vitals ?? []) add(value.id, "VITALS", visit.id, value.recordedAt, `BP ${value.systolicBp ?? "?"}/${value.diastolicBp ?? "?"}; temperature ${value.temperatureC ?? "?"} C; pulse ${value.pulseBpm ?? "?"}; respiratory rate ${value.respiratoryRate ?? "?"}; weight ${value.weightKg ?? "?"} kg.`);
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
  if (!isOpenAiConfigured()) return { error: "Clinical insights are not configured (OPENAI_API_KEY missing)." };

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
    sources: context.sources,
    ruleFlags: ruleFlags.map(({ ruleId, title }) => ({ ruleId, title })),
    dataGaps,
    evidence: context.records,
  });
  let raw: string;
  try {
    raw = await generateText({ provider: "OPENAI", model: AI_MODEL_CLINICAL, system: SYSTEM_PROMPT, prompt, maxTokens: 1600, jsonSchema: INSIGHT_JSON_SCHEMA });
  } catch {
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
      model: AI_MODEL_CLINICAL,
      provider: "OPENAI",
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
        model: AI_MODEL_CLINICAL,
        provider: "OPENAI",
        promptVersion: PROMPT_VERSION,
        requiresReview: true,
      },
      select: { id: true, title: true, summary: true, evidence: true, type: true, createdAt: true, reviewedAt: true },
    })),
  );

  return { insights, error: null };
}
