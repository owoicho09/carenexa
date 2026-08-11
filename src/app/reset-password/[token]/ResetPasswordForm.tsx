"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "./actions";
import { Field, Input, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, undefined);

  if (state?.success) {
    return (
      <div className="space-y-4 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--color-success)]">Password changed.</p>
        <Link href="/login" className="inline-block text-sm font-medium text-[var(--color-brand)] hover:underline">
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <input type="hidden" name="token" value={token} />
      <FormError>{state?.error}</FormError>
      <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
        <Input id="newPassword" name="newPassword" type="password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword">
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
