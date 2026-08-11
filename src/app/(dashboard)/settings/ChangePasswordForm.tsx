"use client";

import { useActionState, useRef, useEffect } from "react";
import { changePasswordAction } from "./actions";
import { Field, Input, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormError>{state?.error}</FormError>
      {state?.success && <p className="text-sm text-[var(--color-success)]">Password changed.</p>}
      <Field label="Current password" htmlFor="currentPassword">
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </Field>
      <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
        <Input id="newPassword" name="newPassword" type="password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword">
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Updating…" : "Change password"}</Button>
      </div>
    </form>
  );
}
