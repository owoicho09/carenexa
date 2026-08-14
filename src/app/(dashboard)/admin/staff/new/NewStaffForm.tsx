"use client";

import { useActionState } from "react";
import { createStaffAction } from "../actions";
import { Field, Input, Select, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrator" },
  { value: "RECORDS_OFFICER", label: "Records Officer" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "NURSE", label: "Nurse" },
  { value: "CLINICIAN", label: "Clinician" },
  { value: "LAB_SCIENTIST", label: "Laboratory Scientist" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "RECRUITER", label: "Recruiter" },
];

export function NewStaffForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createStaffAction, undefined);

  if (state?.tempPassword) {
    return (
      <Panel className="border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-5">
        <p className="text-sm font-medium text-[var(--color-success)]">Staff account created.</p>
        <p className="mt-2 text-sm text-[var(--color-text)]">Login: <span className="font-mono">{state.email}</span></p>
        <p className="text-sm text-[var(--color-text)]">Temporary password: <span className="font-mono">{state.tempPassword}</span></p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">Share this with them once — it won&rsquo;t be shown again.</p>
      </Panel>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" name="fullName" required />
        </Field>
        <Field label="Login email" htmlFor="email">
          <Input id="email" name="email" type="email" required placeholder="firstname.lastname@carenexa.cloud" />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" required defaultValue="">
            <option value="" disabled>Select…</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </Field>
        <Field label="Department" htmlFor="departmentId">
          <Select id="departmentId" name="departmentId" defaultValue="">
            <option value="">None</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Job title" htmlFor="jobTitle">
            <Input id="jobTitle" name="jobTitle" required placeholder="e.g. Nursing Officer" />
          </Field>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Creating…" : "Create staff account"}</Button>
      </div>
    </form>
  );
}
