"use client";

import { useActionState } from "react";
import { submitGenericOutcomeAction } from "../actions";
import { Field, Input, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

type ResultField = { name: string; label: string; type: string };

export function GenericOutcomeHandler({ requestId, fields }: { requestId: string; fields: ResultField[] }) {
  const [state, formAction, pending] = useActionState(submitGenericOutcomeAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Request completed");

  if (fields.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">This department has no outcome fields configured yet — an administrator can add some under Departments.</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="__fieldNames" value={fields.map((f) => f.name).join(",")} />
      <FormError>{state?.error}</FormError>
      {fields.map((f) => (
        <Field key={f.name} label={f.label} htmlFor={f.name}>
          <Input id={f.name} name={f.name} type={f.type === "number" ? "number" : "text"} />
        </Field>
      ))}
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Saving…" : "Complete request"}</Button>
      </div>
    </form>
  );
}
