"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { bookAppointmentAction } from "@/app/(dashboard)/patients/[id]/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { useNotifications } from "@/components/notifications/NotificationProvider";

export function BookAppointmentButton({ patientId, size = "sm" as const }: { patientId: string; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(bookAppointmentAction, undefined);
  const { showToast } = useNotifications();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      showToast("Appointment booked");
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state?.error, showToast]);

  return (
    <>
      <Button variant="secondary" size={size} onClick={() => setOpen(true)}>Book appointment</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Book an appointment">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="patientId" value={patientId} />
          <FormError>{state?.error}</FormError>
          <Field label="Date & time" htmlFor="scheduledFor">
            <Input id="scheduledFor" name="scheduledFor" type="datetime-local" required />
          </Field>
          <Field label="Reason" htmlFor="reason">
            <Textarea id="reason" name="reason" required placeholder="e.g. Antenatal follow-up" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>{pending ? "Booking…" : "Book"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
