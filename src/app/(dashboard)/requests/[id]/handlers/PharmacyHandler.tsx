"use client";

import { useActionState } from "react";
import { dispensePrescriptionAction } from "../actions";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useActionToast } from "@/components/ui/SubmitWithToast";

type PendingPrescription = { id: string; drugName: string; dosage: string; frequency: string; duration: string };

export function PharmacyHandler({ requestId, pendingPrescriptions }: { requestId: string; pendingPrescriptions: PendingPrescription[] }) {
  if (pendingPrescriptions.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No pending prescriptions on this visit.</p>;
  }

  return (
    <div className="space-y-3">
      {pendingPrescriptions.map((p) => (
        <Panel key={p.id} className="p-4">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">
            {p.drugName} — {p.dosage}, {p.frequency}, {p.duration}
          </p>
          <DispenseForm requestId={requestId} prescriptionId={p.id} />
        </Panel>
      ))}
    </div>
  );
}

function DispenseForm({ requestId, prescriptionId }: { requestId: string; prescriptionId: string }) {
  const [state, formAction, pending] = useActionState(dispensePrescriptionAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Prescription dispensed");
  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="prescriptionId" value={prescriptionId} />
      <Field label="Quantity dispensed" htmlFor={`quantity-${prescriptionId}`}>
        <Input id={`quantity-${prescriptionId}`} name="quantity" placeholder="e.g. 18 tablets" required />
      </Field>
      <Button type="submit" loading={pending}>{pending ? "Dispensing…" : "Dispense"}</Button>
      {state?.error && <span className="text-sm text-[var(--color-danger)]">{state.error}</span>}
    </form>
  );
}
