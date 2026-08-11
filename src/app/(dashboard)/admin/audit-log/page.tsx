import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";

const ACTION_LABEL: Record<string, string> = {
  STAFF_CREATED: "Staff created",
  STAFF_EDITED: "Staff edited",
  STAFF_DEACTIVATED: "Staff deactivated",
  STAFF_REACTIVATED: "Staff reactivated",
  STAFF_HIRED: "Staff hired",
  PATIENT_DELETED: "Patient deleted",
  PATIENT_RESTORED: "Patient restored",
  DEPARTMENT_CREATED: "Department created",
  DEPARTMENT_EDITED: "Department edited",
  CARD_TYPE_CREATED: "Card type created",
  CARD_TYPE_EDITED: "Card type edited",
};

export default async function AuditLogPage() {
  const entries = await db.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Who did what, to which record, and when." />
      <Panel>
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No activity recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="py-2 font-medium">Who</th>
                <th className="py-2 font-medium">Action</th>
                <th className="py-2 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                    {e.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="py-2.5 text-[var(--color-text)]">{e.actor.fullName}</td>
                  <td className="py-2.5">
                    <Badge tone="brand">{ACTION_LABEL[e.action] ?? e.action}</Badge>
                  </td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">
                    {e.targetLabel ?? e.targetId ?? "—"}
                    {e.detail && <span className="text-[var(--color-text-faint)]"> · {e.detail}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
