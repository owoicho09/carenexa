"use client";

import { useActionState, useRef, useEffect } from "react";
import { createDepartmentAction } from "./actions";
import { Field, Input, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function NewDepartmentForm() {
  const [state, formAction, pending] = useActionState(createDepartmentAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(pending, Boolean(state?.error), "Department added");

  useEffect(() => {
    if (state?.created) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormError>{state?.error}</FormError>
      {state?.created && !pending && (
        <p role="status" className="rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-success)]">
          <span className="font-semibold">{state.created.name}</span> was added.{" "}
          <a href={`#dept-${state.created.id}`} className="font-medium underline">Show it in the list</a>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department name" htmlFor="name">
          <Input id="name" name="name" required placeholder="e.g. Radiology" />
        </Field>
        <Field label="What it does" htmlFor="description">
          <Input id="description" name="description" required placeholder="e.g. X-rays and scans" />
        </Field>
      </div>
      <Field
        label="Services patients can be sent here for (optional)"
        htmlFor="acceptsRequestTypes"
        hint="Separate with commas, e.g. X-Ray, Ultrasound. These appear when sending a patient to this department. Leave blank if patients aren't sent here."
      >
        <Input id="acceptsRequestTypes" name="acceptsRequestTypes" placeholder="X-Ray, Ultrasound" />
      </Field>
      <details className="rounded-md border border-[var(--color-border)] px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-muted)]">More options</summary>
        <div className="mt-3">
          <Field
            label="Result form fields"
            htmlFor="resultFields"
            hint="What staff fill in when they finish a request here, separated by commas, e.g. Findings, Recommendation."
          >
            <Input id="resultFields" name="resultFields" placeholder="Findings, Recommendation" />
          </Field>
        </div>
      </details>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Adding…" : "Add department"}</Button>
      </div>
    </form>
  );
}
