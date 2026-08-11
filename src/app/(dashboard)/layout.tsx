import Link from "next/link";
import { readSession, homeRoute } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLE_LABEL } from "@/lib/nav";
import { logoutAction } from "@/lib/authActions";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AgentBubble } from "@/components/agent/AgentBubble";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/login");

  return (
    <NotificationProvider>
      <div className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 print:hidden">
          <div className="flex items-center gap-4">
            <Link href={homeRoute(session)} className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-brand)] text-xs font-semibold text-white">
                CN
              </div>
              <span className="text-sm font-semibold text-[var(--color-text)]">CareNexa</span>
            </Link>
            <Link href="/patients" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Patients
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/settings" className="text-right hover:opacity-80">
              <p className="text-sm font-medium text-[var(--color-text)]">{session.fullName}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{ROLE_LABEL[session.role]}</p>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-page)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="flex flex-1">{children}</div>
      </div>
      <AgentBubble />
    </NotificationProvider>
  );
}
