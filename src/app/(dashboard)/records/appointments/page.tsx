import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Tone } from "@/components/ui/Badge";
import { setAppointmentStatusAction } from "@/app/(dashboard)/patients/[id]/actions";
import { NewAppointmentForm } from "./NewAppointmentForm";
import { requireSession } from "@/lib/auth";
import { SubmitWithToast } from "@/components/ui/SubmitWithToast";

const statusTone: Record<string, Tone> = {
  SCHEDULED: "brand",
  COMPLETED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "danger",
};

export default async function AppointmentsPage() {
  const session = await requireSession();
  const appointments = await db.appointment.findMany({
    where: { hospitalId: session.hospitalId, status: "SCHEDULED" },
    include: { patient: true, department: true },
    orderBy: { scheduledFor: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Every upcoming appointment across the hospital." />

      <Panel>
        <PanelHeader title={`${appointments.length} upcoming`} />
        {appointments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">Nothing scheduled yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="py-2 font-medium">When</th>
                <th className="py-2 font-medium">Reason</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/patients/${a.patientId}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-brand)]">
                      {a.patient.fullName}
                    </Link>
                  </td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">
                    {a.scheduledFor.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{a.reason}</td>
                  <td className="py-2.5"><Badge tone={statusTone[a.status]}>{a.status}</Badge></td>
                  <td className="py-2.5 text-right pr-4">
                    <div className="flex justify-end gap-3">
                      <form action={setAppointmentStatusAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <input type="hidden" name="status" value="COMPLETED" />
                        <SubmitWithToast successMessage="Marked as seen" className="text-xs font-medium text-[var(--color-success)] hover:underline">
                          Seen
                        </SubmitWithToast>
                      </form>
                      <form action={setAppointmentStatusAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <input type="hidden" name="status" value="NO_SHOW" />
                        <SubmitWithToast successMessage="Marked as no-show" className="text-xs font-medium text-[var(--color-warning)] hover:underline">
                          No-show
                        </SubmitWithToast>
                      </form>
                      <form action={setAppointmentStatusAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <input type="hidden" name="status" value="CANCELLED" />
                        <SubmitWithToast successMessage="Appointment cancelled" className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
                          Cancel
                        </SubmitWithToast>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Book a new appointment</h2>
        <NewAppointmentForm />
      </Panel>
    </div>
  );
}
