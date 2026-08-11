import { requireDepartmentAccess } from "@/lib/workspace";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function RecordsLayout({ children }: { children: React.ReactNode }) {
  const { department, isAdminVisiting, queueCount } = await requireDepartmentAccess("records");

  return (
    <WorkspaceShell
      departmentName={department.name}
      baseHref="/records"
      queueCount={queueCount}
      showQueue={false}
      isAdminVisiting={isAdminVisiting}
      extraNavItems={[
        { label: "Register Patient", href: "/records/register" },
        { label: "Appointments", href: "/records/appointments" },
      ]}
    >
      {children}
    </WorkspaceShell>
  );
}
