import "server-only";
import { db } from "@/lib/db";
import { generateText, AI_MODEL_REASONING, isAiConfigured } from "@/lib/ai/client";

const SYSTEM_PROMPT = `You screen a job candidate's CV against a specific role's stated requirements for a
Nigerian hospital. You do not decide whether to hire — a human recruiter reviews your score and reasoning
and may override it. Score strictly against the requirements given, not general impressiveness. Respond with
ONLY a JSON object, no markdown fences, no commentary: {"score": <integer 0-100>, "reasoning": "<2-4 sentences
citing specific requirements met or missed>"}.`;

export async function screenApplication(applicationId: string) {
  if (!isAiConfigured()) return { error: "AI is not configured (ANTHROPIC_API_KEY missing)." as const };

  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: { vacancy: true, candidate: true },
  });
  if (!application) return { error: "Application not found." as const };

  const prompt = `Role: ${application.vacancy.title}\nRequirements:\n${application.vacancy.requirements.map((r) => `- ${r}`).join("\n")}\n\nCandidate CV:\n${application.cvText}${application.coverNote ? `\n\nCover note:\n${application.coverNote}` : ""}`;

  const raw = await generateText({ model: AI_MODEL_REASONING, system: SYSTEM_PROMPT, prompt, maxTokens: 500 });

  let parsed: { score: number; reasoning: string };
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return { error: "The model didn't return valid JSON. Try again." as const };
  }

  await db.aiArtifact.create({
    data: {
      type: "CV_SCREENING",
      applicationId,
      model: AI_MODEL_REASONING,
      input: { prompt },
      output: parsed,
      requiresApproval: true,
    },
  });

  await db.application.update({
    where: { id: applicationId },
    data: {
      screeningScore: parsed.score,
      screeningReasoning: parsed.reasoning,
      stage: application.stage === "APPLIED" ? "SCREENED" : application.stage,
    },
  });

  return { score: parsed.score, reasoning: parsed.reasoning, error: null };
}
