import "server-only";
import { db } from "@/lib/db";

export async function logAudit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  detail?: string;
}) {
  await db.auditLog.create({ data: input });
}
