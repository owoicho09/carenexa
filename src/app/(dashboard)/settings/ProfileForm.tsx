"use client";

import { useActionState } from "react";
import { updateProfileAction } from "./actions";
import { Field, Input, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state?.error}</FormError>
      {state?.success && <p className="text-sm text-[var(--color-success)]">Saved.</p>}
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" defaultValue={fullName} required />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}
