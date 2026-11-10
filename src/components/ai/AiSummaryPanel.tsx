"use client";

import { useActionState } from "react";
import { generateSummaryAction } from "@/app/(dashboard)/patients/[id]/aiActions";
import { Button } from "@/components/ui/Button";

type Props = {
  patientId: string;
  aiConfigured: boolean;
  initialSummary: { text: string; createdAt: Date; model: string } | null;
};

export function AiSummaryPanel({ patientId, aiConfigured, initialSummary }: Props) {
  const [state, formAction, pending] = useActionState(generateSummaryAction, undefined);

  const text = state?.text ?? initialSummary?.text;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">AI summary</p>
        {aiConfigured && (
          <form action={formAction}>
            <input type="hidden" name="patientId" value={patientId} />
            <Button type="submit" variant="outline" size="sm" loading={pending}>
              {pending ? "Generating…" : text ? "Regenerate" : "Generate summary"}
            </Button>
          </form>
        )}
      </div>

      {!aiConfigured ? (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">AI summaries aren&rsquo;t switched on yet.</p>
      ) : state?.error ? (
        <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : text ? (
        <>
          <p className="mt-2 text-sm text-[var(--color-text)]">{text}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">A short overview of this patient&rsquo;s history. Press Generate summary to create one.</p>
      )}
    </div>
  );
}
