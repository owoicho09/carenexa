"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { completeRequest, queryRequest } from "@/lib/requests";
import { LAB_TEST_REFERENCE } from "@/lib/labReference";
import { draftClinicalNote } from "@/lib/ai/noteAssist";
import { isAiConfigured } from "@/lib/ai/client";

type ActionState = { error?: string } | undefined;
type DraftState = { draft?: string; artifactId?: string; error?: string } | undefined;

async function loadRequestOrThrow(requestId: string) {
  const request = await db.request.findUnique({ where: { id: requestId }, include: { visit: true } });
  if (!request) throw new Error("Request not found");
  return request;
}

function revalidateAfter(patientId: string, requestId: string) {
  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/nursing");
  revalidatePath("/clinician");
  revalidatePath("/lab");
  revalidatePath("/pharmacy");
}

// ---------------------------------------------------------------------------
// Nursing
// ---------------------------------------------------------------------------

export async function recordVitalsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const request = await loadRequestOrThrow(requestId);

  const num = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return v ? Number(v) : null;
  };

  const systolicBp = num("systolicBp");
  const diastolicBp = num("diastolicBp");
  const temperatureC = num("temperatureC");
  const pulseBpm = num("pulseBpm");
  const respiratoryRate = num("respiratoryRate");
  const weightKg = num("weightKg");

  await db.vitalsRecord.create({
    data: {
      visitId: request.visitId,
      recordedById: session.staffId,
      systolicBp,
      diastolicBp,
      temperatureC,
      pulseBpm,
      respiratoryRate,
      weightKg,
    },
  });

  const summaryParts = [
    systolicBp && diastolicBp ? `BP ${systolicBp}/${diastolicBp}` : null,
    temperatureC ? `Temp ${temperatureC}°C` : null,
    pulseBpm ? `Pulse ${pulseBpm}bpm` : null,
  ].filter(Boolean);

  await completeRequest({
    requestId,
    fulfilledById: session.staffId,
    outcomeSummary: summaryParts.length ? summaryParts.join(", ") : "Vitals recorded",
  });

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}

// ---------------------------------------------------------------------------
// Clinician (outpatient)
// ---------------------------------------------------------------------------

export async function draftNoteFromShorthandAction(_prev: DraftState, formData: FormData): Promise<DraftState> {
  await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const shorthand = String(formData.get("shorthand") ?? "").trim();
  const request = await loadRequestOrThrow(requestId);

  if (!shorthand) return { error: "Enter your shorthand first." };
  if (!isAiConfigured()) return { error: "AI note drafting isn't configured (ANTHROPIC_API_KEY missing)." };

  const draft = await draftClinicalNote(shorthand);

  const artifact = await db.aiArtifact.create({
    data: {
      type: "NOTE_ASSISTANCE",
      visitId: request.visitId,
      model: "claude-haiku-4-5-20251001",
      input: { shorthand },
      output: { draft },
      requiresApproval: true,
    },
  });

  return { draft, artifactId: artifact.id };
}

export async function addClinicalNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const shorthand = String(formData.get("shorthand") ?? "").trim();
  const artifactId = String(formData.get("artifactId") ?? "");
  const request = await loadRequestOrThrow(requestId);

  if (!content) return { error: "Write a note before saving." };

  await db.clinicalNote.create({
    data: {
      visitId: request.visitId,
      authorId: session.staffId,
      content,
      shorthand: shorthand || null,
      isAiAssisted: Boolean(artifactId),
      signedAt: new Date(),
    },
  });

  if (artifactId) {
    await db.aiArtifact.update({
      where: { id: artifactId },
      data: { approvedById: session.staffId, approvedAt: new Date() },
    });
  }

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}

export async function addDiagnosisAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();
  const request = await loadRequestOrThrow(requestId);

  if (!description || !plan) return { error: "Enter both a diagnosis and a plan." };

  await db.diagnosis.create({
    data: { visitId: request.visitId, recordedById: session.staffId, description, plan },
  });

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}

