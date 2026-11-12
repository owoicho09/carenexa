import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai/client";
import { runAgentLoop, executeConfirmedTool } from "@/lib/agent/run";
import type Anthropic from "@anthropic-ai/sdk";

type ConfirmBody = {
  messages: Anthropic.Messages.MessageParam[];
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  partialToolResults?: Anthropic.Messages.ToolResultBlockParam[];
};

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!isAiConfigured()) return NextResponse.json({ error: "The agent isn't configured." }, { status: 503 });

  const body = (await req.json()) as ConfirmBody;
  if (!body.toolUseId || !body.toolName) {
    return NextResponse.json({ error: "Missing tool call to confirm." }, { status: 400 });
  }

  const confirmedResult = await executeConfirmedTool(session, body.toolUseId, body.toolName, body.input ?? {});
  const mergedResults = [...(body.partialToolResults ?? []), confirmedResult];

  const conversation: Anthropic.Messages.MessageParam[] = [...body.messages, { role: "user", content: mergedResults }];

  let result;
  try {
    result = await runAgentLoop(session, conversation);
  } catch (e) {
    console.error("[agent]", e);
    return NextResponse.json({ error: "I hit a snag reaching the assistant — please try that again." }, { status: 502 });
  }

  if (result.done) {
    return NextResponse.json({ done: true, messages: result.messages, reply: result.reply, executed: !confirmedResult.is_error });
  }

  return NextResponse.json({
    done: false,
    messages: result.messages,
    pendingConfirmation: result.pendingConfirmation,
    partialToolResults: result.partialToolResults,
    executed: !confirmedResult.is_error,
  });
}
