import { requireSession } from "@/lib/auth";
import { WorkspaceNavLink } from "@/components/workspace/WorkspaceNavLink";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSession(["ADMIN"]);

  return (
    <div className="flex flex-1">
      <aside className="flex w-56 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3.5">
          <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Administrator</p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--color-text)]">CareNexa Hospital</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          <WorkspaceNavLink href="/admin" label="Hospital Overview" exact />
          <WorkspaceNavLink href="/patients" label="Patients" />
          <WorkspaceNavLink href="/admin/departments" label="Departments" />
          <WorkspaceNavLink href="/admin/staff" label="Staff" />
          <WorkspaceNavLink href="/admin/permissions" label="Permissions" />
          <WorkspaceNavLink href="/admin/card-types" label="Card Types" />
          <WorkspaceNavLink href="/admin/deleted-patients" label="Deleted Patients" />
          <WorkspaceNavLink href="/admin/audit-log" label="Audit Log" />
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
