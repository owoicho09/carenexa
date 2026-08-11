"use client";

import { useActionState, useEffect, useState } from "react";
import { sendCommunicationAction, confirmDeliveryAction } from "@/app/(dashboard)/patients/[id]/actions";
import { MESSAGE_TEMPLATES } from "@/lib/messageTemplates";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea, FormError } from "@/components/ui/Field";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { clsx } from "clsx";

type Channel = "WHATSAPP" | "EMAIL";

export function ComposeMessageButton({ patientId, patientFirstName }: { patientId: string; patientFirstName: string }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateUsed, setTemplateUsed] = useState("");
  const [deliveryState, setDeliveryState] = useState<"idle" | "sent" | "delivered">("idle");
  const [handledId, setHandledId] = useState<string | undefined>(undefined);
  const [state, formAction, pending] = useActionState(sendCommunicationAction, undefined);
  const { showToast } = useNotifications();

  if (state?.communicationId && state.communicationId !== handledId) {
    setHandledId(state.communicationId);
    setDeliveryState("sent");
  }

  useEffect(() => {
    if (deliveryState !== "sent" || !handledId) return;
    showToast(`${channel === "WHATSAPP" ? "WhatsApp" : "Email"} message sent`);
    const timeout = setTimeout(async () => {
      await confirmDeliveryAction(handledId);
      setDeliveryState("delivered");
      showToast("Message delivered");
    }, 1600);
    return () => clearTimeout(timeout);
  }, [deliveryState, handledId, channel, showToast]);

  function reset() {
    setSubject("");
    setBody("");
    setTemplateUsed("");
    setDeliveryState("idle");
    setHandledId(undefined);
  }

  function applyTemplate(key: string) {
    setTemplateUsed(key);
    const tpl = MESSAGE_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    setBody(tpl.body(patientFirstName));
    if (tpl.subject) setSubject(tpl.subject);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Message patient</Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Message patient"
        description="Simulated for this demo — no real WhatsApp/email is sent, but it's logged exactly as if it were."
      >
        {deliveryState !== "idle" ? (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-page)] p-4">
              {channel === "EMAIL" && <p className="mb-1 text-sm font-semibold text-[var(--color-text)]">{subject}</p>}
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">{body}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                  deliveryState === "delivered"
                    ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                )}
              >
                {deliveryState === "delivered" ? "✓✓ Delivered" : "✓ Sent"}
              </span>
              {deliveryState === "sent" && <span className="text-[var(--color-text-faint)]">Waiting for delivery confirmation…</span>}
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="channel" value={channel} />
            <input type="hidden" name="templateUsed" value={templateUsed} />
            <FormError>{state?.error}</FormError>

            <div className="flex gap-2">
              {(["WHATSAPP", "EMAIL"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={clsx(
                    "rounded-md border px-3 py-1.5 text-sm font-medium",
                    channel === c
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                      : "border-[var(--color-border-strong)] text-[var(--color-text-muted)]"
                  )}
                >
                  {c === "WHATSAPP" ? "WhatsApp" : "Email"}
                </button>
              ))}
            </div>

            <Field label="Template" htmlFor="template" hint="Optional — fills the message below, still editable.">
              <Select id="template" value={templateUsed} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">Write from scratch</option>
                {MESSAGE_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </Select>
            </Field>

            {channel === "EMAIL" && (
              <Field label="Subject" htmlFor="subject">
                <Input id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </Field>
            )}

            <Field label="Message" htmlFor="body">
              <Textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} required className="min-h-32" />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" disabled={pending || !body.trim()}>
                {pending ? "Sending…" : `Send ${channel === "WHATSAPP" ? "WhatsApp" : "Email"}`}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
