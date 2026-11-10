"use client";

import { useActionState } from "react";
import { verifyPatientIdentityAction } from "@/app/(dashboard)/patients/[id]/actions";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";

export function IdentityVerificationForm({ patientId }: { patientId: string }) {
  const [state, formAction, pending] = useActionState(verifyPatientIdentityAction, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="min-w-64 flex-1">
        <Field label="In-person verification evidence reference" htmlFor={`identityEvidence-${patientId}`}>
          <Input id={`identityEvidence-${patientId}`} name="evidenceReference" required placeholder="Verification record reference" />
        </Field>
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={pending}>Verify identity</Button>
      <FormError>{state?.error}</FormError>
    </form>
  );
}
