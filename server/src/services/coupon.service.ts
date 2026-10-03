import type { ClientSession } from "mongoose";
import { Coupon } from "../models/Coupon.js";
import { HttpError } from "../middleware/errorHandler.js";
import { couponDiscountFor, sumLines, type PricedLine } from "./finance.js";

type CouponDoc = InstanceType<typeof Coupon>;

export interface CouponEvaluation {
  discount: number;
  /** Set when the coupon belongs to a single seller — they fund it and it only applies to their items. */
  couponSellerId?: string;
}

/**
 * Checks a coupon against a cart and works out the discount.
 * Used by BOTH the live "apply coupon" check and order creation, so the number
 * the buyer sees is always the number they're charged.
 */
export function evaluateCoupon(
  coupon: CouponDoc,
  lines: PricedLine[],
  userId: string,
): CouponEvaluation {
  if (!coupon.isActive) throw new HttpError(400, "This coupon is no longer active.");
  if (new Date() > coupon.expiresAt) throw new HttpError(400, "This coupon has expired.");
  if (coupon.usedCount >= coupon.maxUses)
    throw new HttpError(400, "This coupon has reached its usage limit.");
  if (coupon.usedBy.map(String).includes(userId))
    throw new HttpError(400, "You have already used this coupon.");

  const sellerId = coupon.sellerId ? String(coupon.sellerId) : undefined;
  const eligible = sellerId ? lines.filter((l) => l.sellerId === sellerId) : lines;
  if (eligible.length === 0) {
    throw new HttpError(
      400,
      "This coupon only applies to items from a specific store, and none are in your cart.",
    );
  }
  const eligibleSubtotal = sumLines(eligible);
  if (eligibleSubtotal < coupon.minOrder) {
    throw new HttpError(
      400,
      `Minimum order of RWF ${coupon.minOrder.toLocaleString()} required${sellerId ? " from that store" : ""}.`,
    );
  }

  return {
    discount: couponDiscountFor({ type: coupon.type, value: coupon.value }, eligibleSubtotal),
    couponSellerId: sellerId,
  };
}

/**
 * Consumes one use of a coupon atomically. The conditions live in the update
 * filter itself, so two simultaneous checkouts can't both slip past the usage
 * limit or let one buyer use a single-use coupon twice.
 */
export async function redeemCoupon(couponId: unknown, userId: string, session: ClientSession) {
  const redeemed = await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      isActive: true,
      expiresAt: { $gt: new Date() },
      usedBy: { $ne: userId },
      $expr: { $lt: ["$usedCount", "$maxUses"] },
    },
    { $inc: { usedCount: 1 }, $push: { usedBy: userId } },
    { session, new: true },
  );
  if (!redeemed) throw new HttpError(400, "This coupon can no longer be used.");
  return redeemed;
}
