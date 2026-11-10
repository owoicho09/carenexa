"use client";

import { useActionState } from "react";
import {
  authorizeAndSubmitReferralAction,
  createEmergencyAccessAction,
  incorporateCounterReferralAction,
  recordRetrospectiveAuthorizationAction,
  registerReferredPatientAction,
  submitEmergencyReferralAction,
  submitCounterReferralAction,
  transitionReferralAction,
  verifyIncomingReferralIdentityAction,
} from "@/app/(dashboard)/referrals/actions";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import { STATUS_ACTION_LABEL, STATUS_NEEDS_NOTE, type ReferralStatusValue } from "@/lib/referralRules";

const CATEGORIES = [
  ["DEMOGRAPHICS", "Demographics and allergies"],
  ["VISITS", "Visit history"],
  ["VITALS", "Vitals"],
  ["LAB_RESULTS", "Laboratory results"],
  ["DIAGNOSES", "Diagnoses and plans"],
  ["PRESCRIPTIONS", "Prescriptions"],
  ["CLINICAL_NOTES", "Clinical notes"],
];

export function ReferralConsentForm({ referralId }: { referralId: string }) {
  const [state, action, pending] = useActionState(authorizeAndSubmitReferralAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="referralId" value={referralId} />
      <FormError>{state?.error}</FormError>
      <Field label="Authorization evidence reference" htmlFor="authorizationEvidence" hint="e.g. the consent form number, or 'Verbal consent witnessed by Nurse Okonkwo'.">
        <Input id="authorizationEvidence" name="authorizationEvidence" required placeholder="Consent form or documented verbal consent reference" />
      </Field>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Records the patient agreed to share (untick any they decline)</legend>
        {CATEGORIES.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" name="recordCategories" value={value} defaultChecked className="accent-[var(--color-brand)]" />{label}
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end"><Button type="submit" size="sm" loading={pending}>Authorize and send referral</Button></div>
    </form>
  );
}

type LocalPatient = { id: string; fullName: string; hospitalNumber: string };

export function IncomingIdentityForm({
  referralId,
  linkedPatientId,
  localPatients,
}: {
  referralId: string;
  linkedPatientId: string | null;
  localPatients: LocalPatient[];
}) {
  const [state, action, pending] = useActionState(verifyIncomingReferralIdentityAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      <FormError>{state?.error}</FormError>
      <Field label="Local patient record" htmlFor="patientId">
        <Select id="patientId" name="patientId" required defaultValue={linkedPatientId ?? ""}>
          <option value="" disabled>Select patient…</option>
          {localPatients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patient.hospitalNumber}</option>)}
        </Select>
      </Field>
      <Field label="CareNexa ID from the patient's card" htmlFor="verifyCareNexaId" hint="Ask the patient for their CareNexa card and type the ID exactly as printed, e.g. CNX-7F2A91C3.">
        <Input id="verifyCareNexaId" name="careNexaId" required autoComplete="off" spellCheck={false} placeholder="CNX-…" className="font-mono uppercase" />
      </Field>
      <Field label="Note (optional)" htmlFor="evidenceReference">
        <Input id="evidenceReference" name="evidenceReference" placeholder="e.g. National ID also sighted" />
      </Field>
      <div className="flex justify-end"><Button type="submit" size="sm" loading={pending}>Confirm ID and acknowledge</Button></div>
    </form>
  );
}

function StepForm({ referralId, status, primary }: { referralId: string; status: ReferralStatusValue; primary: boolean }) {
  const [state, action, pending] = useActionState(transitionReferralAction, undefined);
  const needsNote = STATUS_NEEDS_NOTE.includes(status);
  const needsTime = status === "APPOINTMENT_SCHEDULED";
  const label = STATUS_ACTION_LABEL[status] ?? status.replaceAll("_", " ");
  const danger = status === "DECLINED";
  return (
    <form action={action} className={needsNote || needsTime ? "flex flex-wrap items-end gap-2 rounded-md border border-[var(--color-border)] p-2" : ""}>
      <input type="hidden" name="referralId" value={referralId} />
      <input type="hidden" name="status" value={status} />
      {needsTime && (
        <Field label="Appointment time" htmlFor={`appt-${referralId}`}>
          <Input id={`appt-${referralId}`} name="appointmentScheduledFor" type="datetime-local" required />
        </Field>
      )}
      {needsNote && (
        <div className="min-w-48 flex-1">
          <Field label="Note for the other hospital" htmlFor={`note-${status}`}><Input id={`note-${status}`} name="detail" required /></Field>
        </div>
      )}
      <Button type="submit" size="sm" variant={danger ? "danger" : primary ? "primary" : "secondary"} loading={pending}>{label}</Button>
      {state?.error && <FormError>{state.error}</FormError>}
    </form>
  );
}

// Forward steps are shown as buttons; steps that stop or divert the referral
// sit under "Other options" and require a note.
export function ReferralNextSteps({ referralId, statuses }: { referralId: string; statuses: string[] }) {
  const steps = statuses as ReferralStatusValue[];
  const forward = steps.filter((s) => !STATUS_NEEDS_NOTE.includes(s));
  const other = steps.filter((s) => STATUS_NEEDS_NOTE.includes(s));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        {forward.map((status, i) => <StepForm key={status} referralId={referralId} status={status} primary={i === 0} />)}
      </div>
      {other.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-muted)]">Other options</summary>
          <div className="mt-2 space-y-2">
            {other.map((status) => <StepForm key={status} referralId={referralId} status={status} primary={false} />)}
          </div>
        </details>
      )}
    </div>
  );
}

