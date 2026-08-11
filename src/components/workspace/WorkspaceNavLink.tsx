"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useNotifications } from "@/components/notifications/NotificationProvider";

export function WorkspaceNavLink({
  href,
  label,
  badge,
  exact = false,
  liveQueueBadge = false,
}: {
  href: string;
  label: string;
  badge?: number;
  exact?: boolean;
  liveQueueBadge?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const { feed } = useNotifications();
  const liveBadge = liveQueueBadge ? feed.queueCount : badge;

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-page)] hover:text-[var(--color-text)]"
      )}
    >
      <span>{label}</span>
      {typeof liveBadge === "number" && liveBadge > 0 && (
        <span
          className={clsx(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
            isActive ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-danger)] text-white"
          )}
        >
          {liveBadge}
        </span>
      )}
    </Link>
  );
}
