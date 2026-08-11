"use client";

import { useActionState } from "react";
import { screenApplicationAction, overrideScreeningAction } from "./actions";
import { Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { AiAttribution } from "@/components/ai/AiAttribution";
import { useActionToast } from "@/components/ui/SubmitWithToast";

type Props = {
  applicationId: string;
  aiConfigured: boolean;
  score: number | null;
  reasoning: string | null;
  overrideNote: string | null;
  screenedAt: Date | null;
  model: string | null;
};

export function ScreeningPanel({ applicationId, aiConfigured, score, reasoning, overrideNote, screenedAt, model }: Props) {
  const [screenState, screenAction, screenPending] = useActionState(screenApplicationAction, undefined);
  const [overrideState, overrideAction, overridePending] = useActionState(overrideScreeningAction, undefined);
  useActionToast(screenPending, Boolean(screenState?.error), "CV screened");
  useActionToast(overridePending, Boolean(overrideState?.error), "Override note saved");

  return (
    <div className="space-y-4">
      {reasoning ? (
        <div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold text-[var(--color-text)]">{score}</p>
            <p className="text-sm text-[var(--color-text-muted)]">/ 100</p>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text)]">{reasoning}</p>
          {screenedAt && model && <div className="mt-2"><AiAttribution model={model} at={screenedAt} /></div>}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Not screened yet.</p>
      )}

      {aiConfigured ? (
        <form action={screenAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <FormError>{screenState?.error}</FormError>
          <Button type="submit" variant="secondary" size="sm" disabled={screenPending}>
            {screenPending ? "Screening…" : reasoning ? "Re-screen with AI" : "Screen with AI"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">CV screening turns on once an Anthropic API key is configured.</p>
      )}

      {reasoning && (
        <form action={overrideAction} className="space-y-2 border-t border-[var(--color-border)] pt-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <FormError>{overrideState?.error}</FormError>
          <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">
            Recruiter override {overrideNote && "(recorded)"}
          </p>
          <Textarea name="screeningOverrideNote" defaultValue={overrideNote ?? ""} placeholder="Note why you agree or disagree with the AI's score, if relevant." />
          <Button type="submit" variant="ghost" size="sm" disabled={overridePending}>
            {overridePending ? "Saving…" : "Save override note"}
          </Button>
        </form>
      )}
    </div>
  );
}
