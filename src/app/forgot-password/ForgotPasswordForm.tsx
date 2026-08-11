"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestResetAction } from "./actions";
import { Field, Input, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestResetAction, undefined);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <FormError>{state?.error}</FormError>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required placeholder="you@carenexa.ng" />
        </Field>
        <Button type="submit" className="w-full" loading={pending}>
          {pending ? "Requesting…" : "Send reset link"}
        </Button>
      </form>

      {state?.message && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-page)] p-4 text-sm">
          <p className="text-[var(--color-text-muted)]">{state.message}</p>
          {state.resetLink && (
            <Link href={state.resetLink} className="mt-2 inline-block font-medium text-[var(--color-brand)] hover:underline">
              {state.resetLink}
            </Link>
          )}
        </div>
      )}

      <p className="text-center text-sm">
        <Link href="/login" className="text-[var(--color-brand)] hover:underline">← Back to sign in</Link>
      </p>
    </div>
  );
}
