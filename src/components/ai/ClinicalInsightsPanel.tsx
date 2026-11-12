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
  CLINICAL_INSIGHT: "Anything to note",
  RISK_ASSESSMENT: "Possible risks",
  PATTERN_DETECTION: "Patterns over time",
  LONGITUDINAL_SUMMARY: "Full history summary",
};

type Priority = "High" | "Moderate" | "Low";
const PRIORITY_TONE: Record<Priority, "danger" | "warning" | "neutral"> = { High: "danger", Moderate: "warning", Low: "neutral" };
const PRIORITY_RANK: Record<Priority, number> = { High: 0, Moderate: 1, Low: 2 };

// Titles arrive as "[High] Blood pressure rising…" — split the tag into a badge.
function splitPriority(title: string): { priority: Priority | null; text: string } {
  const match = /^\s*\[(High|Moderate|Low)\]\s*/i.exec(title);
  if (!match) return { priority: null, text: title };
  const word = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  return { priority: word as Priority, text: title.slice(match[0].length) };
}

function when(iso: string | Date) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export function ClinicalInsightsPanel({
  patientId,
  aiConfigured,
  canReview,
  insights,
  ruleFlags,
  dataGaps,
}: {
  patientId: string;
  aiConfigured: boolean;
  canReview: boolean;
  insights: Insight[];
  ruleFlags: RuleFlag[];
  dataGaps: string[];
}) {
  const [state, formAction, pending] = useActionState(generateClinicalInsightsAction, undefined);
  // Newest run first; within a run, most urgent first.
  const ordered = [...insights].sort((a, b) => {
    const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (Math.abs(t) > 60_000) return t;
    const pa = splitPriority(a.title).priority, pb = splitPriority(b.title).priority;
    return (pa ? PRIORITY_RANK[pa] : 3) - (pb ? PRIORITY_RANK[pb] : 3);
  });

  return (
    <section className="space-y-5 border-t border-[var(--color-border)] pt-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Clinical insights</h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Things worth a second look in this patient&rsquo;s records. Suggestions only — nothing here changes the record.
        </p>
      </div>

      {/* Deterministic, record-derived flags — not AI */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Flags from the record</h3>
          <Badge tone="neutral">Automatic</Badge>
        </div>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">Picked out automatically: allergies, abnormal results and missed follow-ups.</p>
        {ruleFlags.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Nothing flagged.</p>
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
            <h3 className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">AI suggestions</h3>
            <Badge tone="warning">Check before acting</Badge>
          </div>
          {aiConfigured && (
            <form action={formAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="patientId" value={patientId} />
              <Select name="type" defaultValue="CLINICAL_INSIGHT" className="w-auto">
                {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Button type="submit" variant="secondary" size="sm" loading={pending}>
                {pending ? "Analysing record…" : "Ask AI"}
              </Button>
            </form>
          )}
        </div>

        {!aiConfigured && <p className="text-sm text-[var(--color-text-muted)]">AI suggestions aren&rsquo;t switched on yet.</p>}
        <FormError>{state?.error}</FormError>
        {pending && <p role="status" className="mb-2 animate-pulse text-sm text-[var(--color-text-muted)]">Reviewing every visit, vital, lab result and prescription on file…</p>}
        {state?.generated && !pending && <p role="status" className="mb-2 text-sm text-[var(--color-success)]">Analysis complete. Most urgent findings are listed first, each linked to the records it is based on.</p>}

        {insights.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Pick an analysis (possible risks, patterns over time, anything to note, or a full history) and press Ask AI. CareNexa reviews the whole record and cites the exact entries behind every finding.</p>
        ) : (
          <ul className="space-y-3">
            {ordered.map((insight) => {
              const { priority, text: titleText } = splitPriority(insight.title);
              const evidence = Array.isArray(insight.evidence) ? insight.evidence as Evidence[] : [];
              return (
                <li key={insight.id} className="rounded-md border border-[var(--color-border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {priority && <Badge tone={PRIORITY_TONE[priority]}>{priority} priority</Badge>}
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">{titleText}</h4>
                      <Badge tone={insight.requiresReview ? "warning" : "success"}>
                        {insight.requiresReview ? "Needs review" : "Reviewed"}
                      </Badge>
                    </div>
                    <span className="text-xs text-[var(--color-text-faint)]">{TYPE_LABEL[insight.type] ?? insight.type} · {when(insight.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">{insight.summary}</p>
                  <div className="mt-3 border-t border-[var(--color-border)] pt-2">
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">Based on {evidence.length} record{evidence.length === 1 ? "" : "s"}</p>
                    <ul className="mt-1 space-y-1">
                      {evidence.map((item) => (
                        <li key={`${item.recordId}-${item.recordedAt}`} className="text-xs text-[var(--color-text-muted)]">
                          <span className="font-medium">{item.recordType}</span> · {item.hospitalName} · {when(item.recordedAt)} · {item.fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span />
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
        <h3 className="mb-1.5 text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Not included</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-[var(--color-text-muted)]">
          {dataGaps.map((gap) => <li key={gap}>{gap}</li>)}
        </ul>
      </div>
    </section>
  );
}
