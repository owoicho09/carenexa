"use client";

import { useActionState } from "react";
import { recordVitalsAction } from "../actions";
import { Field, Input, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function VitalsHandler({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(recordVitalsAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Vitals saved & request completed");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Systolic BP" htmlFor="systolicBp"><Input id="systolicBp" name="systolicBp" type="number" placeholder="120" /></Field>
        <Field label="Diastolic BP" htmlFor="diastolicBp"><Input id="diastolicBp" name="diastolicBp" type="number" placeholder="80" /></Field>
        <Field label="Temperature (°C)" htmlFor="temperatureC"><Input id="temperatureC" name="temperatureC" type="number" step="0.1" placeholder="36.8" /></Field>
        <Field label="Pulse (bpm)" htmlFor="pulseBpm"><Input id="pulseBpm" name="pulseBpm" type="number" placeholder="78" /></Field>
        <Field label="Respiratory rate" htmlFor="respiratoryRate"><Input id="respiratoryRate" name="respiratoryRate" type="number" placeholder="18" /></Field>
        <Field label="Weight (kg)" htmlFor="weightKg"><Input id="weightKg" name="weightKg" type="number" step="0.1" placeholder="68" /></Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Saving…" : "Save vitals & complete"}</Button>
      </div>
    </form>
  );
}
