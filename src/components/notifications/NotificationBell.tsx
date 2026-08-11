"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotifications } from "./NotificationProvider";

export function NotificationBell() {
  const { feed, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-page)] hover:text-[var(--color-text)]"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4.5 w-4.5">
          <path d="M10 2a6 6 0 00-6 6v3.09c0 .55-.2 1.08-.56 1.5L2 14.5c-.6.7-.1 1.5.8 1.5h14.4c.9 0 1.4-.8.8-1.5l-1.44-1.91a2.4 2.4 0 01-.56-1.5V8a6 6 0 00-6-6z" />
          <path d="M8 16.5a2 2 0 004 0h-4z" />
        </svg>
        {feed.unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold text-white">
            {feed.unreadCount > 9 ? "9+" : feed.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-modal-in absolute right-0 z-50 mt-2 w-80 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">Notifications</p>
            {feed.unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[var(--color-brand)] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {feed.notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">Nothing yet.</p>
            ) : (
              feed.notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.requestId ? `/requests/${n.requestId}` : "#"}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                  }}
                  className={`block border-b border-[var(--color-border)] px-3 py-2.5 text-sm last:border-0 hover:bg-[var(--color-page)] ${
                    !n.readAt ? "bg-[var(--color-brand-soft)]" : ""
                  }`}
                >
                  <p className="text-[var(--color-text)]">{n.message}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
                    {new Date(n.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
