import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { NewDepartmentForm } from "./NewDepartmentForm";
import { RemoveDepartmentButton } from "./RemoveDepartmentButton";
import { restoreDepartmentAction } from "./actions";
import { requireSession } from "@/lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;
function addedRecently(createdAt: Date) {
  return Date.now() - createdAt.getTime() < DAY_MS;
}

export default async function DepartmentsPage() {
  const session = await requireSession(["ADMIN"]);

  const removed = await db.department.findMany({
    where: { hospitalId: session.hospitalId, isArchived: true },
    orderBy: { archivedAt: "desc" },
  });
  const departments = await db.department.findMany({
    where: { hospitalId: session.hospitalId, isArchived: false },
    orderBy: { name: "asc" },
    include: { _count: { select: { staff: true } } },
  });

  const newest = departments.reduce<(typeof departments)[number] | null>((latest, d) => (!latest || d.createdAt > latest.createdAt ? d : latest), null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="The departments patients move between. Add one and it's immediately available across the hospital."
      />

      <Panel className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Add a department</h2>
        <NewDepartmentForm />
      </Panel>

      <Panel>
        <PanelHeader title={`${departments.length} department${departments.length === 1 ? "" : "s"}`} description="Sorted alphabetically. Departments added in the last 24 hours are marked New." />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium">Patients can be sent for</th>
              <th className="py-2 font-medium">Staff</th>
              <th className="py-2 pr-4 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr
                key={d.id}
                id={`dept-${d.id}`}
                className={`group scroll-mt-24 cursor-pointer border-b border-[var(--color-border)] last:border-0 align-top hover:bg-[var(--color-page)] target:bg-[var(--color-success-soft)] ${newest?.id === d.id && addedRecently(d.createdAt) ? "bg-[var(--color-brand-soft)]" : ""}`}
              >
                <td className="p-0">
                  <Link href={`/admin/departments/${d.id}/edit`} className="block px-4 py-2.5 font-medium whitespace-nowrap text-[var(--color-text)] group-hover:text-[var(--color-brand)]">
                    {d.name}
                    {addedRecently(d.createdAt) && (
                      <span className="ml-2 rounded-full bg-[var(--color-success-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-success)] uppercase">New</span>
                    )}
                  </Link>
                </td>
                <td className="py-2.5 max-w-md text-[var(--color-text-muted)]">{d.description}</td>
                <td className="py-2.5">
                  <div className="flex max-w-xs flex-wrap gap-1">
                    {d.acceptsRequestTypes.length === 0 ? (
                      <span className="text-[var(--color-text-faint)]">—</span>
                    ) : (
                      d.acceptsRequestTypes.map((t) => <Badge key={t}>{t}</Badge>)
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-[var(--color-text-muted)]">{d._count.staff}</td>
                <td className="py-2.5 pr-4 text-right">{d.slug !== "administration" && <RemoveDepartmentButton departmentId={d.id} name={d.name} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {removed.length > 0 && (
        <Panel>
          <PanelHeader title={`Removed · ${removed.length}`} description="Hidden from the hospital. Their past requests and referrals are kept. Restore any time." />
          <ul className="divide-y divide-[var(--color-border)]">
            {removed.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-[var(--color-text-muted)]">{d.name}</span>
                <form action={restoreDepartmentAction}>
                  <input type="hidden" name="departmentId" value={d.id} />
                  <button type="submit" className="text-xs font-medium text-[var(--color-brand)] hover:underline">Restore</button>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
