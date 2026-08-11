import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { ROLE_LABEL } from "@/lib/nav";
import { toggleStaffActiveAction } from "./actions";
import { SubmitWithToast } from "@/components/ui/SubmitWithToast";

export default async function StaffPage() {
  const staff = await db.staffMember.findMany({
    include: { department: true },
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" description="Everyone with a CareNexa login." action={<LinkButton href="/admin/staff/new">Add staff</LinkButton>} />
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Role</th>
              <th className="py-2 font-medium">Department</th>
              <th className="py-2 font-medium">Email</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="group cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-page)]">
                <td className="p-0">
                  <Link href={`/admin/staff/${s.id}`} className="block px-4 py-2.5">
                    <span className="font-medium text-[var(--color-text)] group-hover:text-[var(--color-brand)]">{s.fullName}</span>
                    <p className="text-xs text-[var(--color-text-muted)]">{s.jobTitle}</p>
                  </Link>
                </td>
                <td className="py-2.5 text-[var(--color-text-muted)]">{ROLE_LABEL[s.role]}</td>
                <td className="py-2.5 text-[var(--color-text-muted)]">{s.department?.name ?? "—"}</td>
                <td className="py-2.5 text-[var(--color-text-muted)]">{s.email}</td>
                <td className="py-2.5">
                  <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="py-2.5 text-right pr-4">
                  <form action={toggleStaffActiveAction}>
                    <input type="hidden" name="staffId" value={s.id} />
                    <input type="hidden" name="isActive" value={(!s.isActive).toString()} />
                    <SubmitWithToast
                      successMessage={s.isActive ? "Staff deactivated" : "Staff reactivated"}
                      className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                    >
                      {s.isActive ? "Deactivate" : "Reactivate"}
                    </SubmitWithToast>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
