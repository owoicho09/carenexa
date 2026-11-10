// Pure billing maths. Amounts are integers in kobo (₦1 = 100 kobo) so totals
// never suffer floating-point rounding. Safe to import anywhere.

export type BillItem = { quantity: number; unitPriceKobo: number };
export type BillPayment = { amountKobo: number };
export type BillStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "VOID";

export function formatNaira(kobo: number) {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG", { minimumFractionDigits: naira % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// "5,000", "5000.50", "₦ 5000" → kobo. Returns null for anything that isn't a
// positive amount with at most two decimal places.
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const kobo = Math.round(Number(cleaned) * 100);
  return kobo > 0 && Number.isSafeInteger(kobo) ? kobo : null;
}

export function billTotals(items: BillItem[], payments: BillPayment[]) {
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPriceKobo, 0);
  const paid = payments.reduce((sum, p) => sum + p.amountKobo, 0);
  return { total, paid, balance: Math.max(total - paid, 0) };
}

export function billStatus(items: BillItem[], payments: BillPayment[], voided: boolean): BillStatus {
  if (voided) return "VOID";
  const { total, paid } = billTotals(items, payments);
  if (paid <= 0) return "UNPAID";
  return paid >= total ? "PAID" : "PARTIALLY_PAID";
}

// A payment may not exceed what is still owed, and a void bill takes none.
export function validatePayment(amountKobo: number | null, balanceKobo: number, status: BillStatus): string | null {
  if (status === "VOID") return "This bill has been cancelled.";
  if (status === "PAID") return "This bill is already fully paid.";
  if (!amountKobo) return "Enter a valid amount.";
  if (amountKobo > balanceKobo) return `That is more than the ${formatNaira(balanceKobo)} still owed.`;
  return null;
}

export function invoiceNumber(year: number, sequence: number) {
  return `INV-${year}-${String(sequence).padStart(5, "0")}`;
}

// Common charges, so a bill can be built in a couple of clicks during a demo.
// Prices are illustrative and editable on each bill.
export const COMMON_CHARGES: { description: string; nairaPrice: number }[] = [
  { description: "Consultation", nairaPrice: 5000 },
  { description: "Specialist consultation", nairaPrice: 15000 },
  { description: "Full blood count", nairaPrice: 3500 },
  { description: "Malaria parasite test", nairaPrice: 2000 },
  { description: "Fasting blood glucose", nairaPrice: 2500 },
  { description: "Registration card", nairaPrice: 1000 },
];

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card / POS",
  TRANSFER: "Bank transfer",
  INSURANCE: "Insurance / HMO",
};
