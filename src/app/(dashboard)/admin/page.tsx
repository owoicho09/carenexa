import { computePilotMetrics } from "@/lib/pilotMetrics";
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { requireSession } from "@/lib/auth";

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: Tone }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "danger" ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"}`}>
        {value}
      </p>
    </Panel>
  );
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function timeAgo(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

export default async function AdminOverviewPage() {
  const session = await requireSession(["ADMIN"]);
  const [patientCount, openVisits, staffCount, departments, recentPatients, staleRequests] = await Promise.all([
    db.patient.count({ where: { hospitalId: session.hospitalId } }),
    db.visit.findMany({
      where: { hospitalId: session.hospitalId, status: "OPEN" },
      include: {
        patient: true,
        requests: { orderBy: { createdAt: "desc" }, take: 1, include: { toDepartment: true } },
      },
      orderBy: { openedAt: "desc" },
    }),
    db.staffMember.count({ where: { hospitalId: session.hospitalId, isActive: true } }),
    db.department.findMany({
      where: { hospitalId: session.hospitalId, isArchived: false, slug: { notIn: ["administration"] } },
      orderBy: { name: "asc" },
      include: { _count: { select: { staff: true } } },
    }),
    db.patient.findMany({ where: { hospitalId: session.hospitalId }, orderBy: { registeredAt: "desc" }, take: 5, include: { cardType: true } }),
    db.request.findMany({
      where: { hospitalId: session.hospitalId, status: { in: ["PENDING", "QUERIED"] }, createdAt: { lt: hoursAgo(2) } },
      include: { visit: { include: { patient: true } }, toDepartment: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
  ]);

  const departmentQueueCounts = await Promise.all(
    departments
      .filter((d) => d.acceptsRequestTypes.length > 0)
      .map(async (d) => ({
        department: d,
        pending: await db.request.count({ where: { hospitalId: session.hospitalId, toDepartmentId: d.id, status: { in: ["PENDING", "QUERIED"] } } }),
        urgent: await db.request.count({
          where: { hospitalId: session.hospitalId, toDepartmentId: d.id, status: { in: ["PENDING", "QUERIED"] }, urgency: { not: "ROUTINE" } },
        }),
      }))
  );

  const referrals = await db.referral.findMany({
    where: { OR: [{ sourceHospitalId: session.hospitalId }, { destinationHospitalId: session.hospitalId }] },
    select: { id: true, sourceHospitalId: true, destinationHospitalId: true, submittedAt: true, status: true, events: { select: { status: true, createdAt: true } } },
  });
  const pilotMetrics = computePilotMetrics(referrals, session.hospitalId);
  const OPEN_STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW", "ACCEPTED", "APPOINTMENT_SCHEDULED", "ARRIVAL_CONFIRMED", "TREATMENT_IN_PROGRESS", "DISCHARGED"];
  const incomingOpen = referrals.filter((r) => r.destinationHospitalId === session.hospitalId && OPEN_STATUSES.includes(r.status)).length;
  const incomingNew = referrals.filter((r) => r.destinationHospitalId === session.hospitalId && r.status === "SUBMITTED").length;
  const outgoingOpen = referrals.filter((r) => r.sourceHospitalId === session.hospitalId && [...OPEN_STATUSES, "DRAFT", "MORE_INFORMATION_REQUESTED", "COUNTER_REFERRAL_SUBMITTED"].includes(r.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Hospital overview" description="Who's here, where they are, and what's waiting." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="In the hospital now" value={openVisits.length} />
        <StatCard label="Registered patients" value={patientCount} />
        <StatCard label="Active staff" value={staffCount} />
        <StatCard label="Needs attention" value={staleRequests.length} tone={staleRequests.length > 0 ? "danger" : undefined} />
      </div>

      <Link
        href="/referrals"
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 hover:bg-[var(--color-page)] ${incomingNew > 0 ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">CareNexa Connect referrals</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {incomingNew > 0 ? `${incomingNew} new referral${incomingNew === 1 ? "" : "s"} waiting for this hospital · ` : ""}
            {incomingOpen} incoming in progress · {outgoingOpen} outgoing in progress
          </p>
        </div>
        <span className="text-sm font-medium text-[var(--color-brand)]">Open referrals →</span>
      </Link>

      <Panel>
        <PanelHeader title="CareNexa Connect pilot metrics" description="Calculated from persisted referral events." />
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
          <div><p className="text-xs text-[var(--color-text-muted)]">Avg. acknowledgment</p><p className="mt-1 text-lg font-semibold">{pilotMetrics.averageAcknowledgmentMinutes === null ? "—" : `${pilotMetrics.averageAcknowledgmentMinutes} min`}</p></div>
          <div><p className="text-xs text-[var(--color-text-muted)]">Completion</p><p className="mt-1 text-lg font-semibold">{pilotMetrics.completionRate === null ? "—" : `${pilotMetrics.completionRate}%`}</p></div>
          <div><p className="text-xs text-[var(--color-text-muted)]">Missing information</p><p className="mt-1 text-lg font-semibold">{pilotMetrics.missingInformationRate === null ? "—" : `${pilotMetrics.missingInformationRate}%`}</p></div>
          <div><p className="text-xs text-[var(--color-text-muted)]">Arrival confirmed</p><p className="mt-1 text-lg font-semibold">{pilotMetrics.arrivalConfirmationRate === null ? "—" : `${pilotMetrics.arrivalConfirmationRate}%`}</p></div>
          <div><p className="text-xs text-[var(--color-text-muted)]">Summary returned</p><p className="mt-1 text-lg font-semibold">{pilotMetrics.dischargeSummaryReturnRate === null ? "—" : `${pilotMetrics.dischargeSummaryReturnRate}%`}</p></div>
        </div>
      </Panel>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Enter a department</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {departmentQueueCounts.map(({ department, pending, urgent }) => (
            <Link
              key={department.id}
              href={`/${department.slug}`}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-brand)]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">{department.name}</p>
                {pending > 0 && <Badge tone={urgent > 0 ? "danger" : "warning"}>{pending}</Badge>}
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{department._count.staff} staff</p>
            </Link>
          ))}
          {departments.filter((d) => d.acceptsRequestTypes.length === 0).map((d) => (
            <Link
              key={d.id}
              href={`/${d.slug}`}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-brand)]"
            >
              <p className="text-sm font-semibold text-[var(--color-text)]">{d.name}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{d._count.staff} staff</p>
            </Link>
          ))}
        </div>
      </div>

      {staleRequests.length > 0 && (
        <Panel className="border-[var(--color-danger)]/30">
          <PanelHeader title="Sitting too long" description="Requests pending more than 2 hours." />
          <ul className="divide-y divide-[var(--color-border)]">
            {staleRequests.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-[var(--color-page)]">
                  <span className="text-sm text-[var(--color-text)]">
                    {r.visit.patient.fullName} <span className="text-[var(--color-text-muted)]">→ {r.toDepartment.name}</span>
                  </span>
                  <span className="text-xs font-medium text-[var(--color-danger)]">{timeAgo(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="In the hospital right now" description="Open visits and where the patient currently is." />
        {openVisits.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">Nobody currently has an open visit.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="py-2 font-medium">Currently at</th>
                <th className="py-2 font-medium">Since</th>
              </tr>
            </thead>
            <tbody>
              {openVisits.map((v) => (
                <tr key={v.id} className="group cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-page)]">
                  <td className="p-0">
                    <Link href={`/patients/${v.patient.id}`} className="block px-4 py-2.5 font-medium text-[var(--color-text)] group-hover:text-[var(--color-brand)]">
                      {v.patient.fullName}
                    </Link>
                  </td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{v.requests[0]?.toDepartment.name ?? "Records"}</td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{v.openedAt.toLocaleTimeString("en-NG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Recently registered" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Hospital No.</th>
              <th className="py-2 font-medium">Card Type</th>
              <th className="py-2 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody>
            {recentPatients.map((p) => (
              <tr key={p.id} className="group cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-page)]">
                <td className="p-0">
                  <Link href={`/patients/${p.id}`} className="block px-4 py-2.5 font-medium text-[var(--color-text)] group-hover:text-[var(--color-brand)]">
                    {p.fullName}
                  </Link>
                </td>
                <td className="py-2.5 font-mono text-xs text-[var(--color-text-muted)]">{p.hospitalNumber}</td>
                <td className="py-2.5 text-[var(--color-text-muted)]">{p.cardType.name}</td>
                <td className="py-2.5 text-[var(--color-text-muted)]">{p.registeredAt.toLocaleDateString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
