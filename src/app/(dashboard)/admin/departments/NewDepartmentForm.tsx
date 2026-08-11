"use client";

import { useActionState, useRef, useEffect } from "react";
import { createDepartmentAction } from "./actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function NewDepartmentForm() {
  const [state, formAction, pending] = useActionState(createDepartmentAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(pending, Boolean(state?.error), "Department added");

  useEffect(() => {
    if (state === undefined) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Department name" htmlFor="name">
          <Input id="name" name="name" required placeholder="e.g. Dental Clinic" />
        </Field>
        <Field label="Request types it accepts" htmlFor="acceptsRequestTypes" hint="Comma-separated. Leave blank if this department never receives requests.">
          <Input id="acceptsRequestTypes" name="acceptsRequestTypes" placeholder="Tooth Extraction, Dental Review" />
        </Field>
      </div>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" required placeholder="What this department is for." />
      </Field>
      <Field label="Outcome fields" htmlFor="resultFields" hint="Comma-separated field labels staff fill in when they complete a request here, e.g. Findings, Recommendation.">
        <Input id="resultFields" name="resultFields" placeholder="Findings, Recommendation" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {pending ? "Adding…" : "Add department"}
        </Button>
      </div>
    </form>
  );
}
