"use client";

import { useActionState } from "react";
import { createCardTypeAction } from "./actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewCardTypeForm() {
  const [state, formAction, pending] = useActionState(createCardTypeAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required placeholder="e.g. Staff Dependent" />
        </Field>
        <Field label="Series code" htmlFor="seriesCode" hint="2-6 letters, permanent once created.">
          <Input id="seriesCode" name="seriesCode" required placeholder="e.g. SDP" maxLength={6} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" required />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Adding…" : "Add card type"}</Button>
      </div>
    </form>
  );
}