type SharedDemographics = { fullName?: string; dateOfBirth?: string; sex?: string; phone?: string };

export function RegisterReferredPatientForm({ referralId, shared }: { referralId: string; shared: SharedDemographics | null }) {
  const [state, action, pending] = useActionState(registerReferredPatientAction, undefined);
  const hasShared = Boolean(shared?.fullName && shared?.dateOfBirth && shared?.sex);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      <FormError>{state?.error}</FormError>
      {hasShared ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-page)] px-3 py-2 text-sm">
          <p className="font-medium text-[var(--color-text)]">{shared!.fullName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {shared!.sex === "MALE" ? "Male" : "Female"} · born {new Date(shared!.dateOfBirth!).toLocaleDateString("en-NG")}
            {shared!.phone ? ` · ${shared!.phone}` : ""} · shared by the referrer with the patient&rsquo;s consent
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Full name" htmlFor="regName"><Input id="regName" name="fullName" required /></Field>
          <Field label="Date of birth" htmlFor="regDob"><Input id="regDob" name="dateOfBirth" type="date" required /></Field>
          <Field label="Sex" htmlFor="regSex">
            <Select id="regSex" name="sex" required defaultValue="">
              <option value="" disabled>Select…</option>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </Select>
          </Field>
        </div>
      )}
      <Field label="CareNexa ID from the patient's card" htmlFor="regCareNexaId" hint="Ask the patient for their CareNexa card and type the ID exactly as printed, e.g. CNX-7F2A91C3.">
        <Input id="regCareNexaId" name="careNexaId" required autoComplete="off" spellCheck={false} placeholder="CNX-…" className="font-mono uppercase" />
      </Field>
      <Field label="Note (optional)" htmlFor="regEvidence">
        <Input id="regEvidence" name="evidenceReference" placeholder="e.g. National ID also sighted" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={pending}>Confirm ID and register patient</Button>
      </div>
    </form>
  );
}

export function EmergencyAccessForm({ referralId }: { referralId: string }) {
  const [state, action, pending] = useActionState(createEmergencyAccessAction, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      <FormError>{state?.error}</FormError>
      <Field label="Emergency reason" htmlFor="emergencyReason"><Textarea id="emergencyReason" name="reason" required rows={2} /></Field>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Records needed</legend>
        {CATEGORIES.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" name="recordCategories" value={value} />{label}</label>)}
      </fieldset>
      <div className="flex justify-end"><Button type="submit" variant="danger" size="sm" loading={pending}>Grant emergency access</Button></div>
    </form>
  );
}

export function CounterReferralForm({ referralId }: { referralId: string }) {
  const [state, action, pending] = useActionState(submitCounterReferralAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      <FormError>{state?.error}</FormError>
      <Field label="Discharge or counter-referral summary" htmlFor="counterSummary"><Textarea id="counterSummary" name="summary" required rows={4} /></Field>
      <Field label="Patient authorization evidence reference" htmlFor="counterAuthorization"><Input id="counterAuthorization" name="authorizationEvidence" required /></Field>
      <div className="flex justify-end"><Button type="submit" size="sm" loading={pending}>Submit counter-referral</Button></div>
    </form>
  );
}

export function IncorporateCounterReferralForm({ referralId }: { referralId: string }) {
  const [state, action, pending] = useActionState(incorporateCounterReferralAction, undefined);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <input type="hidden" name="referralId" value={referralId} />
      {state?.error && <FormError>{state.error}</FormError>}
      {state?.success && <p role="status" className="text-sm text-[var(--color-success)]">Added as an unsigned note for clinician review.</p>}
      <Button type="submit" variant="secondary" size="sm" loading={pending}>Review and add to local visit</Button>
    </form>
  );
}

export function EmergencySubmitForm({ referralId }: { referralId: string }) {
  const [state, action, pending] = useActionState(submitEmergencyReferralAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      <FormError>{state?.error}</FormError>
      <Field label="Emergency justification" htmlFor="emergencyJustification">
        <Textarea id="emergencyJustification" name="justification" required minLength={20} rows={2} placeholder="e.g. Unconscious after RTA, GCS 7, needs neurosurgical review" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-[var(--color-text)]">
        <input type="checkbox" name="patientUnableToAuthorize" required className="mt-0.5 accent-[var(--color-danger)]" />
        The patient cannot authorize record sharing right now, and delaying transfer would risk harm.
      </label>
      <div className="flex justify-end"><Button type="submit" variant="danger" size="sm" loading={pending}>Submit as emergency</Button></div>
    </form>
  );
}

export function RetrospectiveAuthorizationForm({ referralId }: { referralId: string }) {
  const [state, action, pending] = useActionState(recordRetrospectiveAuthorizationAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="referralId" value={referralId} />
      <FormError>{state?.error}</FormError>
      <Field label="Authorization evidence reference" htmlFor="retroAuthorizationEvidence">
        <Input id="retroAuthorizationEvidence" name="authorizationEvidence" required placeholder="Consent form or documented verbal consent reference" />
      </Field>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Authorized record categories</legend>
        {CATEGORIES.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" name="recordCategories" value={value} className="accent-[var(--color-brand)]" />{label}
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end"><Button type="submit" size="sm" loading={pending}>Record authorization</Button></div>
    </form>
  );
}
