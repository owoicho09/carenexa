import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export type AiProvider = "ANTHROPIC" | "OPENAI";

// Cheap/fast model for high-volume, low-risk tasks: summarising, note structuring.
export const AI_MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001";
// Stronger model for judgement-adjacent tasks where reasoning quality matters: CV screening.
export const AI_MODEL_REASONING = process.env.ANTHROPIC_MODEL_REASONING || "claude-sonnet-5";
export const AI_MODEL_CLINICAL = process.env.OPENAI_MODEL_CLINICAL || "gpt-4.1-mini";

let client: Anthropic | null = null;

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getAiClient() {
  if (!isAiConfigured()) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// jsonSchema: when set on the OpenAI path, the response is constrained with
// strict structured outputs. Callers must still validate what comes back.
export type JsonSchemaSpec = { name: string; schema: Record<string, unknown> };

export async function generateText(input: { provider?: AiProvider; model: string; system: string; prompt: string; maxTokens?: number; jsonSchema?: JsonSchemaSpec }) {
  if (input.provider === "OPENAI") return generateOpenAiText(input);
  const anthropic = getAiClient();
  const message = await anthropic.messages.create({
    model: input.model,
    max_tokens: input.maxTokens ?? 1024,
    system: input.system,
    messages: [{ role: "user", content: input.prompt }],
  });
  const block = message.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}

async function generateOpenAiText(input: { model: string; system: string; prompt: string; maxTokens?: number; jsonSchema?: JsonSchemaSpec }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_completion_tokens: input.maxTokens ?? 1024,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
      ...(input.jsonSchema
        ? { response_format: { type: "json_schema", json_schema: { name: input.jsonSchema.name, strict: true, schema: input.jsonSchema.schema } } }
        : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}).`);
  const result = await response.json() as { choices?: { message?: { content?: string | null } }[] };
  return result.choices?.[0]?.message?.content ?? "";
}

// Claude reads the PDF directly (native document support) — no separate text
// extraction library needed for the CV-upload flow.
export async function generateTextFromPdf(input: {
  model: string;
  system: string;
  prompt: string;
  pdfBase64: string;
  maxTokens?: number;
}) {
  const anthropic = getAiClient();
  const message = await anthropic.messages.create({
    model: input.model,
    max_tokens: input.maxTokens ?? 1024,
    system: input.system,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 } },
          { type: "text", text: input.prompt },
        ],
      },
    ],
  });
  const block = message.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}
