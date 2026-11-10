import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { VitalsHandler } from "./handlers/VitalsHandler";
import { ClinicianHandler } from "./handlers/ClinicianHandler";
import { LabResultHandler } from "./handlers/LabResultHandler";
import { PharmacyHandler } from "./handlers/PharmacyHandler";
import { GenericOutcomeHandler } from "./handlers/GenericOutcomeHandler";
import { CompleteRequestForm, QueryRequestForm } from "@/components/queue/RequestActions";
import { PrintResultButton } from "@/components/queue/PrintResultButton";
import { requireSession } from "@/lib/auth";

const urgencyTone: Record<string, Tone> = { ROUTINE: "neutral", URGENT: "warning", EMERGENCY: "danger" };
const statusTone: Record<string, Tone> = { PENDING: "warning", IN_PROGRESS: "brand", COMPLETED: "success", QUERIED: "danger" };

function formatDateTime(d: Date) {
  return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function formatAge(dateOfBirth: Date) {
  const ms = Date.now() - dateOfBirth.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const request = await db.request.findFirst({
    where: { id, hospitalId: session.hospitalId },
    include: {
      visit: { include: { patient: true } },
      fromDepartment: true,
      toDepartment: true,
      requestedBy: true,
      fulfilledBy: true,
      labResults: { orderBy: { enteredAt: "asc" }, include: { enteredBy: true } },
    },
  });

  if (!request) notFound();

  const isOpen = request.status === "PENDING" || request.status === "IN_PROGRESS" || request.status === "QUERIED";
  const patient = request.visit.patient;

  const pendingPrescriptions =
    request.toDepartment.slug === "pharmacy"
      ? await db.prescription.findMany({ where: { visitId: request.visitId, status: "PENDING", visit: { hospitalId: session.hospitalId } } })
      : [];

  const resultFields =
    request.toDepartment.resultFields && typeof request.toDepartment.resultFields === "object"
      ? ((request.toDepartment.resultFields as { fields?: { name: string; label: string; type: string }[] }).fields ?? [])
      : [];

  // Timeline built from the fields the schema actually tracks — created (always),
  // each lab result as it's entered, a query round-trip (no timestamp column exists
  // for it), then completion. Nothing here is inferred or fabricated.
  const timeline: { label: string; detail: string; by: string; at: Date | null }[] = [
    { label: "Request created", detail: `${request.requestType} sent to ${request.toDepartment.name}`, by: request.requestedBy.fullName, at: request.createdAt },
    ...request.labResults.map((r) => ({
      label: "Result added",
      detail: `${r.testName}: ${r.resultType === "NUMERIC" ? `${r.value} ${r.unit}` : r.qualitativeValue}`,
      by: r.enteredBy.fullName,
      at: r.enteredAt,
    })),
    ...(request.queryNote
      ? [{ label: "Sent back with a query", detail: request.queryNote, by: request.fulfilledBy?.fullName ?? "—", at: null }]
      : []),
    ...(request.status === "COMPLETED" && request.completedAt
      ? [{ label: "Marked completed", detail: request.outcomeSummary ?? "Completed", by: request.fulfilledBy?.fullName ?? "—", at: request.completedAt }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div>
        <LinkButton href={`/patients/${patient.id}`} variant="ghost" size="sm" className="mb-2 -ml-3">
          ← Back to {patient.fullName}
        </LinkButton>
        <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">
          {request.fromDepartment.name} <span className="mx-1">→</span> {request.toDepartment.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">{request.requestType}</h1>
          <Badge tone={statusTone[request.status]}>{request.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          <Link href={`/patients/${patient.id}`} className="font-medium text-[var(--color-brand)] hover:underline">
            {patient.fullName}
          </Link>{" "}
          <span className="font-mono text-xs">{patient.hospitalNumber}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader title="Request summary" />
            <div className="grid grid-cols-2 gap-4 p-5 text-sm">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Patient</p>
                <p className="text-[var(--color-text)]">{patient.fullName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Patient ID</p>
                <p className="font-mono text-[var(--color-text)]">{patient.hospitalNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Requested by</p>
                <p className="text-[var(--color-text)]">{request.requestedBy.fullName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Requested</p>
                <p className="text-[var(--color-text)]">{formatDateTime(request.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Urgency</p>
                <Badge tone={urgencyTone[request.urgency]}>{request.urgency}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Status</p>
                <Badge tone={statusTone[request.status]}>{request.status}</Badge>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Reason</p>
                <p className="text-[var(--color-text)]">{request.reason}</p>
              </div>
            </div>
            {request.status === "COMPLETED" && (
              <div className="mx-5 mb-5 rounded-md border border-[var(--color-success)]/20 bg-[var(--color-success-soft)] p-3">
                <p className="text-xs font-medium text-[var(--color-success)] uppercase">Outcome</p>
                <p className="text-sm text-[var(--color-success)]">{request.outcomeSummary ?? "Completed"}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  By {request.fulfilledBy?.fullName} &middot; {request.completedAt && formatDateTime(request.completedAt)}
                </p>
              </div>
            )}
          </Panel>

          {isOpen && (
            <Panel>
              <PanelHeader title="Handle this request" description={`Routed to ${request.toDepartment.name}`} />
              <div className="space-y-5 p-5">
                {request.status === "QUERIED" && request.queryNote && (
                  <div className="rounded-md border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] p-3">
                    <p className="text-xs font-medium text-[var(--color-danger)] uppercase">Open query</p>
                    <p className="text-sm text-[var(--color-danger)]">{request.queryNote}</p>
                  </div>
                )}

                {request.toDepartment.slug === "nursing" && <VitalsHandler requestId={request.id} />}
                {request.toDepartment.slug === "clinician" && <ClinicianHandler requestId={request.id} />}
                {request.toDepartment.slug === "lab" && (
                  <LabResultHandler requestId={request.id} requestType={request.requestType} />
                )}
                {request.toDepartment.slug === "pharmacy" && (
                  <PharmacyHandler requestId={request.id} pendingPrescriptions={pendingPrescriptions} />
                )}
                {!["nursing", "clinician", "lab", "pharmacy"].includes(request.toDepartment.slug) && (
                  <GenericOutcomeHandler requestId={request.id} fields={resultFields} />
                )}

                {request.toDepartment.slug !== "nursing" && (
                  <div className="border-t border-[var(--color-border)] pt-5">
                    <CompleteRequestForm requestId={request.id} />
                  </div>
                )}

                <div className="border-t border-[var(--color-border)] pt-5">
                  <QueryRequestForm requestId={request.id} />
                </div>
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Activity" />
            <ol className="divide-y divide-[var(--color-border)]">
              {timeline.map((event, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm font-medium text-[var(--color-text)]">{event.label}</p>
                      {event.at && <p className="text-xs text-[var(--color-text-faint)]">{formatDateTime(event.at)}</p>}
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{event.detail}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">{event.by}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Panel className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Patient snapshot</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-[var(--color-text-faint)] uppercase">Name</p>
                <p className="text-[var(--color-text)]">{patient.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-faint)] uppercase">Patient ID</p>
                <p className="font-mono text-[var(--color-text)]">{patient.hospitalNumber}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-faint)] uppercase">Age / Sex</p>
                <p className="text-[var(--color-text)]">
                  {formatAge(patient.dateOfBirth)} yrs &middot; {patient.sex === "MALE" ? "Male" : "Female"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-faint)] uppercase">Contact</p>
                <p className="text-[var(--color-text)]">{patient.phone}</p>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Request status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--color-text-faint)] uppercase">Status</p>
                <Badge tone={statusTone[request.status]}>{request.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--color-text-faint)] uppercase">Urgency</p>
                <Badge tone={urgencyTone[request.urgency]}>{request.urgency}</Badge>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-faint)] uppercase">Department</p>
                <p className="text-[var(--color-text)]">{request.toDepartment.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-faint)] uppercase">Requested</p>
                <p className="text-[var(--color-text)]">{formatDateTime(request.createdAt)}</p>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Quick actions</h2>
            <div className="flex flex-col gap-2">
              <LinkButton href={`/patients/${patient.id}`} variant="secondary" size="sm" className="justify-start">
                View patient profile
              </LinkButton>
              {request.status === "COMPLETED" && <PrintResultButton />}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
