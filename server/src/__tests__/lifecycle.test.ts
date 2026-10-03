import { test } from "node:test";
import assert from "node:assert/strict";
import { isPaymentSecured, validateStatusChange } from "../services/order.lifecycle.js";
import { normalizeReferralCode } from "../services/referral.service.js";

const paid = { paymentStatus: "paid", paymentMethod: "mtn_momo" };
const unpaid = { paymentStatus: "pending", paymentMethod: "mtn_momo" };
const cod = { paymentStatus: "pending", paymentMethod: "cod" };
const v = (o: Partial<Parameters<typeof validateStatusChange>[0]>) =>
  validateStatusChange({
    actor: "seller",
    from: "payment_confirmed",
    to: "preparing",
    sellerCount: 1,
    order: paid,
    ...o,
  });

test("payment is secured when paid or COD", () => {
  assert.equal(isPaymentSecured(paid), true);
  assert.equal(isPaymentSecured(cod), true);
  assert.equal(isPaymentSecured(unpaid), false);
});

test("seller can move a paid order forward", () => {
  assert.equal(v({}), null);
  assert.equal(v({ from: "preparing", to: "packed" }), null);
  assert.equal(v({ from: "out_for_delivery", to: "delivered" }), null);
});

test("seller cannot move an unpaid order into fulfilment", () => {
  assert.match(
    v({ from: "placed", to: "preparing", order: unpaid })!,
    /Payment hasn't been confirmed/,
  );
});

test("COD orders can be fulfilled before payment (cash on delivery)", () => {
  assert.equal(v({ from: "payment_confirmed", to: "preparing", order: cod }), null);
});

test("nobody can set payment_confirmed manually, or move backwards/sideways", () => {
  assert.ok(v({ from: "placed", to: "payment_confirmed" }));
  assert.match(v({ from: "packed", to: "preparing" })!, /forward/);
  assert.match(v({ from: "packed", to: "packed" })!, /forward/);
});

test("terminal states are final", () => {
  assert.match(v({ from: "delivered", to: "cancelled", actor: "admin" })!, /already delivered/);
  assert.match(v({ from: "cancelled", to: "preparing" })!, /cancelled/);
});

test("seller cancellation rules", () => {
  assert.equal(v({ from: "packed", to: "cancelled" }), null);
  assert.ok(v({ from: "out_for_delivery", to: "cancelled" }));
  assert.ok(v({ from: "packed", to: "cancelled", sellerCount: 2 }));
  assert.equal(
    v({ from: "out_for_delivery", to: "cancelled", actor: "admin", sellerCount: 2 }),
    null,
  );
});

test("multi-seller orders can only be marked delivered by an admin", () => {
  assert.match(v({ from: "out_for_delivery", to: "delivered", sellerCount: 2 })!, /admin/);
  assert.equal(
    v({ from: "out_for_delivery", to: "delivered", sellerCount: 2, actor: "admin" }),
    null,
  );
});

test("referral code normalisation", () => {
  assert.equal(normalizeReferralCode("  ab12cd34 "), "AB12CD34");
  assert.equal(normalizeReferralCode("x"), null);
  assert.equal(normalizeReferralCode("bad code!"), null);
  assert.equal(normalizeReferralCode(42), null);
});
