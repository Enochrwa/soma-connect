/**
 * Single source of truth for marketplace money rules.
 *
 * Everything that touches RWF amounts (delivery fees, loyalty points,
 * commission, referral rewards) reads from here so that checkout, payouts and
 * the UI can never drift apart. Values can be overridden with env vars where it
 * makes sense for ops to tune them without a deploy.
 */

function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export const BUSINESS = {
  /** Platform commission taken from each seller's sales (0.10 = 10%). Per-seller override: Seller.commissionRate. */
  COMMISSION_RATE: clamp(num(process.env.COMMISSION_RATE, 0.1), 0, 0.5),

  /**
   * Days between delivery and the moment earnings become withdrawable. This is
   * the dispute / return window — it protects buyers and stops sellers cashing
   * out on an order that is about to be refunded.
   */
  EARNINGS_HOLD_DAYS: clamp(num(process.env.EARNINGS_HOLD_DAYS, 2), 0, 30),

  /** Smallest payout a seller can request. */
  MIN_PAYOUT_RWF: 1000,

  // ── Loyalty ────────────────────────────────────────────────────────────────
  /** 1 point earned per 100 RWF of merchandise paid for. */
  POINTS_PER_RWF: 1 / 100,
  /** Value of one point when redeemed. */
  RWF_PER_POINT: 1,
  /** Points can cover at most this share of the merchandise subtotal. */
  MAX_POINTS_REDEMPTION_PCT: 0.2,

  // ── Delivery ───────────────────────────────────────────────────────────────
  FREE_STANDARD_DELIVERY_THRESHOLD: 10_000,
  DELIVERY_FEES: { standard: 1500, express: 2000, pickup: 0 } as const,

  // ── Referral ───────────────────────────────────────────────────────────────
  REFERRAL: {
    /** Points the referrer earns when their friend's first order is delivered. */
    REFERRER_BONUS_POINTS: clamp(num(process.env.REFERRER_BONUS_POINTS, 500), 0, 100_000),
    /** Points the new customer earns on that same first delivered order. */
    REFEREE_BONUS_POINTS: clamp(num(process.env.REFEREE_BONUS_POINTS, 200), 0, 100_000),
    /** The friend's first order must be at least this much (merchandise, after discounts). */
    MIN_QUALIFYING_ORDER_RWF: clamp(num(process.env.REFERRAL_MIN_ORDER_RWF, 5000), 0, 10_000_000),
    /** Anti-abuse cap on how many referrals one person can be rewarded for. */
    MAX_REWARDED_PER_REFERRER: clamp(num(process.env.REFERRAL_MAX_REWARDS, 50), 1, 10_000),
  },
} as const;

export type DeliverySpeed = keyof typeof BUSINESS.DELIVERY_FEES;
