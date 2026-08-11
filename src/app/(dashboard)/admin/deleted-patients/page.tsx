import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { ToastButton } from "@/components/ui/SubmitWithToast";
import { restorePatientAction } from "./actions";

export default async function DeletedPatientsPage() {
  await requireSession(["ADMIN"]);

  const patients = await db.patient.findMany({
    where: { isDeleted: true },
    include: { cardType: true },
    orderBy: { deletedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Deleted patients" description="Removed from search and queues, but nothing is destroyed." />
      <Panel>
        {patients.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No deleted patients.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Hospital No.</th>
                <th className="py-2 font-medium">Deleted</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{p.fullName}</td>
                  <td className="py-2.5 font-mono text-xs text-[var(--color-text-muted)]">{p.hospitalNumber}</td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{p.deletedAt?.toLocaleString("en-NG")}</td>
                  <td className="py-2.5 text-right pr-4">
                    <form action={restorePatientAction}>
                      <input type="hidden" name="patientId" value={p.id} />
                      <ToastButton successMessage="Patient restored" variant="secondary" size="sm">Restore</ToastButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
