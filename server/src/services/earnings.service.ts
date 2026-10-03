/**
 * Seller earnings ledger: commission, balances and payout claiming.
 *
 * The invariants this file protects:
 *  1. Commission is computed once, at delivery, from the order — never re-derived later.
 *  2. A ledger row can belong to at most one payout (atomic claim), so a seller
 *     who double-clicks "request payout" cannot be paid twice for the same sale.
 *  3. If a payout fails, its rows go back to `available` — nothing is lost.
 *  4. Refunds before payout reverse the row; refunds after payout leave a
 *     clawback that is netted off the seller's next payout.
 */
import mongoose from "mongoose";
import { BUSINESS } from "../config/business.js";
import { Order } from "../models/Order.js";
import { Payout } from "../models/Payout.js";
import { Seller } from "../models/Seller.js";
import { SellerEarning } from "../models/SellerEarning.js";
import { HttpError } from "../middleware/errorHandler.js";
import { computeSellerEarning, type DiscountedLine } from "./finance.js";

const oid = (id: unknown) => new mongoose.Types.ObjectId(String(id));

export function commissionRateFor(seller: { commissionRate?: number | null }): number {
  return typeof seller.commissionRate === "number"
    ? seller.commissionRate
    : BUSINESS.COMMISSION_RATE;
}

export interface SellerBalance {
  /** Withdrawable right now. */
  available: number;
  /** Delivered, but still inside the dispute/return hold window. */
  clearing: number;
  /** Already requested and being paid out. */
  inPayout: number;
  /** Lifetime amount actually paid to the seller. */
  paidOut: number;
  /** Estimated net on paid orders that haven't been delivered yet. */
  upcoming: number;
  /** Lifetime commission taken by the platform on this seller's sales. */
  totalCommission: number;
  /** Lifetime item sales (before commission), net of seller-funded discounts. */
  totalSales: number;
  /** Refund clawbacks that will be netted off the next payout. */
  owed: number;
  commissionRate: number;
  minPayout: number;
  holdDays: number;
}

export async function getSellerBalance(sellerId: string): Promise<SellerBalance> {
  const now = new Date();
  const seller = await Seller.findById(sellerId).lean();
  const rate = seller ? commissionRateFor(seller) : BUSINESS.COMMISSION_RATE;

  const rows = await SellerEarning.aggregate<{
    _id: { status: string; ready: boolean; clawback: boolean };
    net: number;
    commission: number;
    base: number;
  }>([
    { $match: { sellerId: oid(sellerId) } },
    {
      $group: {
        _id: {
          status: "$status",
          ready: { $and: [{ $lte: ["$availableAt", now] }, { $ne: ["$onHold", true] }] },
          clawback: { $eq: ["$clawbackRequired", true] },
        },
        net: { $sum: "$net" },
        commission: { $sum: "$commission" },
        base: { $sum: "$commissionBase" },
      },
    },
  ]);

  const bal: SellerBalance = {
    available: 0,
    clearing: 0,
    inPayout: 0,
    paidOut: 0,
    upcoming: 0,
    totalCommission: 0,
    totalSales: 0,
    owed: 0,
    commissionRate: rate,
    minPayout: BUSINESS.MIN_PAYOUT_RWF,
    holdDays: BUSINESS.EARNINGS_HOLD_DAYS,
  };

  for (const r of rows) {
    const { status, ready, clawback } = r._id;
    // Refunded after payout: the money is owed back, and the sale no longer counts.
    if (clawback) {
      bal.owed += r.net;
      continue;
    }
    if (status === "reversed") continue;
    bal.totalCommission += r.commission;
    bal.totalSales += r.base;
    if (status === "available") {
      if (ready) bal.available += r.net;
      else bal.clearing += r.net;
    } else if (status === "requested") bal.inPayout += r.net;
    else if (status === "paid") bal.paidOut += r.net;
  }

  // Paid (or cash-on-delivery) orders still on their way: show sellers what's coming.
  const open = await Order.find({
    sellerIds: oid(sellerId),
    settled: { $ne: true },
    status: { $in: ["payment_confirmed", "preparing", "packed", "picked_up", "out_for_delivery"] },
  })
    .select("items couponSellerId")
    .limit(200)
    .lean();
  for (const o of open) {
    const lines: DiscountedLine[] = o.items.map((i) => ({
      productId: String(i.productId),
      sellerId: String(i.sellerId),
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      couponDiscount: i.couponDiscount ?? 0,
      loyaltyDiscount: i.loyaltyDiscount ?? 0,
    }));
    bal.upcoming += computeSellerEarning({
      lines,
      sellerId: String(sellerId),
      couponSellerId: o.couponSellerId ? String(o.couponSellerId) : undefined,
      commissionRate: rate,
    }).net;
  }

  return bal;
}

/**
 * Atomically claims every withdrawable earning for a new payout.
 * Throws (and releases anything it claimed) if there's nothing worth paying out.
 */
