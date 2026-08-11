"use client";

import { useActionState } from "react";
import { hireAction } from "./actions";
import { Field, Input, Select, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "CLINICIAN", label: "Clinician" },
  { value: "NURSE", label: "Nurse" },
  { value: "LAB_SCIENTIST", label: "Laboratory Scientist" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "RECORDS_OFFICER", label: "Records Officer" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "RECRUITER", label: "Recruiter" },
  { value: "ADMIN", label: "Administrator" },
];

export function HireForm({
  applicationId,
  suggestedDepartmentId,
  departments,
}: {
  applicationId: string;
  suggestedDepartmentId: string | null;
  departments: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(hireAction, undefined);

  if (state?.tempPassword) {
    return (
      <Panel className="border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-4">
        <p className="text-sm font-medium text-[var(--color-success)]">Hired — staff account created.</p>
        <p className="mt-2 text-sm text-[var(--color-text)]">
          Login: <span className="font-mono">{state.staffEmail}</span>
        </p>
        <p className="text-sm text-[var(--color-text)]">
          Temporary password: <span className="font-mono">{state.tempPassword}</span>
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">Share this with them once — it won&rsquo;t be shown again.</p>
      </Panel>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" required defaultValue="">
            <option value="" disabled>Select…</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </Field>
        <Field label="Department" htmlFor="departmentId">
          <Select id="departmentId" name="departmentId" defaultValue={suggestedDepartmentId ?? ""}>
            <option value="">None</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Job title" htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" required placeholder="e.g. Medical Officer" />
        </Field>
        <Field label="Login email" htmlFor="email">
          <Input id="email" name="email" type="email" required placeholder="firstname.lastname@carenexa.ng" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Hiring…" : "Hire & create staff account"}</Button>
      </div>
    </form>
  );
}
