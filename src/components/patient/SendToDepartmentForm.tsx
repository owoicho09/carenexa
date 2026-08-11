"use client";

import { useActionState, useState } from "react";
import { sendToDepartmentAction } from "@/app/(dashboard)/patients/[id]/actions";
import { Field, Select, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

type DeptOption = { id: string; name: string; acceptsRequestTypes: string[] };

export function SendToDepartmentForm({ visitId, departments }: { visitId: string; departments: DeptOption[] }) {
  const [state, formAction, pending] = useActionState(sendToDepartmentAction, undefined);
  const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?.id ?? "");
  const selectedDept = departments.find((d) => d.id === selectedDeptId);
  useActionToast(pending, Boolean(state?.error), `Sent to ${selectedDept?.name ?? "department"}`);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="visitId" value={visitId} />
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Send to department" htmlFor="toDepartmentId">
          <Select
            id="toDepartmentId"
            name="toDepartmentId"
            required
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Request type" htmlFor="requestType">
          <Select id="requestType" name="requestType" required defaultValue="">
            <option value="" disabled>Select…</option>
            {selectedDept?.acceptsRequestTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Urgency" htmlFor="urgency">
          <Select id="urgency" name="urgency" defaultValue="ROUTINE">
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">Emergency</option>
          </Select>
        </Field>
      </div>
      <Field label="Reason" htmlFor="reason" hint="What you're asking the department to do or look for.">
        <Textarea id="reason" name="reason" required placeholder="e.g. Rule out malaria, patient with 3-day fever" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
