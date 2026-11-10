"use client";

import { useActionState, useRef } from "react";
import { loginAction } from "./actions";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

export type DemoAccount = { email: string; password: string };

export function LoginForm({ demo }: { demo?: DemoAccount }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  function fillDemoAccount() {
    const form = formRef.current;
    if (!form || !demo) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = demo.email;
    (form.elements.namedItem("password") as HTMLInputElement).value = demo.password;
    form.requestSubmit();
  }

  return (
    <div className="space-y-4">
    {demo && (
      <div className="rounded-lg border border-[var(--color-brand)]/40 bg-[var(--color-brand-soft)] p-4 text-sm">
        <p className="font-semibold text-[var(--color-text)]">Presentation demo</p>
        <p className="mt-1 text-[var(--color-text-muted)]">
          One master account with access to both hospitals. Switch between them with the toggle in the header.
        </p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-xs text-[var(--color-text)]">
          <dt className="text-[var(--color-text-muted)]">Email</dt><dd>{demo.email}</dd>
          <dt className="text-[var(--color-text-muted)]">Password</dt><dd>{demo.password}</dd>
        </dl>
        <Button type="button" size="sm" className="mt-3 w-full" onClick={fillDemoAccount} loading={pending}>
          Sign in with demo account
        </Button>
      </div>
    )}
    <form ref={formRef} action={formAction} className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <FormError>{state?.error}</FormError>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required placeholder="you@carenexa.cloud" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
    </div>
  );
}
