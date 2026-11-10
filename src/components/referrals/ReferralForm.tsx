"use client";

import { useActionState } from "react";
import { createReferralDraftAction } from "@/app/(dashboard)/referrals/actions";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";

type DestinationHospital = { id: string; name: string };

export function ReferralForm({
  patientId,
  visitId,
  hospitals,
}: {
  patientId: string;
  visitId: string;
  hospitals: DestinationHospital[];
}) {
  const [state, formAction, pending] = useActionState(createReferralDraftAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="visitId" value={visitId} />
      <FormError>{state?.error}</FormError>
      <Field label="Receiving hospital" htmlFor="destinationHospitalId">
        <Select id="destinationHospitalId" name="destinationHospitalId" required defaultValue="">
          <option value="" disabled>Select a CareNexa hospital…</option>
          {hospitals.map((hospital) => (
            <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
          ))}
        </Select>
      </Field>
      <Field
        label="Requested service"
        htmlFor="requestedService"
        hint="Describe what the patient needs. The receiving hospital routes it to the right department."
      >
        <Input id="requestedService" name="requestedService" required placeholder="e.g. Cardiology assessment and echocardiogram" />
      </Field>
      <Field label="Clinical reason" htmlFor="reason">
        <Textarea id="reason" name="reason" required rows={3} placeholder="Why this referral is needed" />
      </Field>
      <Field label="Urgency" htmlFor="urgency">
        <Select id="urgency" name="urgency" defaultValue="ROUTINE">
          <option value="ROUTINE">Routine</option>
          <option value="URGENT">Urgent</option>
          <option value="EMERGENCY">Emergency</option>
        </Select>
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" size="sm" loading={pending}>Create referral draft</Button>
      </div>
    </form>
  );
}
