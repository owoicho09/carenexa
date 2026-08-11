import "server-only";
import { generateText, AI_MODEL_FAST } from "@/lib/ai/client";

const SYSTEM_PROMPT = `You turn a clinician's shorthand into a structured clinical note draft. You only expand
and organise what the shorthand already implies — never add a finding, diagnosis, or plan that isn't stated
or clearly implied. Use short labelled lines: History, Examination, Impression (omit a line if the shorthand
gives nothing for it). Plain text, no markdown. This is a DRAFT the clinician will read, edit, and sign before
it becomes part of the record — write it as a strong starting point, not a finished authority.`;

export async function draftClinicalNote(shorthand: string) {
  return generateText({
    model: AI_MODEL_FAST,
    system: SYSTEM_PROMPT,
    prompt: shorthand,
    maxTokens: 400,
  });
}
