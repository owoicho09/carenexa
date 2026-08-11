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
      <Field label="CV" htmlFor="cvFile" hint="PDF or Word document, up to 5MB. PDFs are screened by AI against the role's requirements.">
        <input
          id="cvFile"
          name="cvFile"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          className="block w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-brand)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[var(--color-brand-hover)]"
        />
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
