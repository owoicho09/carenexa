import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { createRequest } from "@/lib/requests";
import { issueHospitalNumber } from "@/lib/hospitalNumber";
import { generateHistorySummary } from "@/lib/ai/summary";
import { getPendingRequestsForDepartmentSlug } from "@/lib/queues";
import { LAB_TEST_REFERENCE } from "@/lib/labReference";
import { bookAppointmentAction, sendCommunicationAction, confirmDeliveryAction } from "@/app/(dashboard)/patients/[id]/actions";
import type { SessionPayload } from "@/lib/auth";
import type { StaffRole } from "@/generated/prisma/enums";

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ToolExecutionResult = { ok: true; message: string; data?: unknown } | { ok: false; error: string };

type ToolSpec = {
  definition: ToolDefinition;
  allowedRoles: StaffRole[] | "all";
  mutating: boolean;
  // For mutating tools: a read-only human-readable preview of what will happen, shown before execution.
  describe?: (session: SessionPayload, input: Record<string, unknown>) => Promise<string>;
  run: (session: SessionPayload, input: Record<string, unknown>) => Promise<ToolExecutionResult>;
};

function str(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  return typeof v === "string" ? v : "";
}
function num(input: Record<string, unknown>, key: string): number | undefined {
  const v = input[key];
  return typeof v === "number" ? v : undefined;
}

async function findOpenVisit(patientId: string, hospitalId: string) {
  return db.visit.findFirst({ where: { patientId, hospitalId, status: "OPEN" }, include: { patient: true } });
}

const ALL_CLINICAL_ROLES: StaffRole[] = ["ADMIN", "NURSE", "CLINICIAN", "LAB_SCIENTIST", "PHARMACIST", "RECORDS_OFFICER", "RECEPTIONIST"];

