"use client";

import { useActionState } from "react";
import { generateClinicalInsightsAction, reviewClinicalInsightAction } from "@/app/(dashboard)/patients/[id]/aiActions";
import { Button } from "@/components/ui/Button";
import { FormError, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

type Evidence = {
  recordId: string;
  recordType: string;
  hospitalName: string;
  recordedAt: string;
  fact: string;
};

type Insight = {
  id: string;
  type: string;
  title: string;
  summary: string;
  evidence: unknown;
  createdAt: Date;
  requiresReview: boolean;
  model: string;
  provider: string;
  promptVersion: string;
};

type RuleFlag = {
  ruleId: string;
  title: string;
  detail: string;
  evidence: { recordId: string; recordType: string; recordedAt: string; fact: string }[];
};

const TYPE_LABEL: Record<string, string> = {
  RISK_ASSESSMENT: "Risk assessment",
  PATTERN_DETECTION: "Pattern detection",
  CLINICAL_INSIGHT: "Clinical insight",
  LONGITUDINAL_SUMMARY: "Longitudinal summary",
};

function when(iso: string | Date) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export function ClinicalInsightsPanel({
  patientId,
  aiConfigured,
  canReview,
  insights,
  ruleFlags,
  rulesVersion,
  dataGaps,
}: {
  patientId: string;
  aiConfigured: boolean;
  canReview: boolean;
  insights: Insight[];
  ruleFlags: RuleFlag[];
  rulesVersion: string;
  dataGaps: string[];
}) {
  const [state, formAction, pending] = useActionState(generateClinicalInsightsAction, undefined);

  return (
    <section className="space-y-5 border-t border-[var(--color-border)] pt-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Clinical intelligence</h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Assistive only. Nothing here is a diagnosis or an order, and nothing is added to the record without a clinician acting on it.
        </p>
      </div>

      {/* Deterministic, record-derived flags — not AI */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Rule-based flags</h3>
          <Badge tone="neutral">Deterministic · {rulesVersion}</Badge>
        </div>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">Restate recorded data at this hospital. Abnormality uses each laboratory&rsquo;s own reference range.</p>
        {ruleFlags.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No rule-based flags.</p>
        ) : (
          <ul className="space-y-1.5">
            {ruleFlags.map((flag) => (
              <li key={`${flag.ruleId}-${flag.title}`} className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                <p className="font-medium text-[var(--color-text)]">{flag.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{flag.detail}</p>
                <ul className="mt-1 space-y-0.5">
                  {flag.evidence.map((item) => (
                    <li key={item.recordId} className="text-xs text-[var(--color-text-faint)]">{item.recordType} · {when(item.recordedAt)} · {item.fact}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Model-generated observations */}
      <div>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">AI observations</h3>
            <Badge tone="warning">AI-generated suggestion</Badge>
          </div>
          {aiConfigured && (
            <form action={formAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="patientId" value={patientId} />
              <Select name="type" defaultValue="CLINICAL_INSIGHT" className="w-auto">
                {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Button type="submit" variant="secondary" size="sm" loading={pending}>
                {pending ? "Analyzing…" : "Generate insights"}
              </Button>
            </form>
          )}
        </div>

        {!aiConfigured && <p className="text-sm text-[var(--color-text-muted)]">OpenAI clinical insights are not configured.</p>}
        <FormError>{state?.error}</FormError>
        {state?.generated && <p role="status" className="text-sm text-[var(--color-success)]">Analysis complete. Review each observation and its evidence.</p>}

        {insights.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No AI observations have been generated.</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight) => {
              const evidence = Array.isArray(insight.evidence) ? insight.evidence as Evidence[] : [];
              return (
                <li key={insight.id} className="rounded-md border border-[var(--color-border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">{insight.title}</h4>
                      <Badge tone={insight.requiresReview ? "warning" : "success"}>
                        {insight.requiresReview ? "Needs review" : "Reviewed"}
                      </Badge>
                    </div>
                    <span className="text-xs text-[var(--color-text-faint)]">{TYPE_LABEL[insight.type] ?? insight.type} · {when(insight.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">{insight.summary}</p>
                  <div className="mt-3 border-t border-[var(--color-border)] pt-2">
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">Evidence</p>
                    <ul className="mt-1 space-y-1">
                      {evidence.map((item) => (
                        <li key={`${item.recordId}-${item.recordedAt}`} className="text-xs text-[var(--color-text-muted)]">
                          <span className="font-medium">{item.recordType}</span> · {item.hospitalName} · {when(item.recordedAt)} · {item.fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-[var(--color-text-faint)]">{insight.provider} · {insight.model} · {insight.promptVersion}</p>
                    {canReview && insight.requiresReview && (
                      <form action={reviewClinicalInsightAction}>
                        <input type="hidden" name="insightId" value={insight.id} />
                        <Button type="submit" variant="secondary" size="sm">Mark reviewed</Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* What the analysis could not see */}
      <div>
        <h3 className="mb-1.5 text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Data coverage and gaps</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-[var(--color-text-muted)]">
          {dataGaps.map((gap) => <li key={gap}>{gap}</li>)}
        </ul>
      </div>
    </section>
  );
}
