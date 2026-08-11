"use client";

import { useActionState } from "react";
import { updateStaffAction } from "../actions";
import { Field, Input, Select, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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

type StaffEditable = { id: string; fullName: string; role: string; jobTitle: string; departmentId: string | null };

export function EditStaffForm({ staff, departments }: { staff: StaffEditable; departments: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(updateStaffAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="staffId" value={staff.id} />
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" name="fullName" defaultValue={staff.fullName} required />
        </Field>
        <Field label="Job title" htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" defaultValue={staff.jobTitle} required />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" defaultValue={staff.role} required>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </Field>
        <Field label="Department" htmlFor="departmentId">
          <Select id="departmentId" name="departmentId" defaultValue={staff.departmentId ?? ""}>
            <option value="">None</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