export const TOOLS: ToolSpec[] = [
  // -------------------------------------------------------------------------
  // Read-only — safe to auto-execute for anyone signed in.
  // -------------------------------------------------------------------------
  {
    mutating: false,
    allowedRoles: ALL_CLINICAL_ROLES,
    definition: {
      name: "find_patient",
      description: "Search for a patient by name, phone, or hospital number. Returns matches with their id.",
      input_schema: {
        type: "object",
        properties: { query: { type: "string", description: "Name, phone, or hospital number to search for." } },
        required: ["query"],
      },
    },
    run: async (session, input) => {
      const query = str(input, "query").trim();
      if (!query) return { ok: false, error: "No search query given." };
      const patients = await db.patient.findMany({
        where: {
          hospitalId: session.hospitalId,
          isDeleted: false,
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { hospitalNumber: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        orderBy: { fullName: "asc" },
      });
      if (patients.length === 0) return { ok: true, message: `No patient found matching "${query}".` };
      return {
        ok: true,
        message: patients.map((p) => `${p.fullName} (${p.hospitalNumber}, id: ${p.id})`).join("; "),
        data: patients.map((p) => ({ id: p.id, fullName: p.fullName, hospitalNumber: p.hospitalNumber, phone: p.phone })),
      };
    },
  },
  {
    mutating: false,
    allowedRoles: "all",
    definition: {
      name: "get_my_queue",
      description: "List requests currently waiting on the signed-in person's own department.",
      input_schema: { type: "object", properties: {} },
    },
    run: async (session) => {
      if (!session.departmentSlug) return { ok: true, message: "You have no department assigned, so there's no queue to check." };
      const requests = await getPendingRequestsForDepartmentSlug(session.departmentSlug, session.hospitalId);
      if (requests.length === 0) return { ok: true, message: "Nothing is waiting on your department right now." };
      return {
        ok: true,
        message: requests
          .slice(0, 10)
          .map((r) => `${r.visit.patient.fullName} — ${r.requestType} (${r.urgency}), from ${r.fromDepartment.name}: "${r.reason}"`)
          .join("\n"),
      };
    },
  },
  {
    mutating: false,
    allowedRoles: "all",
    definition: {
      name: "get_todays_activity",
      description: "Summarise today's activity at the signed-in hospital: visits, new patients, department requests, lab results, referrals and billing. Use when asked for today's summary, activity or overview.",
      input_schema: { type: "object", properties: {} },
    },
    run: async (session) => {
      const hospitalId = session.hospitalId;
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const today = { gte: since };
      const [hospital, visitsOpened, inHospitalNow, newPatients, requestsSent, requestsDone, waiting, labResults, referralsOut, referralsIn, billsCreated, collected] = await Promise.all([
        db.hospital.findUnique({ where: { id: hospitalId }, select: { name: true } }),
        db.visit.count({ where: { hospitalId, openedAt: today } }),
        db.visit.count({ where: { hospitalId, status: "OPEN" } }),
        db.patient.count({ where: { hospitalId, registeredAt: today, isDeleted: false } }),
        db.request.count({ where: { hospitalId, createdAt: today } }),
        db.request.count({ where: { hospitalId, completedAt: today } }),
        db.request.count({ where: { hospitalId, status: { in: ["PENDING", "QUERIED"] } } }),
        db.labResult.count({ where: { enteredAt: today, visit: { hospitalId } } }),
        db.referral.count({ where: { sourceHospitalId: hospitalId, submittedAt: today } }),
        db.referral.count({ where: { destinationHospitalId: hospitalId, submittedAt: today } }),
        db.invoice.count({ where: { hospitalId, createdAt: today } }),
        db.payment.aggregate({ where: { invoice: { hospitalId }, receivedAt: today }, _sum: { amountKobo: true } }),
      ]);
      const naira = `₦${((collected._sum.amountKobo ?? 0) / 100).toLocaleString("en-NG")}`;
      return {
        ok: true,
        message: [
          `Today at ${hospital?.name ?? "this hospital"}:`,
          `${visitsOpened} visits opened, ${inHospitalNow} patients in the hospital now, ${newPatients} new patients registered.`,
          `${requestsSent} department requests sent, ${requestsDone} completed, ${waiting} still waiting.`,
          `${labResults} lab results recorded.`,
          `${referralsOut} referrals sent, ${referralsIn} received.`,
          `${billsCreated} bills created, ${naira} collected.`,
        ].join("\n"),
      };
    },
  },
  {
    mutating: false,
    allowedRoles: ALL_CLINICAL_ROLES,
    definition: {
      name: "get_patient_summary",
      description: "Get an AI-generated summary of a patient's history — conditions, medications, trends, allergies. Use the patient id from find_patient.",
      input_schema: {
        type: "object",
        properties: { patientId: { type: "string", description: "The patient's id." } },
        required: ["patientId"],
      },
    },
    run: async (session, input) => {
      const patientId = str(input, "patientId");
      const result = await generateHistorySummary(patientId, session.hospitalId, session.staffId);
      if (!result.text) return { ok: false, error: result.reason ?? "Could not generate a summary." };
      return { ok: true, message: result.text };
    },
  },

  // -------------------------------------------------------------------------
  // Mutating — proposed to the user first, executed only after confirmation.
  // -------------------------------------------------------------------------
  {
    mutating: true,
    allowedRoles: ["ADMIN", "RECORDS_OFFICER", "RECEPTIONIST"],
    definition: {
      name: "register_patient",
      description: "Register a brand-new patient and issue a hospital number. Only for patients who don't already exist — use find_patient first to check.",
      input_schema: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          dateOfBirth: { type: "string", description: "YYYY-MM-DD" },
          sex: { type: "string", enum: ["MALE", "FEMALE"] },
          phone: { type: "string" },
          address: { type: "string" },
          cardTypeSeriesCode: { type: "string", description: "e.g. GOP, PVT, ANC, CWC" },
          nextOfKinName: { type: "string" },
          nextOfKinPhone: { type: "string" },
          nextOfKinRelation: { type: "string" },
          presentingComplaint: { type: "string" },
        },
        required: ["fullName", "dateOfBirth", "sex", "phone", "address", "cardTypeSeriesCode", "nextOfKinName", "nextOfKinPhone", "nextOfKinRelation"],
      },
    },
    describe: async (_session, input) =>
      `Register ${str(input, "fullName")} (${str(input, "sex")}, DOB ${str(input, "dateOfBirth")}) under a ${str(input, "cardTypeSeriesCode")} card, and open today's visit${str(input, "presentingComplaint") ? ` for "${str(input, "presentingComplaint")}"` : ""}.`,
    run: async (session, input) => {
      const cardType = await db.cardType.findFirst({ where: { hospitalId: session.hospitalId, seriesCode: str(input, "cardTypeSeriesCode").toUpperCase() } });
      if (!cardType) return { ok: false, error: `No card type with series code "${str(input, "cardTypeSeriesCode")}".` };

      const hospitalNumber = await issueHospitalNumber(cardType.id, session.hospitalId);
      const patient = await db.patient.create({
        data: {
          hospitalId: session.hospitalId,
          fullName: str(input, "fullName"),
          dateOfBirth: new Date(str(input, "dateOfBirth")),
          sex: str(input, "sex") as "MALE" | "FEMALE",
          phone: str(input, "phone"),
          address: str(input, "address"),
          nextOfKinName: str(input, "nextOfKinName"),
          nextOfKinPhone: str(input, "nextOfKinPhone"),
          nextOfKinRelation: str(input, "nextOfKinRelation"),
          cardTypeId: cardType.id,
          hospitalNumber,
          identityLinks: {
            create: {
              hospital: { connect: { id: session.hospitalId } },
              verificationStatus: "VERIFIED",
              identity: {
                create: {
                  universalPatientNumber: `CNX-${randomUUID().replace(/-/g, "").slice(0, 20)}`,
                  verificationStatus: "VERIFIED",
                  verificationMethod: "IN_PERSON_AGENT_REGISTRATION",
                  verifiedAt: new Date(),
                },
              },
            },
          },
          visits: { create: { hospitalId: session.hospitalId, openedById: session.staffId, presentingComplaint: str(input, "presentingComplaint") || null } },
        },
      });
      const identityLink = await db.patientHospitalLink.findFirstOrThrow({ where: { patientId: patient.id, hospitalId: session.hospitalId } });
      await db.patientIdentityVerification.create({
        data: {
          identityId: identityLink.identityId,
          hospitalId: session.hospitalId,
          patientId: patient.id,
          verifiedById: session.staffId,
          status: "VERIFIED",
          method: "IN_PERSON_AGENT_REGISTRATION",
          evidenceReference: "In-person identity check during staff-assisted registration",
        },
      });
      return { ok: true, message: `Registered ${patient.fullName} as ${hospitalNumber}.`, data: { patientId: patient.id, hospitalNumber } };
    },
  },
  {
    mutating: true,
    allowedRoles: ALL_CLINICAL_ROLES,
    definition: {
      name: "open_visit",
      description: "Open a new visit for an existing patient who is here today. Fails if they already have an open visit.",
      input_schema: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          presentingComplaint: { type: "string" },
        },
        required: ["patientId"],
      },
    },
    describe: async (session, input) => {
      const patient = await db.patient.findFirst({ where: { id: str(input, "patientId"), hospitalId: session.hospitalId } });
      return `Open a new visit for ${patient?.fullName ?? "this patient"}${str(input, "presentingComplaint") ? ` — "${str(input, "presentingComplaint")}"` : ""}.`;
    },
    run: async (session, input) => {
      const patientId = str(input, "patientId");
      const existing = await db.visit.findFirst({ where: { patientId, hospitalId: session.hospitalId, status: "OPEN" } });
      if (existing) return { ok: false, error: "This patient already has an open visit." };
      const patient = await db.patient.findFirst({ where: { id: patientId, hospitalId: session.hospitalId, isDeleted: false } });
      if (!patient) return { ok: false, error: "Patient not found in this hospital." };
      await db.visit.create({
        data: { hospitalId: session.hospitalId, patientId, openedById: session.staffId, presentingComplaint: str(input, "presentingComplaint") || null },
      });
      return { ok: true, message: "Visit opened." };
    },
  },
  {
    mutating: true,
    allowedRoles: ["NURSE", "ADMIN"],
    definition: {
      name: "record_vitals",
      description: "Record vitals for a patient's open visit.",
      input_schema: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          systolicBp: { type: "number" },
          diastolicBp: { type: "number" },
          temperatureC: { type: "number" },
          pulseBpm: { type: "number" },
          respiratoryRate: { type: "number" },
          weightKg: { type: "number" },
        },
        required: ["patientId"],
      },
    },
    describe: async (session, input) => {
      const patient = await db.patient.findFirst({ where: { id: str(input, "patientId"), hospitalId: session.hospitalId } });
      const bits = [
        num(input, "systolicBp") && num(input, "diastolicBp") ? `BP ${num(input, "systolicBp")}/${num(input, "diastolicBp")}` : null,
        num(input, "temperatureC") ? `Temp ${num(input, "temperatureC")}°C` : null,
        num(input, "pulseBpm") ? `Pulse ${num(input, "pulseBpm")}bpm` : null,
      ].filter(Boolean);
      return `Record vitals for ${patient?.fullName ?? "this patient"}: ${bits.join(", ") || "no values given"}.`;
    },
    run: async (session, input) => {
      const patientId = str(input, "patientId");
      const visit = await findOpenVisit(patientId, session.hospitalId);
      if (!visit) return { ok: false, error: "This patient has no open visit." };
      await db.vitalsRecord.create({
        data: {
          visitId: visit.id,
          recordedById: session.staffId,
          systolicBp: num(input, "systolicBp") ?? null,
          diastolicBp: num(input, "diastolicBp") ?? null,
          temperatureC: num(input, "temperatureC") ?? null,
          pulseBpm: num(input, "pulseBpm") ?? null,
          respiratoryRate: num(input, "respiratoryRate") ?? null,
          weightKg: num(input, "weightKg") ?? null,
        },
      });
      return { ok: true, message: `Vitals recorded for ${visit.patient.fullName}.` };
    },
  },
  {
    mutating: true,
    allowedRoles: ALL_CLINICAL_ROLES,
    definition: {
      name: "send_to_department",
      description: "Send a patient's open visit to any department, with a request type, reason, and urgency.",
      input_schema: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          toDepartmentSlug: { type: "string", description: "e.g. lab, clinician, pharmacy, nursing, radiology" },
          requestType: { type: "string" },
          reason: { type: "string" },
          urgency: { type: "string", enum: ["ROUTINE", "URGENT", "EMERGENCY"] },
        },
        required: ["patientId", "toDepartmentSlug", "requestType", "reason"],
      },
    },
    describe: async (session, input) => {
      const patient = await db.patient.findFirst({ where: { id: str(input, "patientId"), hospitalId: session.hospitalId } });
      const dept = await db.department.findFirst({ where: { slug: str(input, "toDepartmentSlug"), hospitalId: session.hospitalId, isArchived: false } });
      return `Send ${patient?.fullName ?? "this patient"} to ${dept?.name ?? str(input, "toDepartmentSlug")} for "${str(input, "requestType")}" — ${str(input, "reason")}.`;
    },
    run: async (session, input) => {
      if (!session.departmentId) return { ok: false, error: "Your account has no department, so it can't send requests." };
      const patientId = str(input, "patientId");
      const visit = await findOpenVisit(patientId, session.hospitalId);
      if (!visit) return { ok: false, error: "This patient has no open visit." };
      const toDepartment = await db.department.findFirst({ where: { slug: str(input, "toDepartmentSlug"), hospitalId: session.hospitalId, isArchived: false } });
      if (!toDepartment) return { ok: false, error: `No department with slug "${str(input, "toDepartmentSlug")}".` };

      await createRequest({
          hospitalId: session.hospitalId,
        visitId: visit.id,
        fromDepartmentId: session.departmentId,
        toDepartmentId: toDepartment.id,
        requestedById: session.staffId,
        requestType: str(input, "requestType"),
        reason: str(input, "reason"),
        urgency: (str(input, "urgency") || "ROUTINE") as "ROUTINE" | "URGENT" | "EMERGENCY",
      });
      return { ok: true, message: `Sent ${visit.patient.fullName} to ${toDepartment.name}.` };
    },
  },
  {
    mutating: true,
    allowedRoles: ["LAB_SCIENTIST", "ADMIN"],
    definition: {
      name: "record_lab_result",
      description: "Record a lab result for a patient's open visit. Numeric tests are auto-flagged abnormal against reference ranges; for qualitative tests (Malaria Parasite, Widal Test, HIV Screening, Genotype), pass the qualitative result as the value.",
      input_schema: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          testName: { type: "string", description: "e.g. Hemoglobin, Fasting Blood Glucose, Malaria Parasite" },
          value: { type: "string", description: "Numeric value as a string, or the qualitative result text." },
        },
        required: ["patientId", "testName", "value"],
      },
    },
    describe: async (session, input) => {
      const patient = await db.patient.findFirst({ where: { id: str(input, "patientId"), hospitalId: session.hospitalId } });
      return `Record ${str(input, "testName")} = ${str(input, "value")} for ${patient?.fullName ?? "this patient"}.`;
    },
    run: async (session, input) => {
      const patientId = str(input, "patientId");
      const visit = await findOpenVisit(patientId, session.hospitalId);
      if (!visit) return { ok: false, error: "This patient has no open visit." };
      const testName = str(input, "testName");
      const rawValue = str(input, "value");
      const ref = LAB_TEST_REFERENCE[testName];

      if (ref?.kind === "QUALITATIVE") {
        await db.labResult.create({
          data: {
            visitId: visit.id,
            enteredById: session.staffId,
            testName,
            resultType: "QUALITATIVE",
            qualitativeValue: rawValue,
            unit: "",
            isAbnormal: ref.abnormalValues.includes(rawValue),
          },
        });
      } else {
        const value = Number(rawValue);
        if (Number.isNaN(value)) return { ok: false, error: "That test needs a numeric value." };
        const referenceLow = ref?.low ?? null;
        const referenceHigh = ref?.high ?? null;
        const isAbnormal = referenceLow !== null && referenceHigh !== null ? value < referenceLow || value > referenceHigh : false;
        await db.labResult.create({
          data: {
            visitId: visit.id,
            enteredById: session.staffId,
            testName,
            resultType: "NUMERIC",
            value,
            unit: ref?.unit ?? "",
            referenceLow,
            referenceHigh,
            isAbnormal,
          },
        });
      }
      return { ok: true, message: `${testName} recorded for ${visit.patient.fullName}.` };
    },
  },
  {
    mutating: true,
    allowedRoles: ["PHARMACIST", "ADMIN"],
    definition: {
      name: "dispense_prescription",
      description: "Dispense a pending prescription for a patient's open visit. Matches by drug name against pending prescriptions.",
      input_schema: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          drugName: { type: "string" },
          quantity: { type: "string" },
        },
        required: ["patientId", "drugName", "quantity"],
      },
    },
    describe: async (session, input) => {
      const patient = await db.patient.findFirst({ where: { id: str(input, "patientId"), hospitalId: session.hospitalId } });
      return `Dispense ${str(input, "drugName")} (${str(input, "quantity")}) to ${patient?.fullName ?? "this patient"}.`;
    },
    run: async (session, input) => {
      const patientId = str(input, "patientId");
      const visit = await findOpenVisit(patientId, session.hospitalId);
      if (!visit) return { ok: false, error: "This patient has no open visit." };
      const prescription = await db.prescription.findFirst({
        where: { visitId: visit.id, status: "PENDING", drugName: { contains: str(input, "drugName"), mode: "insensitive" } },
      });
      if (!prescription) return { ok: false, error: `No pending prescription matching "${str(input, "drugName")}" for this patient.` };

      await db.$transaction([
        db.dispensation.create({ data: { prescriptionId: prescription.id, dispensedById: session.staffId, quantity: str(input, "quantity") } }),
        db.prescription.update({ where: { id: prescription.id }, data: { status: "DISPENSED" } }),
      ]);
      return { ok: true, message: `Dispensed ${prescription.drugName} to ${visit.patient.fullName}.` };
    },
  },
  {
    mutating: true,
    allowedRoles: ["ADMIN", "RECORDS_OFFICER", "RECEPTIONIST", "NURSE", "CLINICIAN"],
    definition: {
      name: "book_appointment",
      description: "Book a follow-up appointment for a patient.",
      input_schema: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          scheduledFor: { type: "string", description: "ISO datetime, e.g. 2026-08-20T10:00" },
          reason: { type: "string" },
        },
        required: ["patientId", "scheduledFor", "reason"],
      },
    },
    describe: async (session, input) => {
      const patient = await db.patient.findFirst({ where: { id: str(input, "patientId"), hospitalId: session.hospitalId } });
      return `Book an appointment for ${patient?.fullName ?? "this patient"} on ${str(input, "scheduledFor")} — ${str(input, "reason")}.`;
    },
    run: async (session, input) => {
      const formData = new FormData();
      formData.set("patientId", str(input, "patientId"));
      formData.set("scheduledFor", str(input, "scheduledFor"));
      formData.set("reason", str(input, "reason"));
      const result = await bookAppointmentAction(undefined, formData);
      if (result?.error) return { ok: false, error: result.error };
      return { ok: true, message: "Appointment booked." };
    },
  },
  {
    mutating: true,
    allowedRoles: ["ADMIN", "RECORDS_OFFICER", "RECEPTIONIST", "NURSE", "CLINICIAN"],
    definition: {
      name: "send_message",
      description: "Draft and send a WhatsApp or email message to a patient. Write the full message body yourself.",
      input_schema: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          channel: { type: "string", enum: ["WHATSAPP", "EMAIL"] },
          subject: { type: "string", description: "Required for EMAIL." },
          body: { type: "string" },
        },
        required: ["patientId", "channel", "body"],
      },
    },
    describe: async (session, input) => {
      const patient = await db.patient.findFirst({ where: { id: str(input, "patientId"), hospitalId: session.hospitalId } });
      return `Send ${patient?.fullName ?? "this patient"} a ${str(input, "channel") === "EMAIL" ? "email" : "WhatsApp message"}: "${str(input, "body")}"`;
    },
    run: async (_session, input) => {
      const formData = new FormData();
      formData.set("patientId", str(input, "patientId"));
      formData.set("channel", str(input, "channel"));
      formData.set("subject", str(input, "subject"));
      formData.set("body", str(input, "body"));
      const result = await sendCommunicationAction(undefined, formData);
      if (result?.error) return { ok: false, error: result.error };
      if (result?.communicationId) await confirmDeliveryAction(result.communicationId);
      return { ok: true, message: "Message sent and delivered." };
    },
  },
];

export function toolsForRole(role: StaffRole): ToolSpec[] {
  return TOOLS.filter((t) => t.allowedRoles === "all" || t.allowedRoles.includes(role));
}

export function findTool(name: string): ToolSpec | undefined {
  return TOOLS.find((t) => t.definition.name === name);
}
