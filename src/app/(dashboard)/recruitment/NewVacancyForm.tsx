"use client";

import { useActionState } from "react";
import { createVacancyAction } from "./actions";
import { Field, Input, Select, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewVacancyForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createVacancyAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Job title" htmlFor="title">
          <Input id="title" name="title" required placeholder="e.g. Medical Officer" />
        </Field>
        <Field label="Department" htmlFor="departmentId">
          <Select id="departmentId" name="departmentId" defaultValue="">
            <option value="">Not department-specific</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Employment type" htmlFor="employmentType">
          <Select id="employmentType" name="employmentType" defaultValue="Full-time">
            <option value="Full-time">Full-time</option>
            <option value="Locum">Locum</option>
            <option value="Part-time">Part-time</option>
          </Select>
        </Field>
        <Field label="Location" htmlFor="location">
          <Input id="location" name="location" required placeholder="e.g. Ikeja, Lagos" />
        </Field>
      </div>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" required placeholder="What the role involves." />
      </Field>
      <Field label="Requirements" htmlFor="requirements" hint="One requirement per line — the AI screens CVs against these.">
        <Textarea
          id="requirements"
          name="requirements"
          required
          placeholder={"MBBS from a recognised institution\nValid MDCN licence\nAt least 2 years post-NYSC clinical experience"}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Creating…" : "Create vacancy"}</Button>
      </div>
    </form>
  );
}
