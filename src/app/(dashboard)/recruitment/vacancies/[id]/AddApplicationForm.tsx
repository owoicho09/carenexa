"use client";

import { useActionState } from "react";
import { addApplicationAction } from "../../actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function AddApplicationForm({ vacancyId }: { vacancyId: string }) {
  const [state, formAction, pending] = useActionState(addApplicationAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Application added");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name" htmlFor="fullName"><Input id="fullName" name="fullName" required /></Field>
        <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required /></Field>
        <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" required placeholder="0803 123 4567" /></Field>
      </div>
      <Field label="CV text" htmlFor="cvText" hint="Paste the CV content — the AI screens this against the role's requirements.">
        <Textarea id="cvText" name="cvText" required className="min-h-40" />
      </Field>
      <Field label="Cover note" htmlFor="coverNote" hint="Optional">
        <Textarea id="coverNote" name="coverNote" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Adding…" : "Add application"}</Button>
      </div>
    </form>
  );
}
