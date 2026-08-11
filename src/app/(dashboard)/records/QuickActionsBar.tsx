"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { PatientPicker } from "@/components/records/PatientPicker";
import { Modal } from "@/components/ui/Modal";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, Textarea, FormError } from "@/components/ui/Field";
import { SendToDepartmentForm } from "@/components/patient/SendToDepartmentForm";
import { openVisitAction } from "@/app/(dashboard)/patients/[id]/actions";
import { getOpenVisitForPatient } from "./searchActions";

type PatientMatch = { id: string; fullName: string; hospitalNumber: string; phone: string };
type DeptOption = { id: string; name: string; acceptsRequestTypes: string[] };

export function QuickActionsBar({ departments }: { departments: DeptOption[] }) {
  const [activeModal, setActiveModal] = useState<"find" | "open-visit" | "send" | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <LinkButton href="/records/register">Register patient</LinkButton>
      <Button variant="secondary" onClick={() => setActiveModal("find")}>Find patient</Button>
      <Button variant="secondary" onClick={() => setActiveModal("open-visit")}>Open visit</Button>
      <Button variant="secondary" onClick={() => setActiveModal("send")}>Send patient</Button>

      <FindPatientModal open={activeModal === "find"} onClose={() => setActiveModal(null)} />
      <OpenVisitModal open={activeModal === "open-visit"} onClose={() => setActiveModal(null)} />
      <SendPatientModal open={activeModal === "send"} onClose={() => setActiveModal(null)} departments={departments} />
    </div>
  );
}

function FindPatientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  return (
    <Modal open={open} onClose={onClose} title="Find a patient">
      <PatientPicker onSelect={(p) => router.push(`/patients/${p.id}`)} />
    </Modal>
  );
}

function OpenVisitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [patient, setPatient] = useState<PatientMatch | null>(null);
  const [state, formAction, pending] = useActionState(openVisitAction, undefined);

  return (
    <Modal
      open={open}
      onClose={() => {
        setPatient(null);
        onClose();
      }}
      title="Open a visit"
      description="The patient is here today — pick them, then start today's record."
    >
      {!patient ? (
        <PatientPicker onSelect={(p) => setPatient(p)} />
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="patientId" value={patient.id} />
          <FormError>{state?.error}</FormError>
          <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-page)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--color-text)]">{patient.fullName}</p>
            <button type="button" onClick={() => setPatient(null)} className="text-xs text-[var(--color-brand)] hover:underline">
              Change
            </button>
          </div>
          <Field label="Presenting complaint" htmlFor="presentingComplaint" hint="Optional">
            <Textarea id="presentingComplaint" name="presentingComplaint" />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>{pending ? "Opening…" : "Open visit"}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function SendPatientModal({ open, onClose, departments }: { open: boolean; onClose: () => void; departments: DeptOption[] }) {
  const [patient, setPatient] = useState<PatientMatch | null>(null);
  const [visitId, setVisitId] = useState<string | null | undefined>(undefined);

  async function handleSelect(p: PatientMatch) {
    setPatient(p);
    const id = await getOpenVisitForPatient(p.id);
    setVisitId(id);
  }

  function reset() {
    setPatient(null);
    setVisitId(undefined);
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Send a patient" description="Route them to any department, with a note.">
      {!patient ? (
        <PatientPicker onSelect={handleSelect} />
      ) : visitId === undefined ? (
        <p className="text-sm text-[var(--color-text-muted)]">Checking their visit…</p>
      ) : visitId === null ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            {patient.fullName} doesn&rsquo;t have an open visit right now — open one first.
          </p>
          <Button variant="secondary" size="sm" onClick={reset}>Choose someone else</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-page)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--color-text)]">{patient.fullName}</p>
            <button type="button" onClick={reset} className="text-xs text-[var(--color-brand)] hover:underline">
              Change
            </button>
          </div>
          <SendToDepartmentForm visitId={visitId} departments={departments} />
        </div>
      )}
    </Modal>
  );
}
