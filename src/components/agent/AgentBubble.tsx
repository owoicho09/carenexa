"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

type ContentBlock = { type: string; text?: string; [key: string]: unknown };
type ChatMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };
type PendingConfirmation = { toolUseId: string; toolName: string; input: Record<string, unknown>; summary: string };

type AgentResponse = {
  error?: string;
  done: boolean;
  messages: ChatMessage[];
  reply?: string;
  pendingConfirmation?: PendingConfirmation;
  partialToolResults?: ContentBlock[];
};

const POSITION_KEY = "carenexa-agent-position";
const WELCOMED_KEY = "carenexa-agent-welcomed";
const DEFAULT_POSITION = { x: 24, y: 24 }; // distance from bottom-right

function readSavedPosition(): { x: number; y: number } {
  if (typeof window === "undefined") return DEFAULT_POSITION;
  try {
    const saved = window.localStorage.getItem(POSITION_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_POSITION;
  } catch {
    return DEFAULT_POSITION;
  }
}

function displayTurns(messages: ChatMessage[]): { role: "user" | "assistant"; text: string }[] {
  const turns: { role: "user" | "assistant"; text: string }[] = [];
  for (const m of messages) {
    if (typeof m.content === "string") {
      if (m.role === "user") turns.push({ role: "user", text: m.content });
      continue;
    }
    const text = m.content
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");
    if (text) turns.push({ role: m.role, text });
  }
  return turns;
}

export function AgentBubble() {
  const [open, setOpen] = useState(false);
  // Lazy initializer runs once on mount — the correct way to seed state from
  // localStorage without an effect or a ref read during render. The server always
  // renders DEFAULT_POSITION (no localStorage there), so this one style attribute
  // is expected to differ on first client paint — suppressed below, not patched up.
  const [position, setPosition] = useState(readSavedPosition);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [partialResults, setPartialResults] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; startPos: { x: number; y: number } } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending, loading]);

  useEffect(() => {
    // Open once per browser session so the agent introduces itself right after
    // login, without popping back open on every page navigation or refresh.
    if (!sessionStorage.getItem(WELCOMED_KEY)) {
      sessionStorage.setItem(WELCOMED_KEY, "1");
      // Deliberate: syncing with sessionStorage (a client-only external system) can
      // only happen post-mount, so a one-time render after mount is unavoidable here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { dragging: false, startX: e.clientX, startY: e.clientY, startPos: position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.dragging = true;
    if (!dragState.current.dragging) return;
    const next = {
      x: Math.max(8, dragState.current.startPos.x - dx),
      y: Math.max(8, dragState.current.startPos.y - dy),
    };
    setPosition(next);
  }

  function onPointerUp() {
    if (dragState.current?.dragging) {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } else {
      setOpen((o) => !o);
    }
    dragState.current = null;
  }

  async function send(text: string) {
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data: AgentResponse = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setMessages(data.messages);
      if (!data.done && data.pendingConfirmation) {
        setPending(data.pendingConfirmation);
        setPartialResults(data.partialToolResults ?? []);
      }
    } catch {
      setError("Couldn't reach the agent. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!pending) return;
    setLoading(true);
    setError(null);
    const { toolUseId, toolName, input: toolInput } = pending;
    setPending(null);
    try {
      const res = await fetch("/api/agent/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, toolUseId, toolName, input: toolInput, partialToolResults: partialResults }),
      });
      const data: AgentResponse = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setMessages(data.messages);
      if (!data.done && data.pendingConfirmation) {
        setPending(data.pendingConfirmation);
        setPartialResults(data.partialToolResults ?? []);
      } else {
        setPartialResults([]);
      }
    } catch {
      setError("Couldn't reach the agent. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    if (!pending) return;
    const declineResult: ContentBlock = {
      type: "tool_result",
      tool_use_id: pending.toolUseId,
      content: "The user chose not to proceed with this action.",
      is_error: true,
    };
    setMessages([...messages, { role: "user", content: [...partialResults, declineResult] }]);
    setPending(null);
    setPartialResults([]);
  }

  const turns = displayTurns(messages);

  return (
    <div
      className="fixed z-[70] print:hidden"
      style={{ right: position.x, bottom: position.y }}
      suppressHydrationWarning
    >
      {open && (
        <div className="animate-modal-in mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-brand)] px-4 py-3 text-white">
            <span className="text-sm font-semibold">CareNexa Agent</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="Close">✕</button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {turns.length === 0 && !loading && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Hi, I&rsquo;m your CareNexa AI assistant. What would you like to do — find a patient record, or get a summary of today&rsquo;s activity?
              </p>
            )}
            {turns.map((t, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  t.role === "user"
                    ? "ml-auto bg-[var(--color-brand)] text-white"
                    : "bg-[var(--color-page)] text-[var(--color-text)]"
                }`}
              >
                {t.text}
              </div>
            ))}

            {pending && (
              <div className="animate-backdrop-in rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-sm">
                <p className="font-medium text-[var(--color-warning)]">The agent wants to:</p>
                <p className="mt-1 text-[var(--color-text)]">{pending.summary}</p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={cancel} disabled={loading}>Cancel</Button>
                  <Button size="sm" onClick={confirm} disabled={loading}>{loading ? "Working…" : "Confirm"}</Button>
                </div>
              </div>
            )}

            {loading && !pending && <p className="text-sm text-[var(--color-text-faint)]">Thinking…</p>}
            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim() && !loading && !pending) send(input.trim());
            }}
            className="flex gap-2 border-t border-[var(--color-border)] p-3"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !loading && !pending) send(input.trim());
                }
              }}
              placeholder={pending ? "Resolve the proposal above first…" : "Ask the agent…"}
              disabled={loading || Boolean(pending)}
              className="min-h-10 flex-1 resize-none py-2"
              rows={1}
            />
            <Button type="submit" size="sm" disabled={loading || Boolean(pending) || !input.trim()}>Send</Button>
          </form>
        </div>
      )}

      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex touch-none items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white shadow-xl transition-transform hover:scale-[1.03] active:scale-95"
        aria-label={open ? "Close CareNexa AI Agent" : "Open CareNexa AI Agent"}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0">
          <path
            d="M12 2.5l1.8 4.2 4.2 1.8-4.2 1.8L12 14.5l-1.8-4.2L6 8.5l4.2-1.8L12 2.5z"
            fill="currentColor"
          />
          <path d="M19 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1L16 17l2.1-.9L19 14z" fill="currentColor" />
        </svg>
        CareNexa AI Agent
      </button>
    </div>
  );
}
