"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

type ActionState = { error?: string } | undefined;

export async function createVacancyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession(["ADMIN", "RECRUITER"]);

  const title = String(formData.get("title") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const requirementsRaw = String(formData.get("requirements") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "Full-time");
  const location = String(formData.get("location") ?? "").trim();

  if (!title || !description || !requirementsRaw || !location) {
    return { error: "Fill in title, description, requirements, and location." };
  }

  const requirements = requirementsRaw.split("\n").map((r) => r.trim()).filter(Boolean);

  const vacancy = await db.vacancy.create({
    data: { title, departmentId, description, requirements, employmentType, location },
  });

  redirect(`/recruitment/vacancies/${vacancy.id}`);
}

export async function publishVacancyAction(formData: FormData) {
  await requireSession(["ADMIN", "RECRUITER"]);
  const vacancyId = String(formData.get("vacancyId") ?? "");
  await db.vacancy.update({ where: { id: vacancyId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  revalidatePath(`/recruitment/vacancies/${vacancyId}`);
  revalidatePath("/careers");
}

export async function closeVacancyAction(formData: FormData) {
  await requireSession(["ADMIN", "RECRUITER"]);
  const vacancyId = String(formData.get("vacancyId") ?? "");
  await db.vacancy.update({ where: { id: vacancyId }, data: { status: "CLOSED", closedAt: new Date() } });
  revalidatePath(`/recruitment/vacancies/${vacancyId}`);
  revalidatePath("/careers");
}

export async function addApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession(["ADMIN", "RECRUITER"]);

  const vacancyId = String(formData.get("vacancyId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const cvText = String(formData.get("cvText") ?? "").trim();
  const coverNote = String(formData.get("coverNote") ?? "").trim();

  if (!fullName || !email || !phone || !cvText) {
    return { error: "Fill in the candidate's name, email, phone, and CV text." };
  }

  const candidate = await db.candidate.create({ data: { fullName, email, phone } });
  await db.application.create({
    data: { vacancyId, candidateId: candidate.id, cvText, coverNote: coverNote || null },
  });

  revalidatePath(`/recruitment/vacancies/${vacancyId}`);
  return undefined;
}
