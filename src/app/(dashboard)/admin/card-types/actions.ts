"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export type CreateCardTypeState = { error?: string } | undefined;

export async function createCardTypeAction(_prev: CreateCardTypeState, formData: FormData): Promise<CreateCardTypeState> {
  const session = await requireSession(["ADMIN"]);
  const allowed = session.role === "ADMIN" || (await hasPermission(session.role, "CAN_MANAGE_CARD_TYPES", session.hospitalId));
  if (!allowed) return { error: "Your role can't manage card types." };

  const name = String(formData.get("name") ?? "").trim();
  const seriesCode = String(formData.get("seriesCode") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !seriesCode || !description) return { error: "Fill in every field." };
  if (!/^[A-Z]{2,6}$/.test(seriesCode)) return { error: "Series code must be 2-6 letters (e.g. GOP, PVT)." };

  const existing = await db.cardType.findFirst({ where: { seriesCode, hospitalId: session.hospitalId } });
  if (existing) return { error: `Series code "${seriesCode}" is already in use.` };

  const cardType = await db.cardType.create({ data: { hospitalId: session.hospitalId, name, seriesCode, description } });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "CARD_TYPE_CREATED",
    targetType: "CardType",
    targetId: cardType.id,
    targetLabel: cardType.name,
  });

  revalidatePath("/admin/card-types");
  return undefined;
}

export type UpdateCardTypeState = { error?: string } | undefined;

export async function updateCardTypeAction(_prev: UpdateCardTypeState, formData: FormData): Promise<UpdateCardTypeState> {
  const session = await requireSession(["ADMIN"]);
  const cardTypeId = String(formData.get("cardTypeId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !description) return { error: "Fill in every field." };

  const existing = await db.cardType.findFirst({ where: { id: cardTypeId, hospitalId: session.hospitalId } });
  if (!existing) return { error: "Card type not found in this hospital." };
  const cardType = await db.cardType.update({ where: { id: existing.id }, data: { name, description } });

  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "CARD_TYPE_EDITED",
    targetType: "CardType",
    targetId: cardType.id,
    targetLabel: cardType.name,
  });

  revalidatePath("/admin/card-types");
  redirect("/admin/card-types");
}
