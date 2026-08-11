import Link from "next/link";
import { WorkspaceNavLink } from "./WorkspaceNavLink";

type NavItem = { label: string; href: string; badge?: number };

export function WorkspaceShell({
  departmentName,
  baseHref,
  queueCount,
  showQueue = true,
  queueLabel = "Queue",
  isAdminVisiting,
  extraNavItems = [],
  children,
}: {
  departmentName: string;
  baseHref: string;
  queueCount: number;
  showQueue?: boolean;
  queueLabel?: string;
  isAdminVisiting: boolean;
  extraNavItems?: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="flex w-56 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3.5">
          <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Workspace</p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--color-text)]">{departmentName}</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          <WorkspaceNavLink href={baseHref} label="Overview" exact />
          {showQueue && (
            <WorkspaceNavLink
              href={`${baseHref}/queue`}
              label={queueLabel}
              badge={queueCount}
              liveQueueBadge={!isAdminVisiting}
            />
          )}
          {extraNavItems.map((item) => (
            <WorkspaceNavLink key={item.href} href={item.href} label={item.label} badge={item.badge} />
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        {isAdminVisiting && (
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] px-6 py-2 text-sm text-[var(--color-warning)]">
            <span>
              You&rsquo;re viewing <strong>{departmentName}</strong> as Administrator — actions here are attributed to you, not the resident team.
            </span>
            <Link href="/admin" className="font-medium whitespace-nowrap hover:underline">
              ← Hospital overview
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
