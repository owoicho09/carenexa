"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { billStatus, billTotals, formatNaira, invoiceNumber, parseNairaToKobo, validatePayment } from "@/lib/billing";
import type { PaymentMethod } from "@/generated/prisma/enums";

export type BillingState = { error?: string; success?: boolean } | undefined;

const METHODS: PaymentMethod[] = ["CASH", "CARD", "TRANSFER", "INSURANCE"];

export async function createInvoiceAction(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const session = await requireSession(["ADMIN"]);
  const patientId = String(formData.get("patientId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const descriptions = formData.getAll("description").map((v) => String(v).trim());
  const quantities = formData.getAll("quantity").map((v) => Number(v));
  const prices = formData.getAll("unitPrice").map((v) => parseNairaToKobo(String(v)));

  const items = descriptions
    .map((description, i) => ({ description, quantity: quantities[i], unitPriceKobo: prices[i] }))
    .filter((item) => item.description || item.unitPriceKobo);
  if (items.length === 0) return { error: "Add at least one charge." };
  for (const item of items) {
    if (!item.description) return { error: "Every charge needs a description." };
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) return { error: `Check the quantity for "${item.description}".` };
    if (!item.unitPriceKobo) return { error: `Enter a valid price for "${item.description}".` };
  }

  const patient = await db.patient.findFirst({ where: { id: patientId, hospitalId: session.hospitalId, isDeleted: false } });
  if (!patient) return { error: "Choose a patient from this hospital." };
  const openVisit = await db.visit.findFirst({ where: { patientId: patient.id, hospitalId: session.hospitalId, status: "OPEN" }, select: { id: true } });

  const year = new Date().getFullYear();
  let invoice = null;
  // Sequential per hospital and year; retry if two bills are created at once.
  for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
    const count = await db.invoice.count({ where: { hospitalId: session.hospitalId, number: { startsWith: `INV-${year}-` } } });
    try {
      invoice = await db.invoice.create({
        data: {
          hospitalId: session.hospitalId,
          number: invoiceNumber(year, count + 1 + attempt),
          patientId: patient.id,
          visitId: openVisit?.id ?? null,
          note,
          createdById: session.staffId,
          items: { create: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPriceKobo: i.unitPriceKobo! })) },
        },
      });
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  if (!invoice) return { error: "Could not create the bill. Try again." };

  const { total } = billTotals(items.map((i) => ({ quantity: i.quantity, unitPriceKobo: i.unitPriceKobo! })), []);
  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "BILL_CREATED",
    targetType: "Invoice",
    targetId: invoice.id,
    targetLabel: `${invoice.number} · ${patient.fullName}`,
    detail: formatNaira(total),
  });
  revalidatePath("/admin/billing");
  revalidatePath(`/patients/${patient.id}`);
  redirect(`/admin/billing/${invoice.id}`);
}

async function loadInvoice(invoiceId: string, hospitalId: string) {
  return db.invoice.findFirst({ where: { id: invoiceId, hospitalId }, include: { items: true, payments: true, patient: true } });
}

export async function recordPaymentAction(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const session = await requireSession(["ADMIN"]);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amountKobo = parseNairaToKobo(String(formData.get("amount") ?? ""));
  const method = String(formData.get("method") ?? "") as PaymentMethod;
  const reference = String(formData.get("reference") ?? "").trim() || null;
  if (!METHODS.includes(method)) return { error: "Choose how the patient paid." };

  const invoice = await loadInvoice(invoiceId, session.hospitalId);
  if (!invoice) return { error: "Bill not found in this hospital." };
  const status = billStatus(invoice.items, invoice.payments, Boolean(invoice.voidedAt));
  const { balance } = billTotals(invoice.items, invoice.payments);
  const invalid = validatePayment(amountKobo, balance, status);
  if (invalid) return { error: invalid };

  await db.$transaction(async (tx) => {
    await tx.payment.create({ data: { invoiceId: invoice.id, amountKobo: amountKobo!, method, reference, receivedById: session.staffId } });
    const payments = [...invoice.payments, { amountKobo: amountKobo! }];
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: billStatus(invoice.items, payments, false) } });
  });
  await logAudit({
    hospitalId: session.hospitalId,
    actorId: session.staffId,
    action: "PAYMENT_RECORDED",
    targetType: "Invoice",
    targetId: invoice.id,
    targetLabel: `${invoice.number} · ${invoice.patient.fullName}`,
    detail: `${formatNaira(amountKobo!)} by ${method.toLowerCase()}${reference ? ` · ${reference}` : ""}`,
  });
  revalidatePath(`/admin/billing/${invoice.id}`);
  revalidatePath("/admin/billing");
  revalidatePath(`/patients/${invoice.patientId}`);
  return { success: true };
}

// Cancelling keeps the bill on file (marked void) rather than deleting it.
export async function voidInvoiceAction(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const invoice = await loadInvoice(invoiceId, session.hospitalId);
  if (!invoice || invoice.voidedAt || invoice.payments.length > 0) return;
  await db.invoice.update({ where: { id: invoice.id }, data: { status: "VOID", voidedAt: new Date() } });
  await logAudit({ hospitalId: session.hospitalId, actorId: session.staffId, action: "BILL_CANCELLED", targetType: "Invoice", targetId: invoice.id, targetLabel: `${invoice.number} · ${invoice.patient.fullName}` });
  revalidatePath(`/admin/billing/${invoice.id}`);
  revalidatePath("/admin/billing");
  revalidatePath(`/patients/${invoice.patientId}`);
}
