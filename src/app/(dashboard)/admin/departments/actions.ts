"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type CreateDepartmentState = { error?: string; created?: { id: string; name: string } } | undefined;

export async function createDepartmentAction(
  _prevState: CreateDepartmentState,
  formData: FormData
): Promise<CreateDepartmentState> {
  const session = await requireSession(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requestTypesRaw = String(formData.get("acceptsRequestTypes") ?? "").trim();
  const resultFieldsRaw = String(formData.get("resultFields") ?? "").trim();

  if (!name || !description) {
    return { error: "Name and description are required." };
  }

  const slug = slugify(name);
  const existing = await db.department.findFirst({ where: { slug, hospitalId: session.hospitalId } });
  if (existing) {
    return { error: `A department named "${name}" already exists.` };
  }

  const acceptsRequestTypes = requestTypesRaw
    ? requestTypesRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const resultFieldLabels = resultFieldsRaw
    ? resultFieldsRaw.split(",").map((f) => f.trim()).filter(Boolean)
    : [];

  const department = await db.department.create({
    data: {
      hospitalId: session.hospitalId,
      name,
      slug,
      description,
      acceptsRequestTypes,
      resultFields: {
        fields: resultFieldLabels.map((label) => ({
          name: slugify(label).replace(/-/g, "_"),
          label,
          type: "text",
        })),
      },
    },
  });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "DEPARTMENT_CREATED",
    targetType: "Department",
    targetId: department.id,
    targetLabel: department.name,
  });

  revalidatePath("/admin/departments");
  revalidatePath("/admin");
  return { created: { id: department.id, name: department.name } };
}

export type UpdateDepartmentState = { error?: string } | undefined;

export async function updateDepartmentAction(
  _prevState: UpdateDepartmentState,
  formData: FormData
): Promise<UpdateDepartmentState> {
  const session = await requireSession(["ADMIN"]);

  const departmentId = String(formData.get("departmentId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const requestTypesRaw = String(formData.get("acceptsRequestTypes") ?? "").trim();
  const resultFieldsRaw = String(formData.get("resultFields") ?? "").trim();

  if (!description) return { error: "Description is required." };

  const acceptsRequestTypes = requestTypesRaw
    ? requestTypesRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const resultFieldLabels = resultFieldsRaw
    ? resultFieldsRaw.split(",").map((f) => f.trim()).filter(Boolean)
    : [];

  const existing = await db.department.findFirst({ where: { id: departmentId, hospitalId: session.hospitalId } });
  if (!existing) return { error: "Department not found in this hospital." };

  const department = await db.department.update({
    where: { id: existing.id },
    data: {
      description,
      acceptsRequestTypes,
      resultFields: {
        fields: resultFieldLabels.map((label) => ({
          name: slugify(label).replace(/-/g, "_"),
          label,
          type: "text",
        })),
      },
    },
  });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "DEPARTMENT_EDITED",
    targetType: "Department",
    targetId: department.id,
    targetLabel: department.name,
  });

  revalidatePath("/admin/departments");
  redirect("/admin/departments");
}

// Removing a department: if nothing references it, it is deleted outright;
// if it has history (staff, requests, referrals, appointments), it is archived
// instead — hidden everywhere, history intact, restorable.
export type RemoveDepartmentState = { error?: string; removed?: "deleted" | "archived" } | undefined;

export async function removeDepartmentAction(_prev: RemoveDepartmentState, formData: FormData): Promise<RemoveDepartmentState> {
  const session = await requireSession(["ADMIN"]);
  const departmentId = String(formData.get("departmentId") ?? "");
  const department = await db.department.findFirst({
    where: { id: departmentId, hospitalId: session.hospitalId, isArchived: false },
    include: {
      _count: {
        select: {
          staff: true, requestsReceived: true, requestsSent: true, referralsSent: true,
          externalReferralsReceived: true, vacancies: true, appointments: true, notifications: true,
        },
      },
    },
  });
  if (!department) return { error: "Department not found in this hospital." };
  if (department.slug === "administration") return { error: "Administration can't be removed — hospital administrators work from it." };

  const references = Object.values(department._count).reduce((sum, n) => sum + n, 0);
  if (references === 0) {
    await db.department.delete({ where: { id: department.id } });
  } else {
    await db.department.update({ where: { id: department.id }, data: { isArchived: true, archivedAt: new Date() } });
  }
  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: references === 0 ? "DEPARTMENT_DELETED" : "DEPARTMENT_ARCHIVED",
    targetType: "Department",
    targetId: department.id,
    targetLabel: department.name,
  });
  revalidatePath("/admin/departments");
  revalidatePath("/admin");
  return { removed: references === 0 ? "deleted" : "archived" };
}

export async function restoreDepartmentAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const departmentId = String(formData.get("departmentId") ?? "");
  const department = await db.department.findFirst({ where: { id: departmentId, hospitalId: session.hospitalId, isArchived: true } });
  if (!department) return;
  await db.department.update({ where: { id: department.id }, data: { isArchived: false, archivedAt: null } });
  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "DEPARTMENT_RESTORED", targetType: "Department", targetId: department.id, targetLabel: department.name });
  revalidatePath("/admin/departments");
  revalidatePath("/admin");
}
