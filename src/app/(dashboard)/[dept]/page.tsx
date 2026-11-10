import Link from "next/link";
import { db } from "@/lib/db";
import { requireDepartmentAccess } from "@/lib/workspace";
import { getPendingRequestsForDepartmentSlug } from "@/lib/queues";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";

const urgencyTone: Record<string, Tone> = { ROUTINE: "neutral", URGENT: "warning", EMERGENCY: "danger" };

function timeAgo(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function DepartmentOverviewPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  const { session, department } = await requireDepartmentAccess(dept);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [pending, completedToday] = await Promise.all([
    getPendingRequestsForDepartmentSlug(dept, session.hospitalId),
    db.request.count({ where: { hospitalId: session.hospitalId, toDepartmentId: department.id, status: "COMPLETED", completedAt: { gte: startOfToday } } }),
  ]);

  const urgentCount = pending.filter((r) => r.urgency !== "ROUTINE").length;
  const topWaiting = pending.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader title={department.name} description="What needs you right now." />

      <div className="grid grid-cols-3 gap-4">
        <Panel className="p-4">
          <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Waiting</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{pending.length}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Urgent</p>
          <p className={`mt-1 text-2xl font-semibold ${urgentCount > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"}`}>
            {urgentCount}
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Completed today</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{completedToday}</p>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Waiting for you</h2>
          {pending.length > 6 && (
            <Link href={`/${dept}/queue`} className="text-sm font-medium text-[var(--color-brand)] hover:underline">
              View all {pending.length} →
            </Link>
          )}
        </div>

        {topWaiting.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <p className="text-sm font-medium text-[var(--color-text)]">All caught up.</p>
            <p className="text-sm text-[var(--color-text-muted)]">Nothing is waiting in {department.name} right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {topWaiting.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-[var(--color-page)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-text)]">{r.visit.patient.fullName}</p>
                      <Badge tone={urgencyTone[r.urgency]}>{r.urgency}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                      {r.requestType} &middot; from {r.fromDepartment.name} &middot; &ldquo;{r.reason}&rdquo;
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--color-text-faint)]">{timeAgo(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
