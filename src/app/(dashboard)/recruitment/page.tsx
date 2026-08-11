import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { NewVacancyForm } from "./NewVacancyForm";
import { requireSession } from "@/lib/auth";

const statusTone: Record<string, Tone> = { DRAFT: "neutral", PUBLISHED: "success", CLOSED: "warning" };

export default async function RecruitmentPage() {
  await requireSession(["ADMIN", "RECRUITER"]);

  const [vacancies, departments] = await Promise.all([
    db.vacancy.findMany({
      orderBy: { createdAt: "desc" },
      include: { department: true, _count: { select: { applications: true } } },
    }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Recruitment" description="Publish vacancies, screen applications, and hire." />

      <Panel>
        <PanelHeader title={`${vacancies.length} vacanc${vacancies.length === 1 ? "y" : "ies"}`} />
        {vacancies.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No vacancies yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="py-2 font-medium">Department</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Applications</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {vacancies.map((v) => (
                <tr key={v.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{v.title}</td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{v.department?.name ?? "—"}</td>
                  <td className="py-2.5"><Badge tone={statusTone[v.status]}>{v.status}</Badge></td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{v._count.applications}</td>
                  <td className="py-2.5 text-right pr-4">
                    <Link href={`/recruitment/vacancies/${v.id}`} className="text-sm font-medium text-[var(--color-brand)] hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Publish a vacancy</h2>
        <NewVacancyForm departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
      </Panel>
    </div>
  );
}
