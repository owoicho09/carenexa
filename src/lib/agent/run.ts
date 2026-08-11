import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getAiClient, AI_MODEL_REASONING } from "@/lib/ai/client";
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

const MAX_STEPS = 4;

function buildSystemPrompt(session: SessionPayload) {
  return `You are the CareNexa Agent, helping ${session.fullName} (role: ${session.role}${session.departmentSlug ? `, department: ${session.departmentSlug}` : ""}) work faster inside CareNexa Hospital's system.

You can find patients, summarise a patient's history, check what's waiting in this person's own department queue, and answer questions about the hospital's own data — always scoped to what this person is allowed to see.

You can also act, but only using the tools you've been given — they exactly match what this person could already do themselves through the interface, nothing more. If a capability isn't offered to you as a tool, this person's role doesn't have it; say so plainly instead of trying to work around it.

Hard limits that apply no matter what, with no exceptions: you never diagnose a condition, you never decide or invent a prescription (dispensing a prescription a clinician already wrote is fine — creating a new one is not, and there is no tool for it), you never predict how a condition will progress, and you never make a hiring decision. Diagnosis, prescribing, and hiring stay deliberate human actions taken through the normal interface, never through you.

Every mutating action you take is shown to this person as a specific, concrete proposal before anything happens in the database — you cannot skip that step, and you should never claim to have done something before it's confirmed.

Be concise and direct. If you're missing an id (e.g. a patient id to act on), use find_patient first rather than asking the person to go look it up.`;
}

export async function runAgentLoop(
  session: SessionPayload,
  initialMessages: AnthropicMessage[]
): Promise<AgentTurnResult> {
  const anthropic = getAiClient();
  const toolDefs = toolsForRole(session.role).map((t) => t.definition);
  const conversation: AnthropicMessage[] = [...initialMessages];

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await anthropic.messages.create({
      model: AI_MODEL_REASONING,
      max_tokens: 1024,
      system: buildSystemPrompt(session),
      tools: toolDefs,
      messages: conversation,
    });

    conversation.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) {
      const text = response.content.find((b) => b.type === "text");
      return { done: true, messages: conversation, reply: text?.type === "text" ? text.text : "" };
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
        const summary = spec.describe ? await spec.describe(input) : `${block.name}(${JSON.stringify(input)})`;
        // Pause here — remaining tool_use blocks in this same turn (if any) are left
        // unresolved; the confirm step re-enters the loop with this result merged in.
        return {
          done: false,
          messages: conversation,
          pendingConfirmation: { toolUseId: block.id, toolName: block.name, input, summary },
          partialToolResults: toolResults,
        };
      }

      const result = await spec.run(session, input);
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
    reply: "That's a lot of steps — let me know if you'd like me to keep going.",
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
