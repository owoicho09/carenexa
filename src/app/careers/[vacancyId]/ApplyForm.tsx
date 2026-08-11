"use client";

import { useActionState } from "react";
import { submitApplicationAction } from "../actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export function ApplyForm({ vacancyId }: { vacancyId: string }) {
  const [state, formAction, pending] = useActionState(submitApplicationAction, undefined);

  if (state?.success) {
    return (
      <Panel className="border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-5">
        <p className="text-sm font-medium text-[var(--color-success)]">Application received — thank you.</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">The hospital&rsquo;s recruitment team will be in touch if you&rsquo;re shortlisted.</p>
      </Panel>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name" htmlFor="fullName"><Input id="fullName" name="fullName" required /></Field>
        <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required /></Field>
        <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" required placeholder="0803 123 4567" /></Field>
      </div>
      <Field label="CV" htmlFor="cvText" hint="Paste the text of your CV.">
        <Textarea id="cvText" name="cvText" required className="min-h-40" />
      </Field>
      <Field label="Cover note" htmlFor="coverNote" hint="Optional">
        <Textarea id="coverNote" name="coverNote" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Submitting…" : "Submit application"}</Button>
      </div>
    </form>
  );
}
