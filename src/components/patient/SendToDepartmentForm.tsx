"use client";

import { useActionState, useState } from "react";
import { sendToDepartmentAction } from "@/app/(dashboard)/patients/[id]/actions";
import { Field, Select, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

type DeptOption = { id: string; name: string; slug: string; acceptsRequestTypes: string[] };

// Sends the patient to another department (e.g. doctor → laboratory). Works
// with or without an open visit — one is started if needed. Accounts with no
// department of their own (administrators) pick which department they act for.
export function SendToDepartmentForm({
  visitId,
  patientId,
  departments,
  fromOptions,
}: {
  visitId: string | null;
  patientId: string;
  departments: DeptOption[];
  fromOptions: { id: string; name: string; slug: string }[] | null;
}) {
  const defaultFrom = fromOptions?.find((d) => d.slug === "clinician") ?? fromOptions?.[0];
  const [fromId, setFromId] = useState(defaultFrom?.id ?? "");
  const targets = departments.filter((d) => d.id !== fromId);
  const [selectedDeptId, setSelectedDeptId] = useState(targets[0]?.id ?? "");
  const selectedDept = targets.find((d) => d.id === selectedDeptId) ?? targets[0];
  const [state, formAction, pending] = useActionState(sendToDepartmentAction, undefined);
  useActionToast(pending, Boolean(state?.error), `Sent to ${selectedDept?.name ?? "department"}`);

  if (targets.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No other departments accept patients yet. Add one under Admin → Departments.</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      {visitId && <input type="hidden" name="visitId" value={visitId} />}
      <input type="hidden" name="patientId" value={patientId} />
      <FormError>{state?.error}</FormError>
      <div className="grid gap-4 sm:grid-cols-2">
        {fromOptions && (
          <Field label="From" htmlFor="fromDepartmentId">
            <Select
              id="fromDepartmentId"
              name="fromDepartmentId"
              required
              value={fromId}
              onChange={(e) => {
                setFromId(e.target.value);
                setSelectedDeptId(departments.find((d) => d.id !== e.target.value)?.id ?? "");
              }}
            >
              {fromOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Send to" htmlFor="toDepartmentId">
          <Select id="toDepartmentId" name="toDepartmentId" required value={selectedDept?.id ?? ""} onChange={(e) => setSelectedDeptId(e.target.value)}>
            {targets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="What's needed" htmlFor="requestType">
          <Select id="requestType" name="requestType" required defaultValue="" key={selectedDept?.id}>
            <option value="" disabled>Select…</option>
            {selectedDept?.acceptsRequestTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Urgency" htmlFor="urgency">
          <Select id="urgency" name="urgency" defaultValue="ROUTINE">
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">Emergency</option>
          </Select>
        </Field>
      </div>
      <Field label="Reason" htmlFor="reason">
        <Textarea id="reason" name="reason" required rows={2} placeholder="e.g. Rule out malaria — 3-day fever" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Sending…" : `Send to ${selectedDept?.name ?? "department"}`}</Button>
      </div>
    </form>
  );
}
