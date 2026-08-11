"use server";

import crypto from "node:crypto";
import { db } from "@/lib/db";

export type RequestResetState = { error?: string; message?: string; resetLink?: string } | undefined;

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function requestResetAction(_prev: RequestResetState, formData: FormData): Promise<RequestResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email." };

  const staff = await db.staffMember.findUnique({ where: { email } });
  // Same message either way — don't reveal whether an account exists.
  const message =
    "If that email matches an account, a reset link has been created below. (Simulated — no email provider is connected yet, so it's shown here instead of sent.)";

  if (!staff || !staff.isActive) {
    return { message };
  }

  const token = crypto.randomBytes(24).toString("base64url");
  await db.passwordResetToken.create({
    data: { staffId: staff.id, token, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  return { message, resetLink: `/reset-password/${token}` };
}
