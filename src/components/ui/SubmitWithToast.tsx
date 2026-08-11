"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { Button } from "@/components/ui/Button";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

function useToastOnSubmit(successMessage: string) {
  const { pending } = useFormStatus();
  const { showToast } = useNotifications();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) showToast(successMessage);
    wasPending.current = pending;
  }, [pending, showToast, successMessage]);

  return pending;
}

// For bare/inline text-style submit buttons (e.g. underlined action links in tables).
export function SubmitWithToast({
  successMessage,
  children,
  ...buttonProps
}: { successMessage: string; children: React.ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  const pending = useToastOnSubmit(successMessage);
  return (
    <button type="submit" disabled={pending} {...buttonProps}>
      {children}
    </button>
  );
}

// For components built on useActionState — fires once when a pending submission
// resolves without an error.
export function useActionToast(pending: boolean, hasError: boolean, message: string) {
  const { showToast } = useNotifications();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !hasError) showToast(message);
    wasPending.current = pending;
  }, [pending, hasError, showToast, message]);
}

// For the styled <Button> component.
export function ToastButton({
  successMessage,
  children,
  ...buttonProps
}: { successMessage: string; children: React.ReactNode } & Omit<ComponentProps<typeof Button>, "type" | "disabled">) {
  const pending = useToastOnSubmit(successMessage);
  return (
    <Button type="submit" loading={pending} {...buttonProps}>
      {children}
    </Button>
  );
}
