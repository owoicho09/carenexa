import { requireDepartmentAccess } from "@/lib/workspace";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function DepartmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ dept: string }>;
}) {
  const { dept } = await params;
  const { department, isAdminVisiting, queueCount } = await requireDepartmentAccess(dept);

  return (
    <WorkspaceShell
      departmentName={department.name}
      baseHref={`/${department.slug}`}
      queueCount={queueCount}
      isAdminVisiting={isAdminVisiting}
    >
      {children}
    </WorkspaceShell>
  );
}
