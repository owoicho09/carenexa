"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getNotificationFeed,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationFeed,
} from "@/app/(dashboard)/notificationActions";

const POLL_INTERVAL_MS = 6000;

type ToastTone = "success" | "brand" | "danger";

type Toast = {
  toastId: string;
  message: string;
  requestId?: string | null;
  tone: ToastTone;
};

type NotificationContextValue = {
  feed: NotificationFeed;
  markRead: (id: string) => void;
  markAllRead: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

const EMPTY_FEED: NotificationFeed = { unreadCount: 0, queueCount: 0, toastsEnabled: true, notifications: [] };

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [feed, setFeed] = useState<NotificationFeed>(EMPTY_FEED);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenIds = useRef<Set<string> | null>(null);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const toastId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { toastId, message, tone }]);
      setTimeout(() => dismissToast(toastId), 5000);
    },
    [dismissToast]
  );

  const poll = useCallback(async () => {
    const next = await getNotificationFeed();
    if (seenIds.current && next.toastsEnabled) {
      const fresh = next.notifications.filter((n) => !n.readAt && !seenIds.current!.has(n.id));
      if (fresh.length > 0) {
        const newToasts: Toast[] = fresh.map((n) => ({
          toastId: `${n.id}-${Date.now()}`,
          message: n.message,
          requestId: n.requestId,
          tone: "brand",
        }));
        setToasts((prev) => [...prev, ...newToasts]);
        for (const t of newToasts) {
          setTimeout(() => dismissToast(t.toastId), 7000);
        }
      }
    }
    seenIds.current = new Set(next.notifications.map((n) => n.id));
    setFeed(next);
  }, [dismissToast]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  const markRead = (id: string) => {
    setFeed((prev) => ({
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - 1),
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    }));
    markNotificationReadAction(id);
  };

  const markAllRead = () => {
    setFeed((prev) => ({
      ...prev,
      unreadCount: 0,
      notifications: prev.notifications.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    }));
    markAllNotificationsReadAction();
  };

  const toneClass: Record<ToastTone, string> = {
    success: "border-[var(--color-success)]/30",
    brand: "border-[var(--color-border)]",
    danger: "border-[var(--color-danger)]/30",
  };

  const dotClass: Record<ToastTone, string> = {
    success: "bg-[var(--color-success)]",
    brand: "bg-[var(--color-brand)]",
    danger: "bg-[var(--color-danger)]",
  };

  return (
    <NotificationContext.Provider value={{ feed, markRead, markAllRead, showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.toastId}
            className={`animate-toast-in pointer-events-auto w-80 rounded-lg border ${toneClass[t.tone]} bg-[var(--color-surface)] p-3 shadow-lg`}
          >
            <div className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotClass[t.tone]}`} />
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text)]">{t.message}</p>
                {t.requestId && (
                  <Link
                    href={`/requests/${t.requestId}`}
                    onClick={() => dismissToast(t.toastId)}
                    className="mt-1 inline-block text-xs font-medium text-[var(--color-brand)] hover:underline"
                  >
                    View →
                  </Link>
                )}
              </div>
              <button
                onClick={() => dismissToast(t.toastId)}
                className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
