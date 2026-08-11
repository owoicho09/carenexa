"use client";

import { useActionState, useState } from "react";
import { recordLabResultAction } from "../actions";
import { LAB_TEST_REFERENCE, suggestedTestsForRequestType } from "@/lib/labReference";
import { Field, Input, Select, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function LabResultHandler({ requestId, requestType }: { requestId: string; requestType: string }) {
  const [state, formAction, pending] = useActionState(recordLabResultAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Result added");
  const suggested = suggestedTestsForRequestType(requestType);
  const [testName, setTestName] = useState(suggested[0] ?? "");
  const ref = LAB_TEST_REFERENCE[testName];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <FormError>{state?.error}</FormError>
      <Field label="Test" htmlFor="testName">
        <Select id="testName" name="testName" value={testName} onChange={(e) => setTestName(e.target.value)}>
          {suggested.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </Field>

      {ref?.kind === "QUALITATIVE" ? (
        <Field label="Result" htmlFor="qualitativeValue">
          <Select id="qualitativeValue" name="qualitativeValue" defaultValue="">
            <option value="" disabled>Select…</option>
            {ref.options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </Select>
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Value" htmlFor="value" hint={ref ? `Reference: ${ref.low}–${ref.high} ${ref.unit}` : undefined}>
            <Input id="value" name="value" type="number" step="0.01" required />
          </Field>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Saving…" : "Add result"}</Button>
      </div>
    </form>
  );
}
