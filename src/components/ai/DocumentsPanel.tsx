"use client";

import { useActionState } from "react";
import {
  generateDischargeSummaryAction,
  generateReferralLetterAction,
  approveDocumentAction,
} from "@/app/(dashboard)/patients/[id]/aiActions";
import { Field, Input, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AiAttribution } from "@/components/ai/AiAttribution";
import type { AiArtifactType } from "@/generated/prisma/enums";

type DocumentArtifact = {
  id: string;
  type: AiArtifactType;
  model: string;
  createdAt: Date;
  approvedAt: Date | null;
  output: unknown;
};

const TYPE_LABEL: Partial<Record<AiArtifactType, string>> = {
  DISCHARGE_SUMMARY: "Discharge summary",
  REFERRAL_LETTER: "Referral letter",
};

export function DocumentsPanel({
  visitId,
  patientId,
  aiConfigured,
  documents,
}: {
  visitId: string;
  patientId: string;
  aiConfigured: boolean;
  documents: DocumentArtifact[];
}) {
  return (
    <div className="space-y-4">
      {documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-md border border-[var(--color-border)] p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--color-text)]">{TYPE_LABEL[doc.type] ?? doc.type}</span>
                {doc.approvedAt ? (
                  <Badge tone="success">Approved</Badge>
                ) : (
                  <Badge tone="warning">Needs approval</Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
                {(doc.output as { text?: string })?.text}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <AiAttribution model={doc.model} at={doc.createdAt} />
                {!doc.approvedAt && <ApproveButton artifactId={doc.id} patientId={patientId} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {aiConfigured ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DischargeForm visitId={visitId} patientId={patientId} />
          <ReferralForm visitId={visitId} patientId={patientId} />
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">
          Document generation turns on once an Anthropic API key is configured.
        </p>
      )}
    </div>
  );
}

function ApproveButton({ artifactId, patientId }: { artifactId: string; patientId: string }) {
  const [, formAction, pending] = useActionState(approveDocumentAction, undefined);
  return (
    <form action={formAction}>
      <input type="hidden" name="artifactId" value={artifactId} />
      <input type="hidden" name="patientId" value={patientId} />
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        {pending ? "Approving…" : "Approve & finalize"}
      </Button>
    </form>
  );
}

function DischargeForm({ visitId, patientId }: { visitId: string; patientId: string }) {
  const [state, formAction, pending] = useActionState(generateDischargeSummaryAction, undefined);
  return (
    <form action={formAction} className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="patientId" value={patientId} />
      <p className="text-sm font-medium text-[var(--color-text)]">Discharge summary</p>
      <FormError>{state?.error}</FormError>
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        {pending ? "Generating…" : "Generate"}
      </Button>
    </form>
  );
}

function ReferralForm({ visitId, patientId }: { visitId: string; patientId: string }) {
  const [state, formAction, pending] = useActionState(generateReferralLetterAction, undefined);
  return (
    <form action={formAction} className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="patientId" value={patientId} />
      <p className="text-sm font-medium text-[var(--color-text)]">Referral letter</p>
      <FormError>{state?.error}</FormError>
      <Field label="Referred to" htmlFor={`referredTo-${visitId}`}>
        <Input id={`referredTo-${visitId}`} name="referredTo" placeholder="e.g. Cardiology, Lagos University Teaching Hospital" />
      </Field>
      <Field label="Reason" htmlFor={`referralReason-${visitId}`}>
        <Input id={`referralReason-${visitId}`} name="referralReason" placeholder="e.g. Further evaluation of murmur" />
      </Field>
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        {pending ? "Generating…" : "Generate"}
      </Button>
    </form>
  );
}
