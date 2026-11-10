// Pure parsing + validation of model output for clinical insights. The model
// is constrained by a JSON schema, but its output is still untrusted: every
// observation must cite record IDs that were actually provided (i.e. records
// this hospital is authorized to see). Unknown IDs are dropped, and an
// observation left with no valid evidence is discarded.

export const INSIGHT_JSON_SCHEMA = {
  name: "clinical_insights",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["observations", "limitations"],
    properties: {
      observations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "summary", "evidenceRefs"],
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            evidenceRefs: { type: "array", items: { type: "string" } },
          },
        },
      },
      limitations: { type: "array", items: { type: "string" } },
    },
  },
} as const;

export type RawObservation = { title: string; summary: string; evidenceRefs: string[] };
export type ParsedInsights = { observations: RawObservation[]; limitations: string[] };

function stripFences(raw: string) {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}

export function parseInsightResponse(raw: string): ParsedInsights | null {
  let value: unknown;
  try {
    value = JSON.parse(stripFences(raw));
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.observations)) return null;

  const observations = obj.observations.filter((item): item is RawObservation => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.title === "string" && typeof row.summary === "string" && Array.isArray(row.evidenceRefs) && row.evidenceRefs.every((ref) => typeof ref === "string");
  });
  const limitations = Array.isArray(obj.limitations) ? obj.limitations.filter((l): l is string => typeof l === "string" && l.trim().length > 0) : [];
  return { observations, limitations };
}

export function attachEvidence<T extends { recordId: string }>(observations: RawObservation[], records: T[]) {
  const byId = new Map(records.map((record) => [record.recordId, record]));
  return observations
    .map((observation) => ({
      title: observation.title.trim().slice(0, 160),
      summary: observation.summary.trim(),
      evidence: [...new Set(observation.evidenceRefs)].map((id) => byId.get(id)).filter((record): record is T => Boolean(record)),
    }))
    .filter((observation) => observation.title && observation.summary && observation.evidence.length > 0);
}