export async function addPrescriptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const drugName = String(formData.get("drugName") ?? "").trim();
  const dosage = String(formData.get("dosage") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const duration = String(formData.get("duration") ?? "").trim();
  const request = await loadRequestOrThrow(requestId);

  if (!drugName || !dosage || !frequency || !duration) {
    return { error: "Fill in drug, dosage, frequency, and duration." };
  }

  await db.prescription.create({
    data: { visitId: request.visitId, prescribedById: session.staffId, drugName, dosage, frequency, duration },
  });

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}

// ---------------------------------------------------------------------------
// Laboratory
// ---------------------------------------------------------------------------

export async function recordLabResultAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const testName = String(formData.get("testName") ?? "").trim();
  const request = await loadRequestOrThrow(requestId);

  if (!testName) return { error: "Select a test." };

  const ref = LAB_TEST_REFERENCE[testName];

  if (ref?.kind === "QUALITATIVE") {
    const qualitativeValue = String(formData.get("qualitativeValue") ?? "").trim();
    if (!qualitativeValue) return { error: "Select a result." };
    await db.labResult.create({
      data: {
        visitId: request.visitId,
        requestId,
        enteredById: session.staffId,
        testName,
        resultType: "QUALITATIVE",
        qualitativeValue,
        unit: "",
        isAbnormal: ref.abnormalValues.includes(qualitativeValue),
      },
    });
  } else {
    const valueRaw = String(formData.get("value") ?? "").trim();
    const value = valueRaw ? Number(valueRaw) : null;
    if (value === null || Number.isNaN(value)) return { error: "Enter a numeric value." };
    const referenceLow = ref?.low ?? null;
    const referenceHigh = ref?.high ?? null;
    const unit = ref?.unit ?? String(formData.get("unit") ?? "");
    const isAbnormal = referenceLow !== null && referenceHigh !== null ? value < referenceLow || value > referenceHigh : false;

    await db.labResult.create({
      data: {
        visitId: request.visitId,
        requestId,
        enteredById: session.staffId,
        testName,
        resultType: "NUMERIC",
        value,
        unit,
        referenceLow,
        referenceHigh,
        isAbnormal,
      },
    });
  }

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}

// ---------------------------------------------------------------------------
// Pharmacy
// ---------------------------------------------------------------------------

export async function dispensePrescriptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const prescriptionId = String(formData.get("prescriptionId") ?? "");
  const quantity = String(formData.get("quantity") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const request = await loadRequestOrThrow(requestId);

  if (!quantity) return { error: "Enter the quantity dispensed." };

  await db.$transaction([
    db.dispensation.create({
      data: { prescriptionId, dispensedById: session.staffId, quantity, note: note || null },
    }),
    db.prescription.update({ where: { id: prescriptionId }, data: { status: "DISPENSED" } }),
  ]);

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}

// ---------------------------------------------------------------------------
// Shared: complete / query any request, and generic (admin-defined) outcome
// ---------------------------------------------------------------------------

export async function completeRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const outcomeSummary = String(formData.get("outcomeSummary") ?? "").trim() || undefined;
  const request = await loadRequestOrThrow(requestId);

  await completeRequest({ requestId, fulfilledById: session.staffId, outcomeSummary });

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}

export async function queryRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const queryNote = String(formData.get("queryNote") ?? "").trim();
  const request = await loadRequestOrThrow(requestId);

  if (!queryNote) return { error: "Explain what needs clarifying before sending it back." };

  await queryRequest({ requestId, fulfilledById: session.staffId, queryNote });

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}

export async function submitGenericOutcomeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const requestId = String(formData.get("requestId") ?? "");
  const fieldNamesRaw = String(formData.get("__fieldNames") ?? "");
  const fieldNames = fieldNamesRaw.split(",").filter(Boolean);
  const request = await loadRequestOrThrow(requestId);

  const outcome: Record<string, string> = {};
  for (const name of fieldNames) {
    outcome[name] = String(formData.get(name) ?? "").trim();
  }

  const summary = Object.values(outcome).filter(Boolean).join(" · ") || "Completed";

  await completeRequest({ requestId, fulfilledById: session.staffId, outcome, outcomeSummary: summary });

  const patient = await db.visit.findUniqueOrThrow({ where: { id: request.visitId } });
  revalidateAfter(patient.patientId, requestId);
  return undefined;
}
