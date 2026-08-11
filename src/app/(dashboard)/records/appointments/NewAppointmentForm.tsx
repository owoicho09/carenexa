"use client";

import { useActionState, useState } from "react";
import { bookAppointmentAction } from "@/app/(dashboard)/patients/[id]/actions";
import { PatientPicker } from "@/components/records/PatientPicker";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function NewAppointmentForm() {
  const [patient, setPatient] = useState<{ id: string; fullName: string; hospitalNumber: string } | null>(null);
  const [state, formAction, pending] = useActionState(bookAppointmentAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Appointment booked");

  if (!patient) {
    return <PatientPicker onSelect={(p) => setPatient(p)} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="patientId" value={patient.id} />
      <FormError>{state?.error}</FormError>
      <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-page)] px-3 py-2">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">{patient.fullName}</p>
          <p className="font-mono text-xs text-[var(--color-text-muted)]">{patient.hospitalNumber}</p>
        </div>
        <button type="button" onClick={() => setPatient(null)} className="text-xs text-[var(--color-brand)] hover:underline">
          Change
        </button>
      </div>
      <Field label="Date & time" htmlFor="scheduledFor">
        <Input id="scheduledFor" name="scheduledFor" type="datetime-local" required />
      </Field>
      <Field label="Reason" htmlFor="reason">
        <Textarea id="reason" name="reason" required placeholder="e.g. Antenatal follow-up" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>{pending ? "Booking…" : "Book appointment"}</Button>
      </div>
    </form>
  );
}
