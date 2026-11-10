import "server-only";
import { db } from "@/lib/db";
import { generateText, generateTextFromPdf, AI_MODEL_REASONING, isAiConfigured } from "@/lib/ai/client";

const SYSTEM_PROMPT = `You screen a job candidate's CV against a specific role's stated requirements for a
Nigerian hospital. You do not decide whether to hire — a human recruiter reviews your score and reasoning
and may override it. Score strictly against the requirements given, not general impressiveness. Respond with
ONLY a JSON object, no markdown fences, no commentary: {"score": <integer 0-100>, "reasoning": "<2-4 sentences
citing specific requirements met or missed>"}.`;

export async function screenApplication(applicationId: string, hospitalId: string, actorId: string) {
  if (!isAiConfigured()) return { error: "AI is not configured (ANTHROPIC_API_KEY missing)." as const };

  const application = await db.application.findUnique({
    where: { id: applicationId, hospitalId },
    include: { vacancy: true, candidate: true },
  });
  if (!application) return { error: "Application not found." as const };

  const roleContext = `Role: ${application.vacancy.title}\nRequirements:\n${application.vacancy.requirements.map((r) => `- ${r}`).join("\n")}${application.coverNote ? `\n\nCover note:\n${application.coverNote}` : ""}`;

  let raw: string;
  if (application.cvFileMimeType === "application/pdf" && application.cvFileData) {
    const pdfBase64 = Buffer.from(application.cvFileData).toString("base64");
    raw = await generateTextFromPdf({
      model: AI_MODEL_REASONING,
      system: SYSTEM_PROMPT,
      prompt: `${roleContext}\n\nThe candidate's CV is attached as a PDF — read it and score it.`,
      pdfBase64,
      maxTokens: 500,
    });
  } else if (application.cvText) {
    raw = await generateText({
      model: AI_MODEL_REASONING,
      system: SYSTEM_PROMPT,
      prompt: `${roleContext}\n\nCandidate CV:\n${application.cvText}`,
      maxTokens: 500,
    });
  } else {
    return {
      error:
        "Automatic screening isn't available for this file type (Word documents aren't supported yet) — download the CV and review it directly." as const,
    };
  }

  let parsed: { score: number; reasoning: string };
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return { error: "The model didn't return valid JSON. Try again." as const };
  }

  await db.aiArtifact.create({
    data: {
      hospitalId,
      type: "CV_SCREENING",
      applicationId,
      model: AI_MODEL_REASONING,
      provider: "ANTHROPIC",
      generatedById: actorId,
      promptVersion: "cv-screen-v1",
      input: { roleContext },
      output: parsed,
      requiresApproval: true,
    },
  });

  await db.application.update({
    where: { id: applicationId, hospitalId },
    data: {
      screeningScore: parsed.score,
      screeningReasoning: parsed.reasoning,
      stage: application.stage === "APPLIED" ? "SCREENED" : application.stage,
    },
  });

  return { score: parsed.score, reasoning: parsed.reasoning, error: null };
}
