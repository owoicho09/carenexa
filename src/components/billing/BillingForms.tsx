"use client";

import { useActionState, useState } from "react";
import { createInvoiceAction, recordPaymentAction } from "@/app/(dashboard)/admin/billing/actions";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Select } from "@/components/ui/Field";
import { COMMON_CHARGES, formatNaira, parseNairaToKobo, PAYMENT_METHOD_LABEL } from "@/lib/billing";

type Row = { key: number; description: string; quantity: string; unitPrice: string };
type PatientOption = { id: string; fullName: string; hospitalNumber: string };

let nextKey = 1;
const emptyRow = (): Row => ({ key: nextKey++, description: "", quantity: "1", unitPrice: "" });

export function NewBillForm({ patients, defaultPatientId }: { patients: PatientOption[]; defaultPatientId?: string }) {
  const [state, action, pending] = useActionState(createInvoiceAction, undefined);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addCharge = (description: string, nairaPrice: number) =>
    setRows((rs) => {
      const blank = rs.find((r) => !r.description && !r.unitPrice);
      const filled = { description, quantity: "1", unitPrice: String(nairaPrice) };
      return blank ? rs.map((r) => (r.key === blank.key ? { ...r, ...filled } : r)) : [...rs, { key: nextKey++, ...filled }];
    });
  const total = rows.reduce((sum, r) => sum + (parseNairaToKobo(r.unitPrice) ?? 0) * (Number(r.quantity) || 0), 0);

  return (
    <form action={action} className="space-y-4">
      <FormError>{state?.error}</FormError>
      <Field label="Patient" htmlFor="billPatient">
        <Select id="billPatient" name="patientId" required defaultValue={defaultPatientId ?? ""}>
          <option value="" disabled>Select a patient…</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.hospitalNumber}</option>)}
        </Select>
      </Field>

      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">Quick add</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_CHARGES.map((c) => (
            <button
              key={c.description}
              type="button"
              onClick={() => addCharge(c.description, c.nairaPrice)}
              className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
            >
              + {c.description} · {formatNaira(c.nairaPrice * 100)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="hidden grid-cols-[1fr_5rem_8rem_2rem] gap-2 text-xs font-medium text-[var(--color-text-muted)] sm:grid">
          <span>Charge</span><span>Qty</span><span>Price (₦)</span><span />
        </div>
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[1fr_4rem] gap-2 sm:grid-cols-[1fr_5rem_8rem_2rem]">
            <Input name="description" aria-label="Charge" placeholder="e.g. Consultation" value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} />
            <Input name="quantity" aria-label="Quantity" type="number" min={1} max={999} value={r.quantity} onChange={(e) => update(r.key, { quantity: e.target.value })} />
            <Input name="unitPrice" aria-label="Price in naira" inputMode="decimal" placeholder="5000" value={r.unitPrice} onChange={(e) => update(r.key, { unitPrice: e.target.value })} className="col-span-1" />
            <button
              type="button"
              aria-label="Remove charge"
              onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [emptyRow()]))}
              className="text-[var(--color-text-faint)] hover:text-[var(--color-danger)]"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} className="text-xs font-medium text-[var(--color-brand)] hover:underline">
          + Add another charge
        </button>
      </div>

      <Field label="Note (optional)" htmlFor="billNote">
        <Input id="billNote" name="note" placeholder="e.g. Outpatient visit 11 Nov" />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <p className="text-sm text-[var(--color-text-muted)]">Total <span className="ml-1 text-lg font-semibold text-[var(--color-text)]">{formatNaira(total)}</span></p>
        <Button type="submit" loading={pending}>Create bill</Button>
      </div>
    </form>
  );
}

export function RecordPaymentForm({ invoiceId, balanceKobo }: { invoiceId: string; balanceKobo: number }) {
  const [state, action, pending] = useActionState(recordPaymentAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <FormError>{state?.error}</FormError>
      {state?.success && <p role="status" className="text-sm text-[var(--color-success)]">Payment recorded.</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Amount (₦)" htmlFor="payAmount">
          <Input id="payAmount" name="amount" inputMode="decimal" required defaultValue={String(balanceKobo / 100)} key={balanceKobo} />
        </Field>
        <Field label="Paid by" htmlFor="payMethod">
          <Select id="payMethod" name="method" defaultValue="CASH">
            {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Reference (optional)" htmlFor="payRef">
          <Input id="payRef" name="reference" placeholder="Receipt or transfer ref" />
        </Field>
      </div>
      <div className="flex justify-end"><Button type="submit" size="sm" loading={pending}>Record payment</Button></div>
    </form>
  );
}
