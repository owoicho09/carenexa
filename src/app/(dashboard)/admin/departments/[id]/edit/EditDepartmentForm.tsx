"use client";

import { useActionState } from "react";
import { updateDepartmentAction } from "../../actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";

export function EditDepartmentForm({
  department,
}: {
  department: { id: string; name: string; slug: string; description: string; acceptsRequestTypes: string; resultFields: string };
}) {
  const [state, formAction, pending] = useActionState(updateDepartmentAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="departmentId" value={department.id} />
      <FormError>{state?.error}</FormError>

      <Field label="Name" hint="Set at creation, permanent — it's tied to the department's address.">
        <Input value={department.name} disabled />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={department.description} required />
      </Field>

      <Field label="Request types it accepts" htmlFor="acceptsRequestTypes" hint="Comma-separated. Leave blank if this department never receives requests.">
        <Input id="acceptsRequestTypes" name="acceptsRequestTypes" defaultValue={department.acceptsRequestTypes} />
      </Field>

      <Field label="Outcome fields" htmlFor="resultFields" hint="Comma-separated field labels staff fill in when completing a request here.">
        <Input id="resultFields" name="resultFields" defaultValue={department.resultFields} />
      </Field>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <LinkButton href="/admin/departments" variant="secondary">Cancel</LinkButton>
        <Button type="submit" loading={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
