import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Cheap/fast model for high-volume, low-risk tasks: summarising, note structuring.
export const AI_MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001";
// Stronger model for judgement-adjacent tasks where reasoning quality matters: CV screening.
export const AI_MODEL_REASONING = process.env.ANTHROPIC_MODEL_REASONING || "claude-sonnet-5";

let client: Anthropic | null = null;

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAiClient() {
  if (!isAiConfigured()) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function generateText(input: { model: string; system: string; prompt: string; maxTokens?: number }) {
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
