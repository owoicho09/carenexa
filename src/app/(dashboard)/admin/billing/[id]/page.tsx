import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PrintButton } from "@/components/patient/PrintButton";
import { RecordPaymentForm } from "@/components/billing/BillingForms";
import { billTotals, formatNaira, PAYMENT_METHOD_LABEL } from "@/lib/billing";
import { BILL_STATUS_LABEL } from "@/lib/billingStatus";
import { voidInvoiceAction } from "../actions";

const when = (d: Date) => d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const invoice = await db.invoice.findFirst({
    where: { id, hospitalId: session.hospitalId },
    include: {
      hospital: { select: { name: true } },
      patient: { select: { id: true, fullName: true, hospitalNumber: true, phone: true } },
      items: true,
      payments: { include: { receivedBy: { select: { fullName: true } } }, orderBy: { receivedAt: "asc" } },
      createdBy: { select: { fullName: true } },
    },
  });
  if (!invoice) notFound();

  const { total, paid, balance } = billTotals(invoice.items, invoice.payments);
  const s = BILL_STATUS_LABEL[invoice.status];
  const canPay = invoice.status === "UNPAID" || invoice.status === "PARTIALLY_PAID";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/admin/billing" className="text-sm text-[var(--color-brand)] hover:underline">← All bills</Link>
        <PrintButton />
      </div>

      <Panel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-[var(--color-text-faint)] uppercase">{invoice.hospital.name}</p>
            <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">Bill {invoice.number}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{when(invoice.createdAt)} · by {invoice.createdBy.fullName}</p>
          </div>
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>

        <div className="mt-5 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
          <Link href={`/patients/${invoice.patient.id}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-brand)]">{invoice.patient.fullName}</Link>
          <p className="text-[var(--color-text-muted)]">{invoice.patient.hospitalNumber} · {invoice.patient.phone}</p>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="py-2 font-medium">Charge</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Price</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-border)]">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatNaira(item.unitPriceKobo)}</td>
                <td className="py-2 text-right">{formatNaira(item.quantity * item.unitPriceKobo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">Total</dt><dd className="font-semibold">{formatNaira(total)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">Paid</dt><dd>{formatNaira(paid)}</dd></div>
          <div className="flex justify-between border-t border-[var(--color-border)] pt-1">
            <dt className="font-medium">Balance</dt>
            <dd className={`font-semibold ${balance > 0 && invoice.status !== "VOID" ? "text-[var(--color-danger)]" : ""}`}>{formatNaira(invoice.status === "VOID" ? 0 : balance)}</dd>
          </div>
        </dl>
        {invoice.note && <p className="mt-4 text-sm text-[var(--color-text-muted)]">Note: {invoice.note}</p>}
      </Panel>

      {invoice.payments.length > 0 && (
        <Panel className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Payments</h2>
          <ul className="space-y-2 text-sm">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <span>{formatNaira(p.amountKobo)} · {PAYMENT_METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ""}</span>
                <span className="text-xs text-[var(--color-text-faint)]">{when(p.receivedAt)} · {p.receivedBy.fullName}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {canPay && (
        <Panel className="p-5 print:hidden">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Record a payment</h2>
          <RecordPaymentForm invoiceId={invoice.id} balanceKobo={balance} />
          {invoice.payments.length === 0 && (
            <form action={voidInvoiceAction} className="mt-4 border-t border-[var(--color-border)] pt-3">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <Button type="submit" variant="secondary" size="sm">Cancel this bill</Button>
            </form>
          )}
        </Panel>
      )}
    </div>
  );
}
