"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type CreateDepartmentState = { error?: string } | undefined;

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
  return undefined;
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