export async function createPayoutForSeller(opts: { sellerId: string; momoPhone: string }) {
  const payoutId = new mongoose.Types.ObjectId();
  const now = new Date();

  // Atomic claim: each ledger row can only flip available → requested once.
  await SellerEarning.updateMany(
    {
      sellerId: oid(opts.sellerId),
      status: "available",
      availableAt: { $lte: now },
      onHold: { $ne: true },
    },
    { $set: { status: "requested", payoutId } },
  );
  const claimed = await SellerEarning.find({ payoutId }).lean();

  // Refund clawbacks owed from previously paid sales, netted off this payout.
  await SellerEarning.updateMany(
    {
      sellerId: oid(opts.sellerId),
      clawbackRequired: true,
      clawbackPayoutId: { $exists: false },
      status: { $in: ["requested", "paid"] },
      payoutId: { $ne: payoutId },
    },
    { $set: { clawbackPayoutId: payoutId } },
  );
  const clawbacks = await SellerEarning.find({ clawbackPayoutId: payoutId }).lean();

  const release = async () => {
    await SellerEarning.updateMany(
      { payoutId, status: "requested" },
      { $set: { status: "available" }, $unset: { payoutId: 1 } },
    );
    await SellerEarning.updateMany(
      { clawbackPayoutId: payoutId },
      { $unset: { clawbackPayoutId: 1 } },
    );
  };

  const grossAmount = claimed.reduce((s, e) => s + e.commissionBase, 0);
  const commission = claimed.reduce((s, e) => s + e.commission, 0);
  const net = claimed.reduce((s, e) => s + e.net, 0);
  const adjustments = clawbacks.reduce((s, e) => s + e.net, 0);
  const amount = net - adjustments;

  if (claimed.length === 0) {
    await release();
    throw new HttpError(
      400,
      `No earnings are ready to withdraw yet. Earnings become available ${BUSINESS.EARNINGS_HOLD_DAYS} day(s) after an order is delivered.`,
    );
  }
  if (amount < BUSINESS.MIN_PAYOUT_RWF) {
    await release();
    throw new HttpError(
      400,
      adjustments > 0
        ? `After RWF ${adjustments.toLocaleString()} of refund adjustments your available balance is RWF ${Math.max(0, amount).toLocaleString()}. Minimum payout is RWF ${BUSINESS.MIN_PAYOUT_RWF.toLocaleString()}.`
        : `Minimum payout is RWF ${BUSINESS.MIN_PAYOUT_RWF.toLocaleString()}. Your available balance is RWF ${amount.toLocaleString()}. Keep selling!`,
    );
  }

  const times = claimed.map((e) => e.createdAt.getTime());
  try {
    const payout = await Payout.create({
      _id: payoutId,
      sellerId: oid(opts.sellerId),
      amount,
      grossAmount,
      commission,
      commissionRate: grossAmount > 0 ? Number((commission / grossAmount).toFixed(4)) : 0,
      adjustments,
      adjustmentEarningIds: clawbacks.map((e) => e._id),
      status: "pending",
      momoPhone: opts.momoPhone,
      periodStart: new Date(Math.min(...times)),
      periodEnd: now,
    });
    return payout;
  } catch (e) {
    await release();
    throw e;
  }
}

/** Payout reached the seller: lock the rows in as paid and settle any clawbacks it recovered. */
export async function markEarningsPaid(payoutId: string) {
  await SellerEarning.updateMany(
    { payoutId: oid(payoutId), status: "requested" },
    { $set: { status: "paid" } },
  );
  const payout = await Payout.findById(payoutId).lean();
  if (payout?.adjustmentEarningIds?.length) {
    await SellerEarning.updateMany(
      { _id: { $in: payout.adjustmentEarningIds } },
      {
        $set: {
          clawbackRequired: false,
          status: "reversed",
          reversedAt: new Date(),
          reversalReason: `Recovered from payout ${payoutId}`,
        },
      },
    );
  }
}

/** Payout failed / was rejected: nothing was paid, so the seller's earnings become available again. */
export async function releaseEarnings(payoutId: string) {
  await SellerEarning.updateMany(
    { payoutId: oid(payoutId), status: "requested" },
    { $set: { status: "available" }, $unset: { payoutId: 1 } },
  );
  await SellerEarning.updateMany(
    { clawbackPayoutId: oid(payoutId) },
    { $unset: { clawbackPayoutId: 1 } },
  );
}

/**
 * A delivered order was refunded. Rows not yet claimed are simply reversed;
 * rows already requested/paid out are flagged so the money is recovered from
 * the seller's next payout.
 */
export async function reverseEarningsForOrder(orderId: string, reason: string) {
  const rows = await SellerEarning.find({ orderId: oid(orderId) });
  for (const row of rows) {
    if (row.status === "reversed") continue;
    if (row.status === "available") {
      row.status = "reversed";
      row.reversedAt = new Date();
      row.reversalReason = reason;
      await Seller.updateOne({ _id: row.sellerId }, { $inc: { totalSales: -row.commissionBase } });
    } else if (!row.clawbackRequired) {
      row.clawbackRequired = true;
      row.reversalReason = reason;
      await Seller.updateOne({ _id: row.sellerId }, { $inc: { totalSales: -row.commissionBase } });
    }
    await row.save();
  }
}

/** Buyer opened a dispute: freeze the seller's earnings for that order until it's resolved. */
export async function holdEarningsForOrder(orderId: string, hold: boolean) {
  await SellerEarning.updateMany(
    { orderId: oid(orderId), status: "available" },
    { $set: { onHold: hold } },
  );
}
