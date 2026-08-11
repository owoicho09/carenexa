"use client";

import { useActionState } from "react";
import { scheduleInterviewAction, recordInterviewOutcomeAction } from "./actions";
import { Field, Input, Textarea, FormError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useActionToast } from "@/components/ui/SubmitWithToast";

type Interview = { scheduledFor: Date; outcome: string | null } | null;

export function InterviewPanel({ applicationId, interview }: { applicationId: string; interview: Interview }) {
  const [scheduleState, scheduleAction, schedulePending] = useActionState(scheduleInterviewAction, undefined);
  const [outcomeState, outcomeAction, outcomePending] = useActionState(recordInterviewOutcomeAction, undefined);
  useActionToast(schedulePending, Boolean(scheduleState?.error), "Interview scheduled");
  useActionToast(outcomePending, Boolean(outcomeState?.error), "Interview outcome recorded");

  if (!interview) {
    return (
      <form action={scheduleAction} className="space-y-3">
        <input type="hidden" name="applicationId" value={applicationId} />
        <FormError>{scheduleState?.error}</FormError>
        <Field label="Interview date & time" htmlFor="scheduledFor">
          <Input id="scheduledFor" name="scheduledFor" type="datetime-local" required />
        </Field>
        <Button type="submit" variant="secondary" disabled={schedulePending}>
          {schedulePending ? "Scheduling…" : "Schedule interview"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text)]">
        Scheduled for {interview.scheduledFor.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
      </p>
      {interview.outcome ? (
        <p className="text-sm text-[var(--color-text-muted)]">Outcome: {interview.outcome}</p>
      ) : (
        <form action={outcomeAction} className="space-y-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          <FormError>{outcomeState?.error}</FormError>
          <Field label="Interview outcome" htmlFor="outcome">
            <Textarea id="outcome" name="outcome" required placeholder="Notes from the interview panel." />
          </Field>
          <Button type="submit" variant="secondary" disabled={outcomePending}>
            {outcomePending ? "Saving…" : "Record outcome"}
          </Button>
        </form>
      )}
    </div>
  );
}
