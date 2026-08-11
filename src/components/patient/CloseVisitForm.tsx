"use client";

import { useActionState } from "react";
import { closeVisitAction } from "@/app/(dashboard)/patients/[id]/actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function CloseVisitForm({ visitId }: { visitId: string }) {
  const [state, formAction, pending] = useActionState(closeVisitAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Visit closed");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="visitId" value={visitId} />
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Follow-up date" htmlFor="followUpDate" hint="Optional">
          <Input id="followUpDate" name="followUpDate" type="date" />
        </Field>
      </div>
      <Field label="Follow-up note" htmlFor="followUpNote" hint="Optional">
        <Textarea id="followUpNote" name="followUpNote" placeholder="e.g. Return in 2 weeks for BP review" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" loading={pending}>
          {pending ? "Closing…" : "Close visit"}
        </Button>
      </div>
    </form>
  );
}
