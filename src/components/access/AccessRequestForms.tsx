"use client";

import { useActionState } from "react";
import {
  approveAccessRequestAction,
  declineAccessRequestAction,
  requestPatientRecordsAction,
} from "@/app/(dashboard)/access-requests/actions";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import { CATEGORY_LABEL, SHAREABLE_CATEGORIES } from "@/lib/tenantAccess";


function CategoryCheckboxes({ categories, defaultChecked = false }: { categories: string[]; defaultChecked?: boolean }) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Record categories</legend>
      {categories.map((value) => (
        <label key={value} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input type="checkbox" name="recordCategories" value={value} defaultChecked={defaultChecked} className="accent-[var(--color-brand)]" />
          {CATEGORY_LABEL[value] ?? value}
        </label>
      ))}
    </fieldset>
  );
}

export function RequestRecordsForm({ patientId, hospitals }: { patientId: string; hospitals: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(requestPatientRecordsAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <FormError>{state?.error}</FormError>
      {state?.success && <p role="status" className="text-sm text-[var(--color-success)]">Request sent. Nothing is shared until the other hospital releases it.</p>}
      <Field label="Request from" htmlFor="sourceHospitalId">
        <Select id="sourceHospitalId" name="sourceHospitalId" required defaultValue="">
          <option value="" disabled>Select a hospital…</option>
          {hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
        </Select>
      </Field>
      <Field label="Clinical purpose" htmlFor="requestPurpose">
        <Input id="requestPurpose" name="purpose" required minLength={10} placeholder="e.g. Prior echo and medication history for cardiology review" />
      </Field>
      <Field label="Patient authorization evidence" htmlFor="requestAuthorization" hint="The patient is present and has agreed to these categories being requested.">
        <Input id="requestAuthorization" name="authorizationEvidence" required placeholder="Consent form or documented verbal consent reference" />
      </Field>
      <CategoryCheckboxes categories={[...SHAREABLE_CATEGORIES]} />
      <div className="flex justify-end"><Button type="submit" variant="secondary" size="sm" loading={pending}>Send request</Button></div>
    </form>
  );
}

export function ApproveRequestForm({ grantId, requestedCategories }: { grantId: string; requestedCategories: string[] }) {
  const [state, action, pending] = useActionState(approveAccessRequestAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="grantId" value={grantId} />
      <FormError>{state?.error}</FormError>
      <CategoryCheckboxes categories={requestedCategories} defaultChecked />
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Access period" htmlFor={`duration-${grantId}`}>
          <Select id={`duration-${grantId}`} name="durationDays" defaultValue="7" className="w-auto">
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </Select>
        </Field>
        <div className="min-w-48 flex-1">
          <Field label="Release note (optional)" htmlFor={`note-${grantId}`}><Input id={`note-${grantId}`} name="releaseNote" /></Field>
        </div>
        <Button type="submit" size="sm" loading={pending}>Release records</Button>
      </div>
    </form>
  );
}

export function DeclineRequestForm({ grantId }: { grantId: string }) {
  const [state, action, pending] = useActionState(declineAccessRequestAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="grantId" value={grantId} />
      <div className="min-w-48 flex-1">
        <Field label="Reason for declining" htmlFor={`decline-${grantId}`}><Textarea id={`decline-${grantId}`} name="reason" required rows={1} /></Field>
      </div>
      <Button type="submit" variant="danger" size="sm" loading={pending}>Decline</Button>
      <FormError>{state?.error}</FormError>
    </form>
  );
}
