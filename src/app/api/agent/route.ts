import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai/client";
import { runAgentLoop } from "@/lib/agent/run";
import type Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!isAiConfigured()) return NextResponse.json({ error: "The agent isn't configured (ANTHROPIC_API_KEY missing)." }, { status: 503 });

  const body = (await req.json()) as { messages: Anthropic.Messages.MessageParam[] };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "No messages given." }, { status: 400 });
  }

  const result = await runAgentLoop(session, body.messages);

  if (result.done) {
    return NextResponse.json({ done: true, messages: result.messages, reply: result.reply });
  }

  return NextResponse.json({
    done: false,
    messages: result.messages,
    pendingConfirmation: result.pendingConfirmation,
    partialToolResults: result.partialToolResults,
  });
}
