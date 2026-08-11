"use client";

import { useActionState, useState } from "react";
import { deletePatientAction } from "@/app/(dashboard)/patients/[id]/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

export function DeletePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deletePatientAction, undefined);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Delete patient
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete this patient?">
        <div className="space-y-4">
          <FormError>{state?.error}</FormError>
          <p className="text-sm text-[var(--color-text)]">
            <strong>{patientName}</strong> will be removed from search and every queue. Their visit history is not
            destroyed — an administrator can still find and restore the record if this was a mistake.
          </p>
          <form action={formAction} className="flex justify-end gap-2">
            <input type="hidden" name="patientId" value={patientId} />
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              {pending ? "Deleting…" : "Delete patient"}
            </Button>
          </form>
        </div>
      </Modal>
    </>
  );
}
