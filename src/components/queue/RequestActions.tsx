"use client";

import { useActionState } from "react";
import { completeRequestAction, queryRequestAction } from "@/app/(dashboard)/requests/[id]/actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function CompleteRequestForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(completeRequestAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Request marked complete");
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <FormError>{state?.error}</FormError>
      <Field label="Summary" htmlFor="outcomeSummary" hint="Optional — a short line shown in the patient's history.">
        <Input id="outcomeSummary" name="outcomeSummary" placeholder="e.g. Reviewed, no acute findings" />
      </Field>
      <Button type="submit" variant="secondary" loading={pending}>
        {pending ? "Completing…" : "Mark request complete"}
      </Button>
    </form>
  );
}

export function QueryRequestForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(queryRequestAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Query sent back");
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <FormError>{state?.error}</FormError>
      <Field label="Send back with a query" htmlFor="queryNote">
        <Textarea id="queryNote" name="queryNote" placeholder="e.g. Please confirm fasting status before glucose test" required />
      </Field>
      <Button type="submit" variant="danger" loading={pending}>
        {pending ? "Sending…" : "Query this request"}
      </Button>
    </form>
  );
}
