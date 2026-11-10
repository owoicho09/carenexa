import assert from "node:assert/strict";
import test from "node:test";
import { billStatus, billTotals, formatNaira, invoiceNumber, parseNairaToKobo, validatePayment } from "../src/lib/billing.ts";

test("naira amounts parse to kobo, tolerating commas and the naira sign", () => {
  assert.equal(parseNairaToKobo("5,000"), 500000);
  assert.equal(parseNairaToKobo("₦ 2500.50"), 250050);
  assert.equal(parseNairaToKobo("0"), null);
  assert.equal(parseNairaToKobo("-100"), null);
  assert.equal(parseNairaToKobo("12.345"), null);
  assert.equal(parseNairaToKobo("abc"), null);
});

test("amounts format as naira", () => {
  assert.equal(formatNaira(500000), "₦5,000");
  assert.equal(formatNaira(250050), "₦2,500.50");
});

test("totals and balance are computed from items and payments", () => {
  const items = [{ quantity: 1, unitPriceKobo: 500000 }, { quantity: 2, unitPriceKobo: 350000 }];
  assert.deepEqual(billTotals(items, [{ amountKobo: 400000 }]), { total: 1200000, paid: 400000, balance: 800000 });
});

test("status follows payments", () => {
  const items = [{ quantity: 1, unitPriceKobo: 100000 }];
  assert.equal(billStatus(items, [], false), "UNPAID");
  assert.equal(billStatus(items, [{ amountKobo: 40000 }], false), "PARTIALLY_PAID");
  assert.equal(billStatus(items, [{ amountKobo: 60000 }, { amountKobo: 40000 }], false), "PAID");
  assert.equal(billStatus(items, [{ amountKobo: 40000 }], true), "VOID");
});

test("payments cannot exceed the balance, or be taken on paid or cancelled bills", () => {
  assert.equal(validatePayment(50000, 100000, "UNPAID"), null);
  assert.ok(validatePayment(150000, 100000, "PARTIALLY_PAID"));
  assert.ok(validatePayment(null, 100000, "UNPAID"));
  assert.ok(validatePayment(1000, 0, "PAID"));
  assert.ok(validatePayment(1000, 1000, "VOID"));
});

test("invoice numbers are sequential and padded", () => {
  assert.equal(invoiceNumber(2026, 12), "INV-2026-00012");
});
