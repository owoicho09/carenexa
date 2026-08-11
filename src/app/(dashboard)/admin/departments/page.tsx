import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { NewDepartmentForm } from "./NewDepartmentForm";
import { requireSession } from "@/lib/auth";

export default async function DepartmentsPage() {
  await requireSession(["ADMIN"]);

  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { staff: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Departments are configured here, not in code. Add one and it's immediately usable across the hospital."
      />

      <Panel>
        <PanelHeader title={`${departments.length} department${departments.length === 1 ? "" : "s"}`} />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium">Accepts</th>
              <th className="py-2 font-medium">Staff</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="group cursor-pointer border-b border-[var(--color-border)] last:border-0 align-top hover:bg-[var(--color-page)]">
                <td className="p-0">
                  <Link href={`/admin/departments/${d.id}/edit`} className="block px-4 py-2.5 font-medium whitespace-nowrap text-[var(--color-text)] group-hover:text-[var(--color-brand)]">
                    {d.name}
                  </Link>
                </td>
                <td className="py-2.5 max-w-md text-[var(--color-text-muted)]">{d.description}</td>
                <td className="py-2.5">
                  <div className="flex max-w-xs flex-wrap gap-1">
                    {d.acceptsRequestTypes.length === 0 ? (
                      <span className="text-[var(--color-text-faint)]">Not a request destination</span>
                    ) : (
                      d.acceptsRequestTypes.map((t) => <Badge key={t}>{t}</Badge>)
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-[var(--color-text-muted)]">{d._count.staff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Add a department</h2>
        <NewDepartmentForm />
      </Panel>
    </div>
  );
}
