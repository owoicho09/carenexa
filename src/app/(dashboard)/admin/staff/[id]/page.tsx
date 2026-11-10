import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EditStaffForm } from "./EditStaffForm";
import { toggleStaffActiveAction } from "../actions";
import { ToastButton } from "@/components/ui/SubmitWithToast";
import { requireSession } from "@/lib/auth";

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(["ADMIN"]);
  const [staff, departments] = await Promise.all([
    db.staffMember.findFirst({ where: { id, hospitalId: session.hospitalId } }),
    db.department.findMany({ where: { hospitalId: session.hospitalId }, orderBy: { name: "asc" } }),
  ]);

  if (!staff) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={staff.fullName}
        description={staff.email}
        action={<Badge tone={staff.isActive ? "success" : "neutral"}>{staff.isActive ? "Active" : "Inactive"}</Badge>}
      />

      <Panel className="p-6">
        <EditStaffForm
          staff={{ id: staff.id, fullName: staff.fullName, role: staff.role, jobTitle: staff.jobTitle, departmentId: staff.departmentId }}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </Panel>

      <Panel className="p-6">
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
          {staff.isActive ? "Deactivate account" : "Reactivate account"}
        </h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          {staff.isActive
            ? "They will no longer be able to sign in. Their history stays on the record."
            : "Restores their ability to sign in with their existing password."}
        </p>
        <form action={toggleStaffActiveAction}>
          <input type="hidden" name="staffId" value={staff.id} />
          <input type="hidden" name="isActive" value={(!staff.isActive).toString()} />
          <ToastButton
            successMessage={staff.isActive ? "Staff deactivated" : "Staff reactivated"}
            variant={staff.isActive ? "danger" : "secondary"}
          >
            {staff.isActive ? "Deactivate" : "Reactivate"}
          </ToastButton>
        </form>
      </Panel>
    </div>
  );
}
