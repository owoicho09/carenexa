"use client";

import { useActionState } from "react";
import { generateSummaryAction } from "@/app/(dashboard)/patients/[id]/aiActions";
import { Button } from "@/components/ui/Button";
import { AiAttribution } from "@/components/ai/AiAttribution";

type Props = {
  patientId: string;
  aiConfigured: boolean;
  initialSummary: { text: string; createdAt: Date; model: string } | null;
};

export function AiSummaryPanel({ patientId, aiConfigured, initialSummary }: Props) {
  const [state, formAction, pending] = useActionState(generateSummaryAction, undefined);

  const text = state?.text ?? initialSummary?.text;
  const generatedAt = state?.generatedAt ?? initialSummary?.createdAt;
  const model = initialSummary?.model ?? "claude-haiku-4-5-20251001";

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
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          AI summaries turn on once an Anthropic API key is configured for this deployment.
        </p>
      ) : state?.error ? (
        <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : text ? (
        <>
          <p className="mt-2 text-sm text-[var(--color-text)]">{text}</p>
          {generatedAt && <div className="mt-2"><AiAttribution model={model} at={generatedAt} /></div>}
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          No summary generated yet for this patient.
        </p>
      )}
    </div>
  );
}
