import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { VitalsHandler } from "./handlers/VitalsHandler";
import { ClinicianHandler } from "./handlers/ClinicianHandler";
import { LabResultHandler } from "./handlers/LabResultHandler";
import { PharmacyHandler } from "./handlers/PharmacyHandler";
import { GenericOutcomeHandler } from "./handlers/GenericOutcomeHandler";
import { CompleteRequestForm, QueryRequestForm } from "@/components/queue/RequestActions";

const urgencyTone: Record<string, Tone> = { ROUTINE: "neutral", URGENT: "warning", EMERGENCY: "danger" };
const statusTone: Record<string, Tone> = { PENDING: "warning", IN_PROGRESS: "brand", COMPLETED: "success", QUERIED: "danger" };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const request = await db.request.findUnique({
    where: { id },
    include: {
      visit: { include: { patient: true } },
      fromDepartment: true,
      toDepartment: true,
      requestedBy: true,
      fulfilledBy: true,
    },
  });

  if (!request) notFound();

  const isOpen = request.status === "PENDING" || request.status === "IN_PROGRESS" || request.status === "QUERIED";

  const pendingPrescriptions =
    request.toDepartment.slug === "pharmacy"
      ? await db.prescription.findMany({ where: { visitId: request.visitId, status: "PENDING" } })
      : [];

  const resultFields =
    request.toDepartment.resultFields && typeof request.toDepartment.resultFields === "object"
      ? ((request.toDepartment.resultFields as { fields?: { name: string; label: string; type: string }[] }).fields ?? [])
      : [];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={request.requestType}
        description={`${request.fromDepartment.name} → ${request.toDepartment.name}`}
        action={<Badge tone={statusTone[request.status]}>{request.status}</Badge>}
      />

      <Panel className="p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Patient</p>
            <Link href={`/patients/${request.visit.patient.id}`} className="font-medium text-[var(--color-brand)] hover:underline">
              {request.visit.patient.fullName}
            </Link>
            <p className="font-mono text-xs text-[var(--color-text-muted)]">{request.visit.patient.hospitalNumber}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Urgency</p>
            <Badge tone={urgencyTone[request.urgency]}>{request.urgency}</Badge>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Requested by</p>
            <p className="text-[var(--color-text)]">{request.requestedBy.fullName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Requested</p>
            <p className="text-[var(--color-text)]">{request.createdAt.toLocaleString("en-NG")}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase">Reason</p>
            <p className="text-[var(--color-text)]">{request.reason}</p>
          </div>
          {request.queryNote && (
            <div className="col-span-2 rounded-md border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] p-3">
              <p className="text-xs font-medium text-[var(--color-danger)] uppercase">Query</p>
              <p className="text-sm text-[var(--color-danger)]">{request.queryNote}</p>
            </div>
          )}
          {request.status === "COMPLETED" && (
            <div className="col-span-2 rounded-md border border-[var(--color-success)]/20 bg-[var(--color-success-soft)] p-3">
              <p className="text-xs font-medium text-[var(--color-success)] uppercase">Outcome</p>
              <p className="text-sm text-[var(--color-success)]">{request.outcomeSummary ?? "Completed"}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                By {request.fulfilledBy?.fullName} &middot; {request.completedAt?.toLocaleString("en-NG")}
              </p>
            </div>
          )}
        </div>
      </Panel>

      {isOpen && (
        <>
          <Panel>
            <PanelHeader title="Handle this request" />
            <div className="p-4">
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
            </div>
          </Panel>

          {request.toDepartment.slug !== "nursing" && (
            <Panel className="p-4">
              <CompleteRequestForm requestId={request.id} />
            </Panel>
          )}

          <Panel className="p-4">
            <QueryRequestForm requestId={request.id} />
          </Panel>
        </>
      )}
    </div>
  );
}
