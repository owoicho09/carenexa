import "server-only";
import { db } from "@/lib/db";
import type { StaffRole } from "@/generated/prisma/enums";

export const PERMISSIONS = [
  { key: "CAN_MANAGE_DEPARTMENTS", label: "Manage departments" },
  { key: "CAN_MANAGE_STAFF", label: "Manage staff accounts" },
  { key: "CAN_DELETE_PATIENT", label: "Delete a patient record" },
  { key: "CAN_HIRE_STAFF", label: "Hire candidates into staff" },
  { key: "CAN_MANAGE_CARD_TYPES", label: "Manage card types" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

// ADMIN always has every permission, regardless of what's stored — the table
// only governs which OTHER roles get elevated access.
export async function hasPermission(role: StaffRole, permission: PermissionKey): Promise<boolean> {
  if (role === "ADMIN") return true;
  const row = await db.rolePermission.findUnique({ where: { role_permission: { role, permission } } });
  return row?.enabled ?? false;
}
