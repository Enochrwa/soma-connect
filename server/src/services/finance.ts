/**
 * Pure money maths for orders, commission and loyalty.
 *
 * No database, no I/O — everything here is deterministic and unit-tested.
 * All amounts are whole Rwandan francs (RWF has no minor unit), so every
 * function returns integers and splits are exact (no lost or invented francs).
 */
import { BUSINESS, type DeliverySpeed } from "../config/business.js";

export interface PricedLine {
  productId: string;
  sellerId: string;
  unitPrice: number;
  quantity: number;
}

export function lineTotal(line: Pick<PricedLine, "unitPrice" | "quantity">): number {
  return line.unitPrice * line.quantity;
}

export function sumLines(lines: Array<Pick<PricedLine, "unitPrice" | "quantity">>): number {
  return lines.reduce((s, l) => s + lineTotal(l), 0);
}

/** Standard delivery is free over the threshold; express always costs; pickup is always free. */
export function deliveryFeeFor(speed: DeliverySpeed, subtotal: number): number {
  if (speed === "pickup") return BUSINESS.DELIVERY_FEES.pickup;
  if (speed === "express") return BUSINESS.DELIVERY_FEES.express;
  return subtotal >= BUSINESS.FREE_STANDARD_DELIVERY_THRESHOLD
    ? 0
    : BUSINESS.DELIVERY_FEES.standard;
}

/**
 * Splits `total` across `weights` proportionally using the largest-remainder
 * method, so the parts are integers that always add up to exactly `total`.
 */
export function allocate(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const sumW = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || sumW <= 0) return weights.map(() => 0);

  const raw = weights.map((w) => (total * w) / sumW);
  const base = raw.map((r) => Math.floor(r));
  let remainder = total - base.reduce((s, b) => s + b, 0);

  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    base[order[k].i] += 1;
  }
  return base;
}

export interface CouponRule {
  type: "percentage" | "fixed";
  value: number;
}

/** Discount a coupon gives on the subtotal it applies to (never more than that subtotal). */
export function couponDiscountFor(rule: CouponRule, eligibleSubtotal: number): number {
  if (eligibleSubtotal <= 0) return 0;
  const raw =
    rule.type === "percentage" ? Math.floor((eligibleSubtotal * rule.value) / 100) : rule.value;
  return Math.max(0, Math.min(Math.floor(raw), eligibleSubtotal));
}

/** Points a buyer may redeem on this order: capped by balance, request, and % of subtotal. */
export function redeemablePoints(opts: {
  requested: number;
  balance: number;
  subtotal: number;
}): number {
  const cap = Math.floor(
    (opts.subtotal * BUSINESS.MAX_POINTS_REDEMPTION_PCT) / BUSINESS.RWF_PER_POINT,
  );
  return Math.max(0, Math.min(Math.floor(opts.requested), Math.floor(opts.balance), cap));
}

export interface DiscountedLine extends PricedLine {
  /** Share of the coupon discount attributed to this line. */
  couponDiscount: number;
  /** Share of the loyalty-points discount attributed to this line. */
  loyaltyDiscount: number;
}

/**
 * Spreads the order-level coupon and loyalty discounts over the lines so each
 * seller's earnings can be computed exactly.
 *
 * - A coupon with `couponSellerId` only discounts that seller's lines.
 * - A platform-wide coupon discounts every line proportionally.
 * - Loyalty points always discount every line proportionally.
 */
export function allocateDiscounts(
  lines: PricedLine[],
  opts: { couponDiscount: number; couponSellerId?: string; loyaltyDiscount: number },
): DiscountedLine[] {
  const totals = lines.map(lineTotal);

  const couponWeights = lines.map((l, i) =>
    opts.couponSellerId && l.sellerId !== opts.couponSellerId ? 0 : totals[i],
  );
  const couponShares = allocate(opts.couponDiscount, couponWeights);

  // Loyalty applies to what is left after the coupon, so a line can never go negative.
  const afterCoupon = totals.map((t, i) => t - couponShares[i]);
  const loyaltyShares = allocate(opts.loyaltyDiscount, afterCoupon);

  return lines.map((l, i) => ({
    ...l,
    couponDiscount: couponShares[i],
    loyaltyDiscount: loyaltyShares[i],
  }));
}

export interface SellerEarningBreakdown {
  /** Sum of unitPrice × quantity for this seller's lines. */
  gross: number;
  /** Discounts the seller funded themselves (their own coupon). Reduces what commission is charged on. */
  sellerDiscount: number;
  /** gross − sellerDiscount: the amount commission is calculated on. */
  commissionBase: number;
  commissionRate: number;
  /** Platform's cut, rounded to a whole franc. */
  commission: number;
  /** What the seller actually earns: commissionBase − commission. */
  net: number;
}

/**
 * Earnings for one seller on one order.
 *
 *  - Commission is charged on item sales only — delivery fees are not seller revenue.
 *  - Platform-funded discounts (loyalty points, platform coupons) do NOT reduce
 *    the seller's earnings; the platform absorbs them.
 *  - Seller-funded coupons reduce the base, and commission is charged on what's left.
 */
export function computeSellerEarning(opts: {
  lines: DiscountedLine[];
  sellerId: string;
  /** Set when the order's coupon belongs to a seller; only that seller funds it. */
  couponSellerId?: string;
  commissionRate?: number;
}): SellerEarningBreakdown {
  const rate = opts.commissionRate ?? BUSINESS.COMMISSION_RATE;
  const mine = opts.lines.filter((l) => l.sellerId === opts.sellerId);
  const gross = mine.reduce((s, l) => s + lineTotal(l), 0);
  const sellerDiscount =
    opts.couponSellerId && opts.couponSellerId === opts.sellerId
      ? mine.reduce((s, l) => s + l.couponDiscount, 0)
      : 0;
  const commissionBase = Math.max(0, gross - sellerDiscount);
  const commission = Math.min(commissionBase, Math.round(commissionBase * rate));
  return {
    gross,
    sellerDiscount,
    commissionBase,
    commissionRate: rate,
    commission,
    net: commissionBase - commission,
  };
}

/** Loyalty points earned for a paid-and-delivered order (merchandise after discounts, excl. delivery). */
export function pointsEarnedFor(merchandisePaid: number): number {
  return Math.max(0, Math.floor(merchandisePaid * BUSINESS.POINTS_PER_RWF));
}

/** True once the dispute/return hold window after delivery has passed. */
export function isEarningAvailable(availableAt: Date, now: Date = new Date()): boolean {
  return availableAt.getTime() <= now.getTime();
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
