import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getAiClient } from "@/lib/ai/client";

const AGENT_MODEL = process.env.ANTHROPIC_MODEL_AGENT || "claude-sonnet-5-5";
import { toolsForRole, findTool } from "@/lib/agent/tools";
import type { SessionPayload } from "@/lib/auth";

type AnthropicMessage = Anthropic.Messages.MessageParam;
type ToolResultBlock = Anthropic.Messages.ToolResultBlockParam;

export type PendingConfirmation = {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  summary: string;
};

export type AgentTurnResult =
  | { done: true; messages: AnthropicMessage[]; reply: string }
  | { done: false; messages: AnthropicMessage[]; pendingConfirmation: PendingConfirmation; partialToolResults: ToolResultBlock[] };

const MAX_STEPS = 8;

function buildSystemPrompt(session: SessionPayload) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `You are the CareNexa Assistant — a sharp, warm, real-time assistant working alongside ${session.fullName} (role: ${session.role}${session.departmentSlug ? `, department: ${session.departmentSlug}` : ""}) inside CareNexa Hospital's system. Today is ${today}.

How you work:
- Act like a capable colleague sitting next to them. Talk naturally and briefly, in plain conversational language — no robotic phrasing, no "As an AI", no long preambles.
- Be agentic: when a request needs information, go get it with your tools straight away instead of asking the person to look things up. Chain tools as needed (e.g. find_patient first to get an id, then act on it). Only ask a question when something is genuinely ambiguous (e.g. two patients match) or required details are missing.
- After you act, say what you found or did in a sentence or two, then offer the obvious next step ("Want me to send her to the lab?").
- Use short bullet points only when listing several items (queue entries, results). Keep names, times and numbers concrete. Never invent data — if a tool returns nothing, say so.
- Greetings and small talk: reply warmly in one line and offer what you can help with.

What you can do: find patients, summarise a patient's history, check this person's department queue and today's activity, and take actions using only the tools you've been given — these exactly match what this person could already do through the interface. If a capability isn't offered as a tool, their role doesn't have it; say so plainly and point them to who can.

Hard limits, no exceptions: you never diagnose, never create or decide a prescription (dispensing one a clinician already wrote is fine), never predict how a condition will progress, and never make a hiring decision. Those stay deliberate human actions.

Every action that changes data is shown to the person as a proposal they must confirm first. Never claim you've done something until the tool result confirms it. If they decline, acknowledge it simply and move on.`;
}

// Every assistant tool_use must be answered by a tool_result in the next user
// turn, or the API rejects the request. Fill any gaps (e.g. a turn paused on a
// confirmation that also contained other tool calls, or a cancelled action).
function repairToolResults(messages: AnthropicMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    out.push(msg);
    if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;
    const ids = msg.content.filter((b) => b.type === "tool_use").map((b) => (b as Anthropic.Messages.ToolUseBlockParam).id);
    if (ids.length === 0) continue;
    const next = messages[i + 1];
    const nextBlocks = next && next.role === "user" ? (Array.isArray(next.content) ? next.content : [{ type: "text", text: next.content } as Anthropic.Messages.TextBlockParam]) : null;
    const answered = new Set((nextBlocks ?? []).filter((b) => b.type === "tool_result").map((b) => (b as ToolResultBlock).tool_use_id));
    const missing: ToolResultBlock[] = ids.filter((id) => !answered.has(id)).map((id) => ({ type: "tool_result", tool_use_id: id, content: "Not run — this step was skipped. Ask again if still needed.", is_error: true }));
    if (missing.length === 0) continue;
    if (nextBlocks) {
      const results = nextBlocks.filter((b) => b.type === "tool_result");
      const rest = nextBlocks.filter((b) => b.type !== "tool_result");
      out.push({ role: "user", content: [...results, ...missing, ...rest] as Anthropic.Messages.ContentBlockParam[] });
      i++;
    } else {
      out.push({ role: "user", content: missing });
    }
  }
  // Merge consecutive user turns (e.g. a cancelled action followed by a new message).
  const merged: AnthropicMessage[] = [];
  for (const m of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === "user" && m.role === "user") {
      const toBlocks = (c: AnthropicMessage["content"]) => (typeof c === "string" ? [{ type: "text", text: c } as Anthropic.Messages.TextBlockParam] : c);
      const blocks = [...toBlocks(prev.content), ...toBlocks(m.content)];
      blocks.sort((a, b) => Number(b.type === "tool_result") - Number(a.type === "tool_result"));
      merged[merged.length - 1] = { role: "user", content: blocks as Anthropic.Messages.ContentBlockParam[] };
    } else merged.push(m);
  }
  return merged;
}

export async function runAgentLoop(
  session: SessionPayload,
  initialMessages: AnthropicMessage[]
): Promise<AgentTurnResult> {
  const anthropic = getAiClient();
  const toolDefs = toolsForRole(session.role).map((t) => t.definition);
  const conversation: AnthropicMessage[] = repairToolResults(initialMessages);

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(session),
      tools: toolDefs,
      messages: conversation,
    });

    conversation.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) {
      const reply = response.content.filter((b) => b.type === "text").map((b) => (b.type === "text" ? b.text : "")).join("\n\n").trim();
      return { done: true, messages: conversation, reply: reply || "Done — anything else?" };
    }

    const toolResults: ToolResultBlock[] = [];

    for (const block of toolUseBlocks) {
      const spec = findTool(block.name);
      const input = (block.input ?? {}) as Record<string, unknown>;

      if (!spec) {
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Unknown tool.", is_error: true });
        continue;
      }

      const allowed = spec.allowedRoles === "all" || spec.allowedRoles.includes(session.role);
      if (!allowed) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `This person's role (${session.role}) isn't permitted to use ${block.name}.`,
          is_error: true,
        });
        continue;
      }

      if (spec.mutating) {
        const summary = spec.describe ? await spec.describe(session, input) : `${block.name}(${JSON.stringify(input)})`;
        // Pause here — remaining tool_use blocks in this same turn (if any) are left
        // unresolved; the confirm step re-enters the loop with this result merged in.
        return {
          done: false,
          messages: conversation,
          pendingConfirmation: { toolUseId: block.id, toolName: block.name, input, summary },
          partialToolResults: toolResults,
        };
      }

      const result = await spec.run(session, input).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Tool failed." }));
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.ok ? result.message : `Error: ${result.error}`,
        is_error: !result.ok,
      });
    }

    conversation.push({ role: "user", content: toolResults });
  }

  return {
    done: true,
    messages: conversation,
    reply: "I've gathered quite a bit — want me to keep going?",
  };
}

export async function executeConfirmedTool(
  session: SessionPayload,
  toolUseId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResultBlock> {
  const spec = findTool(toolName);
  if (!spec) return { type: "tool_result", tool_use_id: toolUseId, content: "Unknown tool.", is_error: true };

  const allowed = spec.allowedRoles === "all" || spec.allowedRoles.includes(session.role);
  if (!allowed) {
    return {
      type: "tool_result",
      tool_use_id: toolUseId,
      content: `This person's role (${session.role}) isn't permitted to use ${toolName}.`,
      is_error: true,
    };
  }

  const result = await spec.run(session, input);
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: result.ok ? result.message : `Error: ${result.error}`,
    is_error: !result.ok,
  };
}
