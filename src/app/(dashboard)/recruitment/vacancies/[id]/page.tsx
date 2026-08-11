import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { ToastButton } from "@/components/ui/SubmitWithToast";
import { publishVacancyAction, closeVacancyAction } from "../../actions";
import { AddApplicationForm } from "./AddApplicationForm";
import { requireSession } from "@/lib/auth";

const stageTone: Record<string, Tone> = {
  APPLIED: "neutral",
  SCREENED: "brand",
  SHORTLISTED: "warning",
  INTERVIEWED: "warning",
  HIRED: "success",
  REJECTED: "danger",
};

export default async function VacancyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession(["ADMIN", "RECRUITER"]);
  const { id } = await params;

  const vacancy = await db.vacancy.findUnique({
    where: { id },
    include: {
      department: true,
      applications: { include: { candidate: true }, orderBy: { screeningScore: "desc" } },
    },
  });

  if (!vacancy) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={vacancy.title}
        description={`${vacancy.department?.name ?? "Not department-specific"} · ${vacancy.employmentType} · ${vacancy.location}`}
        action={
          <div className="flex gap-2">
            {vacancy.status !== "PUBLISHED" && (
              <form action={publishVacancyAction}>
                <input type="hidden" name="vacancyId" value={vacancy.id} />
                <ToastButton successMessage="Vacancy published" size="sm">Publish</ToastButton>
              </form>
            )}
            {vacancy.status !== "CLOSED" && (
              <form action={closeVacancyAction}>
                <input type="hidden" name="vacancyId" value={vacancy.id} />
                <ToastButton successMessage="Vacancy closed" variant="secondary" size="sm">Close</ToastButton>
              </form>
            )}
          </div>
        }
      />

      <Panel className="p-5">
        <p className="text-sm text-[var(--color-text)]">{vacancy.description}</p>
        <p className="mt-4 text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Requirements</p>
        <ul className="mt-1 list-inside list-disc text-sm text-[var(--color-text-muted)]">
          {vacancy.requirements.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title={`${vacancy.applications.length} application${vacancy.applications.length === 1 ? "" : "s"}`} description="Ranked by AI screening score." />
        {vacancy.applications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No applications yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="py-2 font-medium">Stage</th>
                <th className="py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {vacancy.applications.map((a) => (
                <tr key={a.id} className="group cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-page)]">
                  <td className="p-0">
                    <Link href={`/recruitment/applications/${a.id}`} className="block px-4 py-2.5">
                      <p className="font-medium text-[var(--color-text)] group-hover:text-[var(--color-brand)]">{a.candidate.fullName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{a.candidate.email}</p>
                    </Link>
                  </td>
                  <td className="py-2.5"><Badge tone={stageTone[a.stage]}>{a.stage}</Badge></td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{a.screeningScore ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Add an application</h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Once the public careers page is live, applications arrive here automatically. Until then, record them manually.
        </p>
        <AddApplicationForm vacancyId={vacancy.id} />
      </Panel>
    </div>
  );
}
