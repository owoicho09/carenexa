"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { issueHospitalNumber } from "@/lib/hospitalNumber";
import { requireSession } from "@/lib/auth";
import type { Genotype, Sex } from "@/generated/prisma/enums";

export type RegisterState = { error?: string } | undefined;

export async function registerPatientAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const session = await requireSession(["ADMIN", "RECORDS_OFFICER", "RECEPTIONIST"]);

  const fullName = String(formData.get("fullName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const sex = String(formData.get("sex") ?? "") as Sex;
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const bloodGroup = String(formData.get("bloodGroup") ?? "").trim();
  const genotype = String(formData.get("genotype") ?? "") as Genotype | "";
  const allergiesRaw = String(formData.get("allergies") ?? "").trim();
  const nextOfKinName = String(formData.get("nextOfKinName") ?? "").trim();
  const nextOfKinPhone = String(formData.get("nextOfKinPhone") ?? "").trim();
  const nextOfKinRelation = String(formData.get("nextOfKinRelation") ?? "").trim();
  const cardTypeId = String(formData.get("cardTypeId") ?? "");
  const presentingComplaint = String(formData.get("presentingComplaint") ?? "").trim();
  const universalPatientNumber = String(formData.get("universalPatientNumber") ?? "").trim().toUpperCase();
  const identityEvidenceReference = String(formData.get("identityEvidenceReference") ?? "").trim();

  if (!fullName || !dateOfBirth || !sex || !phone || !address || !nextOfKinName || !nextOfKinPhone || !nextOfKinRelation || !cardTypeId) {
    return { error: "Fill in every required field before registering the patient." };
  }

  const cardType = await db.cardType.findFirst({ where: { id: cardTypeId, hospitalId: session.hospitalId } });
  if (!cardType) return { error: "Choose a valid card type for this hospital." };

  let identity = null;
  if (universalPatientNumber) {
    if (!identityEvidenceReference) return { error: "Record the in-person identity verification evidence before linking an existing identity." };
    identity = await db.careNexaIdentity.findUnique({ where: { universalPatientNumber } });
    if (!identity) return { error: "That CareNexa number could not be verified. Register this patient without linking it and contact the records administrator." };
    if (identity.verificationStatus !== "VERIFIED") return { error: "This CareNexa identity is not yet verified. Verify it in person before linking another hospital record." };
    const existingLink = await db.patientHospitalLink.findFirst({ where: { identityId: identity.id, hospitalId: session.hospitalId } });
    if (existingLink) return { error: "This CareNexa identity already has a record at this hospital." };
  }

  const hospitalNumber = await issueHospitalNumber(cardTypeId, session.hospitalId);

  const allergies = allergiesRaw
    ? allergiesRaw.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  const patient = await db.$transaction(async (tx) => {
    const createdPatient = await tx.patient.create({
      data: {
      hospitalId: session.hospitalId,
      fullName,
      dateOfBirth: new Date(dateOfBirth),
      sex,
      phone,
      address,
      bloodGroup: bloodGroup || null,
      genotype: genotype || null,
      allergies,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelation,
      cardTypeId,
      hospitalNumber,
      identityLinks: {
        create: {
          hospital: { connect: { id: session.hospitalId } },
          verificationStatus: "VERIFIED",
          identity: identity
            ? { connect: { id: identity.id } }
            : { create: { universalPatientNumber: `CNX-${randomUUID().replace(/-/g, "").slice(0, 20)}` } },
        },
      },
      visits: {
        create: {
          hospitalId: session.hospitalId,
          openedById: session.staffId,
          presentingComplaint: presentingComplaint || null,
        },
      },
      },
    });

    const patientIdentity = await tx.patientHospitalLink.findFirstOrThrow({ where: { patientId: createdPatient.id, hospitalId: session.hospitalId } });
    await tx.patientIdentityVerification.create({
      data: {
        identityId: patientIdentity.identityId,
        hospitalId: session.hospitalId,
        patientId: createdPatient.id,
        verifiedById: session.staffId,
        status: "VERIFIED",
        method: identity ? "IN_PERSON_CROSS_FACILITY_MATCH" : "IN_PERSON_REGISTRATION",
        evidenceReference: identityEvidenceReference || "In-person identity check at registration",
      },
    });

    return createdPatient;
  });

  redirect(`/patients/${patient.id}`);
}
