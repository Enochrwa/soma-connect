/**
 * Order lifecycle: the one place that knows how an order moves between states
 * and what has to happen to stock, coupons, loyalty points, seller earnings
 * and referral rewards when it does.
 *
 *   placed ─pay─▶ payment_confirmed ─▶ preparing ─▶ packed ─▶ picked_up ─▶ out_for_delivery ─▶ delivered
 *      └──────────────── cancelled (stock, coupon & points restored; refund flagged if paid) ◀──┘
 *
 * Money only reaches a seller when an order is DELIVERED and was actually paid
 * (or is cash-on-delivery, collected at the door). Cancelling, refunding or
 * failing to pay never leaves stock, coupons, or points in a bad state.
 */
import mongoose, { type ClientSession } from "mongoose";
import { BUSINESS } from "../config/business.js";
import { Coupon } from "../models/Coupon.js";
import { LoyaltyEvent } from "../models/LoyaltyEvent.js";
import type { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { SellerEarning } from "../models/SellerEarning.js";
import { User } from "../models/User.js";
import { HttpError } from "../middleware/errorHandler.js";
import { commissionRateFor, reverseEarningsForOrder } from "./earnings.service.js";
import { addDays, computeSellerEarning, pointsEarnedFor, type DiscountedLine } from "./finance.js";
import { rewardReferralOnDelivery } from "./referral.service.js";

type OrderDoc = InstanceType<typeof Order>;

// ── Status transitions ───────────────────────────────────────────────────────

export const FULFILMENT_FLOW = [
  "payment_confirmed",
  "preparing",
  "packed",
  "picked_up",
  "out_for_delivery",
  "delivered",
] as const;

export type FulfilmentStatus = (typeof FULFILMENT_FLOW)[number];
export type Actor = "seller" | "admin";

/** An order is only allowed to move into fulfilment once money is secured. */
export function isPaymentSecured(order: {
  paymentStatus?: string | null;
  paymentMethod?: string | null;
}) {
  return order.paymentStatus === "paid" || order.paymentMethod === "cod";
}

/**
 * Validates a requested status change and returns a human error, or null if OK.
 *
 *  - Nobody can mark payment confirmed through this path (use confirm-payment / the gateway).
 *  - Sellers move their orders forward only, starting from `payment_confirmed`.
 *  - Sellers can cancel only single-seller orders that haven't left for delivery.
 *  - On multi-seller orders only an admin can mark delivered or cancel, so one
 *    seller can't trigger payouts (or cancellations) for another seller's goods.
 */
export function validateStatusChange(opts: {
  actor: Actor;
  from: string;
  to: string;
  sellerCount: number;
  order: { paymentStatus?: string | null; paymentMethod?: string | null };
}): string | null {
  const { actor, from, to, sellerCount } = opts;
  if (from === "cancelled") return "This order was cancelled and can't be changed.";
  if (from === "delivered") return "This order is already delivered.";

  if (to === "cancelled") {
    if (actor === "admin") return null;
    if (sellerCount > 1)
      return "This order contains items from several sellers — please contact support to cancel it.";
    if (!["payment_confirmed", "preparing", "packed"].includes(from)) {
      return "An order can only be cancelled before it is picked up for delivery.";
    }
    return null;
  }

  const toIdx = FULFILMENT_FLOW.indexOf(to as FulfilmentStatus);
  if (toIdx < 1) return "That status can't be set manually.";
  const fromIdx = FULFILMENT_FLOW.indexOf(from as FulfilmentStatus);
  if (fromIdx === -1) return "Payment hasn't been confirmed for this order yet.";
  if (toIdx <= fromIdx) return "Orders can only move forward.";
  if (!isPaymentSecured(opts.order)) return "Payment hasn't been confirmed for this order yet.";
  if (to === "delivered" && actor === "seller" && sellerCount > 1) {
    return "Only an admin can mark a multi-seller order as delivered.";
  }
  return null;
}

// ── Payment ──────────────────────────────────────────────────────────────────

export type PaidOutcome = "paid" | "already_paid" | "cancelled_refund_pending";

/**
 * Records that real money arrived for an order (gateway callback or admin
 * confirmation). Idempotent. If the order was already cancelled — e.g. the
 * customer approved the push after our timeout — the order is NOT revived; it's
 * flagged `refund_pending` so the money is returned instead of silently kept.
 */
export async function applyOrderPaid(order: OrderDoc, note: string): Promise<PaidOutcome> {
  if (order.paymentStatus === "paid") return "already_paid";
  const now = new Date();

  if (order.status === "cancelled") {
    order.paymentStatus = "refund_pending";
    order.statusHistory.push({
      status: "cancelled",
      at: now,
      note: "Payment arrived after the order was cancelled — refund required",
    });
    await order.save();
    return "cancelled_refund_pending";
  }

  order.paymentStatus = "paid";
  order.paidAt = now;
  if (order.status === "placed") order.status = "payment_confirmed";
  order.statusHistory.push({ status: "payment_confirmed", at: now, note });
  await order.save();
  return "paid";
}

// ── Cancellation ─────────────────────────────────────────────────────────────

/**
 * Cancels an order inside `session` and gives back everything it consumed:
 * stock (and variant stock), the coupon use, and any loyalty points redeemed.
 * Points are only credited on delivery, so there is nothing earned to claw back.
 * If the order was already paid it's flagged `refund_pending` for an admin.
 */
export async function cancelOrderWithRestore(
  order: OrderDoc,
  session: ClientSession,
  note: string,
) {
  if (order.status === "cancelled") return;
  if (order.status === "delivered")
    throw new HttpError(400, "A delivered order can't be cancelled.");

  for (const item of order.items) {
    const inc: Record<string, number> = { stock: item.quantity, salesCount: -item.quantity };
    if (item.variant) {
      await Product.updateOne(
        { _id: item.productId, "variants.name": item.variant },
        { $inc: { ...inc, "variants.$.stock": item.quantity } },
        { session },
      );
    } else {
      await Product.updateOne({ _id: item.productId }, { $inc: inc }, { session });
    }
  }

  if (order.couponId) {
    await Coupon.updateOne(
      { _id: order.couponId, usedBy: order.buyerId },
      { $inc: { usedCount: -1 }, $pull: { usedBy: order.buyerId } },
      { session },
    );
  }

  if (order.pointsRedeemed && order.pointsRedeemed > 0) {
    await User.updateOne(
      { _id: order.buyerId },
      { $inc: { loyaltyPoints: order.pointsRedeemed } },
      { session },
    );
    await LoyaltyEvent.create(
      [
        {
          userId: order.buyerId,
          points: order.pointsRedeemed,
          type: "admin_adjustment",
          description: `Points returned from cancelled order ${order.orderNumber}`,
          relatedId: order._id,
        },
      ],
      { session },
    );
  }

  order.status = "cancelled";
  if (order.paymentStatus === "paid") order.paymentStatus = "refund_pending";
  order.statusHistory.push({ status: "cancelled", at: new Date(), note });
  await order.save({ session });
}

// ── Delivery settlement ──────────────────────────────────────────────────────

/** Rebuilds per-line prices + stored discount shares from an order, ready for finance maths. */
export function orderLines(order: Pick<OrderDoc, "items">): DiscountedLine[] {
  return order.items.map((i) => ({
    productId: String(i.productId),
    sellerId: String(i.sellerId),
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    couponDiscount: i.couponDiscount ?? 0,
    loyaltyDiscount: i.loyaltyDiscount ?? 0,
  }));
}

/**
 * Runs once when an order becomes `delivered`, inside the same transaction as
 * the status change:
 *   1. cash-on-delivery is marked paid (the cash was collected at the door)
 *   2. each seller gets a ledger row with the platform commission deducted
 *   3. the buyer is credited loyalty points on what they actually paid for
 *   4. a pending referral reward is evaluated
 * `order.settled` makes it safe against double-delivery.
 */
export async function settleDeliveredOrder(order: OrderDoc, session: ClientSession) {
  if (order.settled) return;
  const now = new Date();

  if (order.paymentStatus !== "paid") {
    if (order.paymentMethod !== "cod")
      throw new HttpError(400, "Payment hasn't been confirmed for this order yet.");
    order.paymentStatus = "paid";
    order.paidAt = now;
  }

  const lines = orderLines(order);
  const couponSellerId = order.couponSellerId ? String(order.couponSellerId) : undefined;
  const sellers = await Seller.find({ _id: { $in: order.sellerIds } }).session(session);
  const availableAt = addDays(now, BUSINESS.EARNINGS_HOLD_DAYS);

  for (const seller of sellers) {
    const e = computeSellerEarning({
      lines,
      sellerId: String(seller._id),
      couponSellerId,
      commissionRate: commissionRateFor(seller),
    });
    if (e.gross === 0) continue;
    await SellerEarning.create(
      [
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          sellerId: seller._id,
          gross: e.gross,
          sellerDiscount: e.sellerDiscount,
          commissionBase: e.commissionBase,
          commissionRate: e.commissionRate,
          commission: e.commission,
          net: e.net,
          availableAt,
        },
      ],
      { session },
    );
    await Seller.updateOne(
      { _id: seller._id },
      { $inc: { totalSales: e.commissionBase } },
      { session },
    );
  }

  const merchandisePaid = Math.max(0, order.subtotal - (order.discount ?? 0));
  const points = pointsEarnedFor(merchandisePaid);
  order.pointsEarned = points;
  if (points > 0) {
    await User.updateOne({ _id: order.buyerId }, { $inc: { loyaltyPoints: points } }, { session });
    await LoyaltyEvent.create(
      [
        {
          userId: order.buyerId,
          points,
          type: "purchase",
          description: `Earned ${points} points from delivered order ${order.orderNumber}`,
          relatedId: order._id,
        },
      ],
      { session },
    );
  }

  await rewardReferralOnDelivery(order, merchandisePaid, session);

  order.deliveredAt = now;
  order.settled = true;
}

/**
 * A delivered, settled order is being refunded (e.g. dispute resolved in the
 * buyer's favour). Reverses the loyalty points it earned and the seller's
 * earnings; money already paid out is flagged for clawback.
 */
export async function reverseSettledOrder(order: OrderDoc, reason: string) {
  if (!order.settled) return;
  await reverseEarningsForOrder(String(order._id), reason);
  if (order.pointsEarned && order.pointsEarned > 0) {
    await User.updateOne({ _id: order.buyerId }, { $inc: { loyaltyPoints: -order.pointsEarned } });
    await LoyaltyEvent.create({
      userId: order.buyerId,
      points: -order.pointsEarned,
      type: "admin_adjustment",
      description: `Points reversed — order ${order.orderNumber} refunded`,
      relatedId: order._id,
    });
  }
}

/** Runs `fn` in a transaction, retrying transient errors; always ends the session. */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
