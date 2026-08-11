"use client";

import { useActionState, useState } from "react";
import { addClinicalNoteAction, addDiagnosisAction, addPrescriptionAction, draftNoteFromShorthandAction } from "../actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { AiAttribution } from "@/components/ai/AiAttribution";
import { useActionToast } from "@/components/ui/SubmitWithToast";

export function ClinicianHandler({ requestId }: { requestId: string }) {
  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Clinical note</h3>
        <NoteForm requestId={requestId} />
      </Panel>
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Diagnosis & plan</h3>
        <DiagnosisForm requestId={requestId} />
      </Panel>
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Prescribe</h3>
        <PrescriptionForm requestId={requestId} />
      </Panel>
    </div>
  );
}

function NoteForm({ requestId }: { requestId: string }) {
  const [saveState, saveAction, savePending] = useActionState(addClinicalNoteAction, undefined);
  const [draftState, draftAction, draftPending] = useActionState(draftNoteFromShorthandAction, undefined);
  const [content, setContent] = useState("");
  const [shorthand, setShorthand] = useState("");
  const [appliedDraft, setAppliedDraft] = useState<string | undefined>(undefined);

  if (draftState?.draft && draftState.draft !== appliedDraft) {
    setAppliedDraft(draftState.draft);
    setContent(draftState.draft);
  }

  useActionToast(savePending, Boolean(saveState?.error), "Note saved & signed");

  return (
    <div className="space-y-4">
      <form action={draftAction} className="space-y-2">
        <input type="hidden" name="requestId" value={requestId} />
        <FormError>{draftState?.error}</FormError>
        <Field label="Shorthand" htmlFor="shorthand" hint="Quick fragments — the AI expands this into a note draft you edit and sign below.">
          <Textarea
            id="shorthand"
            name="shorthand"
            value={shorthand}
            onChange={(e) => setShorthand(e.target.value)}
            placeholder="e.g. fever 3d, temp 38.9, no rash, malaria test requested"
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" size="sm" loading={draftPending} disabled={!shorthand.trim()}>
            {draftPending ? "Drafting…" : "Draft with AI"}
          </Button>
        </div>
      </form>

      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="shorthand" value={shorthand} />
        <input type="hidden" name="artifactId" value={draftState?.artifactId ?? ""} />
        <FormError>{saveState?.error}</FormError>
        <Field label="Clinical note" htmlFor="content">
          <Textarea
            id="content"
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Examination findings, history, impression…"
            required
          />
        </Field>
        {draftState?.draft && <AiAttribution model="claude-haiku-4-5-20251001" at={new Date()} />}
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={savePending || !content.trim()}>
            {savePending ? "Saving…" : "Save & sign note"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DiagnosisForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(addDiagnosisAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Diagnosis added");
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <FormError>{state?.error}</FormError>
      <Field label="Diagnosis" htmlFor="description">
        <Input id="description" name="description" placeholder="e.g. Uncomplicated malaria" required />
      </Field>
      <Field label="Plan" htmlFor="plan">
        <Textarea id="plan" name="plan" placeholder="e.g. Start artemether-lumefantrine, review in 3 days" required />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" loading={pending}>{pending ? "Saving…" : "Add diagnosis"}</Button>
      </div>
    </form>
  );
}

function PrescriptionForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(addPrescriptionAction, undefined);
  useActionToast(pending, Boolean(state?.error), "Prescription added");
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <FormError>{state?.error}</FormError>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Drug" htmlFor="drugName"><Input id="drugName" name="drugName" placeholder="Artemether-Lumefantrine" required /></Field>
        <Field label="Dosage" htmlFor="dosage"><Input id="dosage" name="dosage" placeholder="80/480mg" required /></Field>
        <Field label="Frequency" htmlFor="frequency"><Input id="frequency" name="frequency" placeholder="BD" required /></Field>
        <Field label="Duration" htmlFor="duration"><Input id="duration" name="duration" placeholder="3 days" required /></Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" loading={pending}>{pending ? "Saving…" : "Add prescription"}</Button>
      </div>
    </form>
  );
}
