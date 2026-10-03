import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allocate,
  allocateDiscounts,
  computeSellerEarning,
  couponDiscountFor,
  deliveryFeeFor,
  isEarningAvailable,
  pointsEarnedFor,
  redeemablePoints,
  type PricedLine,
} from "../services/finance.js";

const line = (
  sellerId: string,
  unitPrice: number,
  quantity = 1,
  productId = `${sellerId}-p`,
): PricedLine => ({
  productId,
  sellerId,
  unitPrice,
  quantity,
});

test("allocate: parts are integers and sum exactly to the total", () => {
  for (const [total, weights] of [
    [100, [1, 1, 1]],
    [1, [5, 5, 5]],
    [999, [3333, 3333, 3334]],
    [7, [0, 4, 0, 6]],
  ] as Array<[number, number[]]>) {
    const parts = allocate(total, weights);
    assert.equal(
      parts.reduce((s, p) => s + p, 0),
      total,
    );
    assert.ok(parts.every((p) => Number.isInteger(p) && p >= 0));
  }
  assert.deepEqual(allocate(0, [1, 2]), [0, 0]);
  assert.deepEqual(allocate(50, [0, 0]), [0, 0]);
});

test("delivery fee: free standard over 10,000, express always charged, pickup free", () => {
  assert.equal(deliveryFeeFor("standard", 9_999), 1500);
  assert.equal(deliveryFeeFor("standard", 10_000), 0);
  assert.equal(deliveryFeeFor("express", 50_000), 2000);
  assert.equal(deliveryFeeFor("pickup", 1), 0);
});

test("coupon discount: percentage floors, fixed is capped at the subtotal", () => {
  assert.equal(couponDiscountFor({ type: "percentage", value: 15 }, 10_001), 1500);
  assert.equal(couponDiscountFor({ type: "fixed", value: 5000 }, 3000), 3000);
  assert.equal(couponDiscountFor({ type: "fixed", value: 500 }, 3000), 500);
  assert.equal(couponDiscountFor({ type: "percentage", value: 100 }, 0), 0);
});

test("redeemable points: limited by balance, request and 20% of subtotal", () => {
  assert.equal(redeemablePoints({ requested: 5000, balance: 5000, subtotal: 10_000 }), 2000);
  assert.equal(redeemablePoints({ requested: 300, balance: 5000, subtotal: 10_000 }), 300);
  assert.equal(redeemablePoints({ requested: 5000, balance: 120, subtotal: 10_000 }), 120);
  assert.equal(redeemablePoints({ requested: -5, balance: 100, subtotal: 10_000 }), 0);
});

test("seller earning: 10% commission on gross, net = gross - commission", () => {
  const lines = allocateDiscounts([line("A", 10_000, 2)], {
    couponDiscount: 0,
    loyaltyDiscount: 0,
  });
  const e = computeSellerEarning({ lines, sellerId: "A", commissionRate: 0.1 });
  assert.equal(e.gross, 20_000);
  assert.equal(e.commission, 2_000);
  assert.equal(e.net, 18_000);
  assert.equal(e.gross, e.commission + e.net);
});

test("platform-funded discounts (loyalty, global coupon) do NOT reduce seller earnings", () => {
  const raw = [line("A", 6000), line("B", 4000)];
  const lines = allocateDiscounts(raw, { couponDiscount: 1000, loyaltyDiscount: 500 });
  const a = computeSellerEarning({ lines, sellerId: "A", commissionRate: 0.1 });
  const b = computeSellerEarning({ lines, sellerId: "B", commissionRate: 0.1 });
  assert.equal(a.sellerDiscount, 0);
  assert.equal(b.sellerDiscount, 0);
  assert.equal(a.net, 5400);
  assert.equal(b.net, 3600);
});

test("seller-funded coupon only touches that seller, and commission is charged after it", () => {
  const raw = [line("A", 6000), line("B", 4000)];
  const lines = allocateDiscounts(raw, {
    couponDiscount: 600,
    couponSellerId: "A",
    loyaltyDiscount: 0,
  });
  assert.equal(lines.find((l) => l.sellerId === "B")!.couponDiscount, 0);
  const a = computeSellerEarning({
    lines,
    sellerId: "A",
    couponSellerId: "A",
    commissionRate: 0.1,
  });
  assert.equal(a.gross, 6000);
  assert.equal(a.sellerDiscount, 600);
  assert.equal(a.commissionBase, 5400);
  assert.equal(a.commission, 540);
  assert.equal(a.net, 4860);
  const b = computeSellerEarning({
    lines,
    sellerId: "B",
    couponSellerId: "A",
    commissionRate: 0.1,
  });
  assert.equal(b.net, 3600);
});

test("discount allocation conserves every franc across a multi-seller order", () => {
  const raw = [line("A", 3333, 3), line("B", 777, 1), line("C", 1234, 7)];
  const lines = allocateDiscounts(raw, { couponDiscount: 999, loyaltyDiscount: 1001 });
  assert.equal(
    lines.reduce((s, l) => s + l.couponDiscount, 0),
    999,
  );
  assert.equal(
    lines.reduce((s, l) => s + l.loyaltyDiscount, 0),
    1001,
  );
  for (const l of lines)
    assert.ok(l.couponDiscount + l.loyaltyDiscount <= l.unitPrice * l.quantity);
});

test("commission never exceeds the base and rounds to whole francs", () => {
  const lines = allocateDiscounts([line("A", 1, 1)], { couponDiscount: 0, loyaltyDiscount: 0 });
  const e = computeSellerEarning({ lines, sellerId: "A", commissionRate: 0.5 });
  assert.ok(Number.isInteger(e.commission) && e.commission <= e.commissionBase);
  assert.equal(e.commission + e.net, e.commissionBase);
});

test("per-seller commission override is respected", () => {
  const lines = allocateDiscounts([line("A", 10_000)], { couponDiscount: 0, loyaltyDiscount: 0 });
  const e = computeSellerEarning({ lines, sellerId: "A", commissionRate: 0.05 });
  assert.equal(e.commission, 500);
  assert.equal(e.net, 9_500);
});

test("points earned: 1 per 100 RWF of merchandise, floored", () => {
  assert.equal(pointsEarnedFor(9_999), 99);
  assert.equal(pointsEarnedFor(0), 0);
});

test("earnings become available only after the hold window", () => {
  const now = new Date("2026-01-10T00:00:00Z");
  assert.equal(isEarningAvailable(new Date("2026-01-10T00:00:01Z"), now), false);
  assert.equal(isEarningAvailable(new Date("2026-01-09T23:59:59Z"), now), true);
});
