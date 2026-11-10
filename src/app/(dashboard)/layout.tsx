import Link from "next/link";
import { readSession, homeRoute } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLE_LABEL } from "@/lib/nav";
import { logoutAction } from "@/lib/authActions";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AgentBubble } from "@/components/agent/AgentBubble";
import { Logo } from "@/components/ui/Logo";
import { HospitalSwitcher } from "@/components/workspace/HospitalSwitcher";
import { GuideBanner } from "@/components/workspace/GuideBanner";
import { db } from "@/lib/db";
import { hospitalAccent } from "@/lib/hospitalTheme";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/login");
  const [hospital, hospitals] = await Promise.all([
    db.hospital.findUnique({ where: { id: session.hospitalId }, select: { name: true, slug: true } }),
    session.isPlatformAdmin
      ? db.hospital.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);
  const accent = hospitalAccent(hospital?.slug ?? "", 0);
  const switcherOptions = hospitals.map((h, i) => ({ id: h.id, name: h.name, accent: hospitalAccent(h.slug, i) }));

  return (
    <NotificationProvider>
      <div className="flex min-h-screen flex-col">
        <div className="h-1 w-full print:hidden" style={{ backgroundColor: accent }} aria-hidden />
        <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 print:hidden">
          <div className="flex items-center gap-4">
            <Link href={homeRoute(session)} className="flex items-center gap-2">
              <Logo size={28} />
              <span className="text-sm font-semibold text-[var(--color-text)]">CareNexa</span>
              <span className="flex items-center gap-1.5 border-l border-[var(--color-border)] pl-3 text-sm font-medium" style={{ color: accent }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                {hospital?.name ?? "Hospital unavailable"}
              </span>
            </Link>
            <Link href="/patients" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Patients
            </Link>
            <Link href="/referrals" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Referrals
            </Link>
            <Link href="/access-requests" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Record requests
            </Link>
            <Link href="/guide" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
              Guide
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {session.isPlatformAdmin && hospitals.length > 1 && (
              <HospitalSwitcher hospitals={switcherOptions} currentHospitalId={session.hospitalId} />
            )}
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
        <GuideBanner />

        <div className="flex flex-1 [&>*]:min-w-0 [&>*]:flex-1">{children}</div>
      </div>
      <AgentBubble />
    </NotificationProvider>
  );
}
