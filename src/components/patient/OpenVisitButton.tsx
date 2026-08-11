"use client";

import { useActionState, useState } from "react";
import { openVisitAction } from "@/app/(dashboard)/patients/[id]/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Textarea, FormError } from "@/components/ui/Field";

export function OpenVisitButton({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(openVisitAction, undefined);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Open visit</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Open a new visit" description="The patient is here today — start today's record.">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="patientId" value={patientId} />
          <FormError>{state?.error}</FormError>
          <Field label="Presenting complaint" htmlFor="presentingComplaint" hint="Optional — what they say is wrong, in their own words.">
            <Textarea id="presentingComplaint" name="presentingComplaint" placeholder="e.g. Cough and fever for 2 days" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>{pending ? "Opening…" : "Open visit"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
