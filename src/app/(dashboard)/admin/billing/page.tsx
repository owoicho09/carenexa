import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { NewBillForm } from "@/components/billing/BillingForms";
import { billTotals, formatNaira } from "@/lib/billing";
import { BILL_STATUS_LABEL } from "@/lib/billingStatus";

const FILTERS = [
  { key: "open", label: "Outstanding", statuses: ["UNPAID", "PARTIALLY_PAID"] },
  { key: "paid", label: "Paid", statuses: ["PAID"] },
  { key: "all", label: "All", statuses: ["UNPAID", "PARTIALLY_PAID", "PAID", "VOID"] },
] as const;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ show?: string; patient?: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const { show, patient: defaultPatientId } = await searchParams;
  const filter = FILTERS.find((f) => f.key === show) ?? FILTERS[0];

  const [invoices, openInvoices, paidToday, patients] = await Promise.all([
    db.invoice.findMany({
      where: { hospitalId: session.hospitalId, status: { in: [...filter.statuses] } },
      include: { patient: { select: { id: true, fullName: true, hospitalNumber: true } }, items: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.invoice.findMany({ where: { hospitalId: session.hospitalId, status: { in: ["UNPAID", "PARTIALLY_PAID"] } }, include: { items: true, payments: true } }),
    db.payment.aggregate({ where: { invoice: { hospitalId: session.hospitalId }, receivedAt: { gte: startOfToday() } }, _sum: { amountKobo: true } }),
    db.patient.findMany({ where: { hospitalId: session.hospitalId, isDeleted: false }, select: { id: true, fullName: true, hospitalNumber: true }, orderBy: { fullName: "asc" } }),
  ]);
  const outstanding = openInvoices.reduce((sum, inv) => sum + billTotals(inv.items, inv.payments).balance, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Bills and payments for patients at this hospital." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Outstanding</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{formatNaira(outstanding)}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Collected today</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{formatNaira(paidToday._sum.amountKobo ?? 0)}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">Unpaid bills</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{openInvoices.length}</p>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Bills</h2>
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={`/admin/billing?show=${f.key}`}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${f.key === filter.key ? "bg-[var(--color-brand)] text-white" : "text-[var(--color-text-muted)] hover:bg-[var(--color-page)]"}`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>
          {invoices.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">No bills here yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {invoices.map((inv) => {
                const { total, balance } = billTotals(inv.items, inv.payments);
                const s = BILL_STATUS_LABEL[inv.status];
                return (
                  <li key={inv.id}>
                    <Link href={`/admin/billing/${inv.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-page)]">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)]">{inv.patient.fullName}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{inv.number} · {inv.createdAt.toLocaleDateString("en-NG")}</p>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text)]">{formatNaira(total)}</p>
                          {balance > 0 && inv.status !== "VOID" && <p className="text-xs text-[var(--color-danger)]">{formatNaira(balance)} owed</p>}
                        </div>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="New bill" description="Pick the patient and add charges." />
          <div className="p-4">
            <NewBillForm patients={patients} defaultPatientId={defaultPatientId} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
