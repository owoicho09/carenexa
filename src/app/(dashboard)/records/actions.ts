"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { issueHospitalNumber } from "@/lib/hospitalNumber";
import { requireSession } from "@/lib/auth";
import type { Genotype, Sex } from "@/generated/prisma/enums";

export type RegisterState = { error?: string } | undefined;

export async function registerPatientAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const session = await requireSession();

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

  if (!fullName || !dateOfBirth || !sex || !phone || !address || !nextOfKinName || !nextOfKinPhone || !nextOfKinRelation || !cardTypeId) {
    return { error: "Fill in every required field before registering the patient." };
  }

  const hospitalNumber = await issueHospitalNumber(cardTypeId);

  const allergies = allergiesRaw
    ? allergiesRaw.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  const patient = await db.patient.create({
    data: {
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
      visits: {
        create: {
          openedById: session.staffId,
          presentingComplaint: presentingComplaint || null,
        },
      },
    },
  });

  redirect(`/patients/${patient.id}`);
}
