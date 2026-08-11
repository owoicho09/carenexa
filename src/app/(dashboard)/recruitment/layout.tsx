import { requireSession } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["ADMIN", "RECRUITER"]);
  const isAdminVisiting = session.role === "ADMIN" && session.departmentSlug !== "recruitment";

  return (
    <WorkspaceShell
      departmentName="Recruitment"
      baseHref="/recruitment"
      queueCount={0}
      showQueue={false}
      isAdminVisiting={isAdminVisiting}
    >
      {children}
    </WorkspaceShell>
  );
}
