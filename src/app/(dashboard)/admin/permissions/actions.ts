"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import type { StaffRole } from "@/generated/prisma/enums";
import type { PermissionKey } from "@/lib/permissions";

export async function setRolePermissionAction(formData: FormData) {
  await requireSession(["ADMIN"]);
  const role = String(formData.get("role") ?? "") as StaffRole;
  const permission = String(formData.get("permission") ?? "") as PermissionKey;
  const enabled = formData.get("enabled") === "true";

  await db.rolePermission.upsert({
    where: { role_permission: { role, permission } },
    update: { enabled },
    create: { role, permission, enabled },
  });

  revalidatePath("/admin/permissions");
}
