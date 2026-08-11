import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { ToastButton } from "@/components/ui/SubmitWithToast";
import { isAiConfigured } from "@/lib/ai/client";
import { setStageAction } from "./actions";
import { ScreeningPanel } from "./ScreeningPanel";
import { InterviewPanel } from "./InterviewPanel";
import { HireForm } from "./HireForm";
import { requireSession } from "@/lib/auth";

const stageTone: Record<string, Tone> = {
  APPLIED: "neutral",
  SCREENED: "brand",
  SHORTLISTED: "warning",
  INTERVIEWED: "warning",
  HIRED: "success",
  REJECTED: "danger",
};

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession(["ADMIN", "RECRUITER"]);
  const { id } = await params;

  const [application, departments, screeningArtifact] = await Promise.all([
    db.application.findUnique({
      where: { id },
      include: { candidate: true, vacancy: { include: { department: true } }, interview: true },
    }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.aiArtifact.findFirst({ where: { applicationId: id, type: "CV_SCREENING" }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!application) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={application.candidate.fullName}
        description={`Applying for ${application.vacancy.title}`}
        action={<Badge tone={stageTone[application.stage]}>{application.stage}</Badge>}
      />

      <Panel className="p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Email</p><p>{application.candidate.email}</p></div>
          <div><p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Phone</p><p>{application.candidate.phone}</p></div>
        </div>
        <p className="mt-4 text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">CV</p>
        {application.cvFileName ? (
          <a
            href={`/api/recruitment/applications/${application.id}/cv`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0">
              <path
                d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {application.cvFileName}
          </a>
        ) : application.cvText ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{application.cvText}</p>
        ) : (
          <p className="mt-1 text-sm text-[var(--color-text-faint)]">No CV on file.</p>
        )}
        {application.coverNote && (
          <>
            <p className="mt-4 text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Cover note</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{application.coverNote}</p>
          </>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="AI screening" description="Reads the CV against this role's stated requirements. Doesn't decide — you do." />
        <div className="p-4">
          <ScreeningPanel
            applicationId={application.id}
            aiConfigured={isAiConfigured()}
            score={application.screeningScore}
            reasoning={application.screeningReasoning}
            overrideNote={application.screeningOverrideNote}
            screenedAt={screeningArtifact?.createdAt ?? null}
            model={screeningArtifact?.model ?? null}
          />
        </div>
      </Panel>

      {application.stage !== "HIRED" && application.stage !== "REJECTED" && (
        <Panel className="p-4">
          <div className="flex gap-2">
            <form action={setStageAction}>
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="stage" value="SHORTLISTED" />
              <ToastButton successMessage="Candidate shortlisted" variant="secondary" size="sm">Shortlist</ToastButton>
            </form>
            <form action={setStageAction}>
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="stage" value="REJECTED" />
              <ToastButton successMessage="Application rejected" variant="danger" size="sm">Reject</ToastButton>
            </form>
          </div>
        </Panel>
      )}

      {(application.stage === "SHORTLISTED" || application.stage === "INTERVIEWED") && (
        <Panel>
          <PanelHeader title="Interview" />
          <div className="p-4">
            <InterviewPanel applicationId={application.id} interview={application.interview} />
          </div>
        </Panel>
      )}

      {application.stage === "INTERVIEWED" && (
        <Panel>
          <PanelHeader title="Hire" description="Creates a staff account — they can log in immediately." />
          <div className="p-4">
            <HireForm
              applicationId={application.id}
              suggestedDepartmentId={application.vacancy.departmentId}
              departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            />
          </div>
        </Panel>
      )}

      {application.stage === "HIRED" && (
        <Panel className="border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-4">
          <p className="text-sm font-medium text-[var(--color-success)]">This candidate has been hired.</p>
        </Panel>
      )}
    </div>
  );
}
