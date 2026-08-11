import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { SendToDepartmentForm } from "@/components/patient/SendToDepartmentForm";
import { CloseVisitForm } from "@/components/patient/CloseVisitForm";
import { OpenVisitButton } from "@/components/patient/OpenVisitButton";
import { DeletePatientButton } from "@/components/patient/DeletePatientButton";
import { BookAppointmentButton } from "@/components/patient/BookAppointmentButton";
import { ComposeMessageButton } from "@/components/patient/ComposeMessageButton";
import { setAppointmentStatusAction } from "./actions";
import { SubmitWithToast } from "@/components/ui/SubmitWithToast";
import { AiSummaryPanel } from "@/components/ai/AiSummaryPanel";
import { DocumentsPanel } from "@/components/ai/DocumentsPanel";
import { isAiConfigured } from "@/lib/ai/client";
import { getLatestHistorySummary } from "@/lib/ai/summary";

function formatAge(dateOfBirth: Date) {
  const ms = Date.now() - dateOfBirth.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(d: Date) {
  return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

const requestStatusTone: Record<string, Tone> = {
  PENDING: "warning",
  IN_PROGRESS: "brand",
  COMPLETED: "success",
  QUERIED: "danger",
};

export default async function PatientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [patient, departments, appointments, communications] = await Promise.all([
    db.patient.findUnique({
      where: { id },
      include: {
        cardType: true,
        visits: {
          orderBy: { openedAt: "desc" },
          include: {
            openedBy: true,
            vitals: { orderBy: { recordedAt: "asc" }, include: { recordedBy: true } },
            notes: { orderBy: { createdAt: "asc" }, include: { author: true } },
            labResults: { orderBy: { enteredAt: "asc" }, include: { enteredBy: true } },
            diagnoses: { orderBy: { createdAt: "asc" }, include: { recordedBy: true } },
            prescriptions: { orderBy: { createdAt: "asc" }, include: { prescribedBy: true, dispensation: true } },
            requests: {
              orderBy: { createdAt: "asc" },
              include: { fromDepartment: true, toDepartment: true, requestedBy: true, fulfilledBy: true },
            },
            aiArtifacts: {
              where: { type: { in: ["DISCHARGE_SUMMARY", "REFERRAL_LETTER"] } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    }),
    db.department.findMany({ where: { acceptsRequestTypes: { isEmpty: false } }, orderBy: { name: "asc" } }),
    db.appointment.findMany({ where: { patientId: id, status: "SCHEDULED" }, orderBy: { scheduledFor: "asc" } }),
    db.communication.findMany({ where: { patientId: id }, include: { sentBy: true }, orderBy: { sentAt: "desc" } }),
  ]);

  if (!patient) notFound();

  const latestSummary = await getLatestHistorySummary(id);

  const hasDangerInfo = patient.allergies.length > 0 || patient.genotype === "SS" || patient.genotype === "SC";
  const openVisit = patient.visits.find((v) => v.status === "OPEN");

  // Result context: for each lab result, what this same test read on this patient
  // before now — so a value reads as a trend, not an isolated number.
  const chronologicalLabResults = patient.visits
    .slice()
    .reverse()
    .flatMap((v) => v.labResults.map((l) => ({ ...l, visitOpenedAt: v.openedAt })));
  const previousReadingsById = new Map<string, string[]>();
  const seenByTest = new Map<string, string[]>();
  for (const result of chronologicalLabResults) {
    const prior = seenByTest.get(result.testName) ?? [];
    previousReadingsById.set(result.id, prior);
    const display = result.resultType === "NUMERIC" ? `${result.value}${result.unit}` : (result.qualitativeValue ?? "");
    seenByTest.set(result.testName, [...prior, display]);
  }

  return (
    <div className="space-y-6">
      {patient.isDeleted && (
        <div className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-4 py-2.5 text-sm text-[var(--color-danger)]">
          This patient has been deleted — hidden from search and queues. An administrator can restore them from Admin → Deleted Patients.
        </div>
      )}

      {/* Identity + what's dangerous, always visible */}
      <Panel className={`p-5 ${hasDangerInfo ? "border-l-4 border-l-[var(--color-danger)]" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-[var(--color-text)]">{patient.fullName}</h1>
              <Badge tone="brand">{patient.cardType.name}</Badge>
              {openVisit && <Badge tone="warning">Visit open</Badge>}
            </div>
            <p className="mt-1 font-mono text-sm text-[var(--color-text-muted)]">{patient.hospitalNumber}</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {formatAge(patient.dateOfBirth)} years old &middot; {patient.sex === "MALE" ? "Male" : "Female"} &middot; DOB {patient.dateOfBirth.toLocaleDateString("en-NG")}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{patient.phone} &middot; {patient.address}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] px-3 py-2 text-right text-sm">
            <p className="text-[var(--color-text-muted)]">Blood group</p>
            <p className="font-semibold text-[var(--color-text)]">{patient.bloodGroup ?? "Unknown"}</p>
            <p className="mt-1 text-[var(--color-text-muted)]">Genotype</p>
            <p className="font-semibold text-[var(--color-text)]">{patient.genotype ?? "Unknown"}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {patient.allergies.length > 0 ? (
            patient.allergies.map((a) => <Badge key={a} tone="danger">Allergy: {a}</Badge>)
          ) : (
            <Badge tone="success">No known allergies</Badge>
          )}
          {(patient.genotype === "SS" || patient.genotype === "SC") && (
            <Badge tone="danger">Sickle cell disease ({patient.genotype})</Badge>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Next of kin: <span className="font-medium text-[var(--color-text)]">{patient.nextOfKinName}</span> ({patient.nextOfKinRelation}) &middot; {patient.nextOfKinPhone}
          </p>
          {!patient.isDeleted && (
            <div className="flex flex-wrap gap-2">
              {!openVisit && <OpenVisitButton patientId={patient.id} />}
              <BookAppointmentButton patientId={patient.id} />
              <ComposeMessageButton patientId={patient.id} patientFirstName={patient.fullName.split(" ")[0]} />
              <LinkButton href={`/patients/${patient.id}/card`} variant="secondary" size="sm">Print card</LinkButton>
              <LinkButton href={`/patients/${patient.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>
              <DeletePatientButton patientId={patient.id} patientName={patient.fullName} />
            </div>
          )}
        </div>
      </Panel>

      <Panel className="p-5">
        <AiSummaryPanel patientId={patient.id} aiConfigured={isAiConfigured()} initialSummary={latestSummary} />
      </Panel>

      {appointments.length > 0 && (
        <Panel className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Upcoming appointments</h2>
          <ul className="space-y-2">
            {appointments.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-[var(--color-text)]">{a.scheduledFor.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
                  <p className="text-[var(--color-text-muted)]">{a.reason}</p>
                </div>
                <form action={setAppointmentStatusAction} className="flex gap-1">
                  <input type="hidden" name="appointmentId" value={a.id} />
                  <input type="hidden" name="status" value="CANCELLED" />
                  <SubmitWithToast successMessage="Appointment cancelled" className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
                    Cancel
                  </SubmitWithToast>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {communications.length > 0 && (
        <Panel className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Communication history</h2>
          <ul className="space-y-2">
            {communications.map((c) => (
              <li key={c.id} className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Badge tone="brand">{c.channel === "WHATSAPP" ? "WhatsApp" : "Email"}</Badge>
                    {c.subject && <span className="font-medium text-[var(--color-text)]">{c.subject}</span>}
                  </span>
                  <Badge tone={c.status === "DELIVERED" ? "success" : "neutral"}>
                    {c.status === "DELIVERED" ? "Delivered" : "Sent"}
                  </Badge>
                </div>
                <p className="mt-1 text-[var(--color-text-muted)]">{c.body}</p>
                <p className="mt-1 text-xs text-[var(--color-text-faint)]">
                  {c.sentBy.fullName} &middot; {c.sentAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Where the patient goes next — any department to any department */}
      {openVisit && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Send to department</h2>
            <SendToDepartmentForm visitId={openVisit.id} departments={departments} />
          </Panel>
          <Panel className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Close visit</h2>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Ends the patient&rsquo;s presence today. The record stays permanent either way.
            </p>
            <CloseVisitForm visitId={openVisit.id} />
          </Panel>
        </div>
      )}

      {/* Visits, reverse chronological */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Visits ({patient.visits.length})</h2>

        {patient.visits.length === 0 ? (
          <Panel className="p-6 text-sm text-[var(--color-text-muted)]">No visits recorded yet.</Panel>
        ) : (
          patient.visits.map((visit, index) => (
            <Panel key={visit.id} className="overflow-hidden">
              <details open={index === 0} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--color-page)]">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-faint)] transition-transform group-open:rotate-90"
                      viewBox="0 0 8 8"
                      fill="currentColor"
                    >
                      <path d="M1 0l6 4-6 4V0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{formatDate(visit.openedAt)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {visit.presentingComplaint ?? "No presenting complaint recorded"}
                        {visit.diagnoses[0] && ` · ${visit.diagnoses[0].description}`}
                      </p>
                    </div>
                  </div>
                  <Badge tone={visit.status === "OPEN" ? "warning" : "neutral"}>
                    {visit.status === "OPEN" ? "Open" : "Closed"}
                  </Badge>
                </summary>
              <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                <Section title="Requests">
                  {visit.requests.length === 0 ? (
                    <Empty>No requests on this visit.</Empty>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[var(--color-text-muted)]">
                          <th className="py-1.5 font-medium">Type</th>
                          <th className="py-1.5 font-medium">Route</th>
                          <th className="py-1.5 font-medium">Status</th>
                          <th className="py-1.5 font-medium">Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visit.requests.map((r) => (
                          <tr key={r.id} className="border-t border-[var(--color-border)]">
                            <td className="py-1.5">{r.requestType}</td>
                            <td className="py-1.5 text-[var(--color-text-muted)]">{r.fromDepartment.name} → {r.toDepartment.name}</td>
                            <td className="py-1.5"><Badge tone={requestStatusTone[r.status]}>{r.status}</Badge></td>
                            <td className="py-1.5 text-[var(--color-text-muted)]">{r.outcomeSummary ?? r.queryNote ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Section>

                <Section title="Vitals">
                  {visit.vitals.length === 0 ? (
                    <Empty>No vitals recorded.</Empty>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[var(--color-text-muted)]">
                          <th className="py-1.5 font-medium">Recorded</th>
                          <th className="py-1.5 font-medium">BP</th>
                          <th className="py-1.5 font-medium">Temp</th>
                          <th className="py-1.5 font-medium">Pulse</th>
                          <th className="py-1.5 font-medium">RR</th>
                          <th className="py-1.5 font-medium">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visit.vitals.map((v) => (
                          <tr key={v.id} className="border-t border-[var(--color-border)]">
                            <td className="py-1.5 text-[var(--color-text-muted)]">{formatDate(v.recordedAt)}</td>
                            <td className="py-1.5">{v.systolicBp && v.diastolicBp ? `${v.systolicBp}/${v.diastolicBp}` : "—"}</td>
                            <td className="py-1.5">{v.temperatureC ? `${v.temperatureC}°C` : "—"}</td>
                            <td className="py-1.5">{v.pulseBpm ? `${v.pulseBpm} bpm` : "—"}</td>
                            <td className="py-1.5">{v.respiratoryRate ? `${v.respiratoryRate}/min` : "—"}</td>
                            <td className="py-1.5">{v.weightKg ? `${v.weightKg} kg` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Section>

                <Section title="Lab results">
                  {visit.labResults.length === 0 ? (
                    <Empty>No lab results.</Empty>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[var(--color-text-muted)]">
                          <th className="py-1.5 font-medium">Test</th>
                          <th className="py-1.5 font-medium">Value</th>
                          <th className="py-1.5 font-medium">Reference range</th>
                          <th className="py-1.5 font-medium">Flag</th>
                          <th className="py-1.5 font-medium">Previously</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visit.labResults.map((l) => (
                          <tr key={l.id} className="border-t border-[var(--color-border)]">
                            <td className="py-1.5">{l.testName}</td>
                            <td className="py-1.5">{l.resultType === "NUMERIC" ? `${l.value} ${l.unit}` : l.qualitativeValue}</td>
                            <td className="py-1.5 text-[var(--color-text-muted)]">
                              {l.resultType === "NUMERIC" ? `${l.referenceLow ?? "?"}–${l.referenceHigh ?? "?"} ${l.unit}` : "—"}
                            </td>
                            <td className="py-1.5">
                              {l.isAbnormal ? <Badge tone="danger">Abnormal</Badge> : <Badge tone="success">Normal</Badge>}
                            </td>
                            <td className="py-1.5 text-[var(--color-text-muted)]">
                              {(previousReadingsById.get(l.id) ?? []).slice(-3).join(" → ") || "First reading"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Section>

                <Section title="Diagnosis & plan">
                  {visit.diagnoses.length === 0 ? (
                    <Empty>No diagnosis recorded.</Empty>
                  ) : (
                    visit.diagnoses.map((d) => (
                      <div key={d.id} className="py-1.5 text-sm">
                        <p className="text-[var(--color-text)]">{d.description}</p>
                        <p className="text-[var(--color-text-muted)]">Plan: {d.plan}</p>
                      </div>
                    ))
                  )}
                </Section>

                <Section title="Prescriptions">
                  {visit.prescriptions.length === 0 ? (
                    <Empty>No prescriptions.</Empty>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[var(--color-text-muted)]">
                          <th className="py-1.5 font-medium">Drug</th>
                          <th className="py-1.5 font-medium">Dosage</th>
                          <th className="py-1.5 font-medium">Frequency</th>
                          <th className="py-1.5 font-medium">Duration</th>
                          <th className="py-1.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visit.prescriptions.map((p) => (
                          <tr key={p.id} className="border-t border-[var(--color-border)]">
                            <td className="py-1.5">{p.drugName}</td>
                            <td className="py-1.5">{p.dosage}</td>
                            <td className="py-1.5">{p.frequency}</td>
                            <td className="py-1.5">{p.duration}</td>
                            <td className="py-1.5">
                              <Badge tone={p.status === "DISPENSED" ? "success" : "warning"}>{p.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Section>

                <Section title="Notes">
                  {visit.notes.length === 0 ? (
                    <Empty>No clinical notes.</Empty>
                  ) : (
                    visit.notes.map((n) => (
                      <div key={n.id} className="py-1.5 text-sm">
                        <p className="whitespace-pre-wrap text-[var(--color-text)]">{n.content}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                          {n.author.fullName} &middot; {formatDate(n.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </Section>

                <Section title="Documents">
                  <DocumentsPanel
                    visitId={visit.id}
                    patientId={patient.id}
                    aiConfigured={isAiConfigured()}
                    documents={visit.aiArtifacts}
                  />
                </Section>
              </div>
              </details>
            </Panel>
          ))
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="mb-1.5 text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">{title}</p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--color-text-muted)]">{children}</p>;
}
