/**
 * One-off migration: build the seller earnings ledger for orders that were
 * delivered BEFORE the ledger existed, so sellers don't lose past earnings.
 *
 *   npm run backfill:earnings            # dry run (prints what it would do)
 *   npm run backfill:earnings -- --apply # write changes
 *
 * Rules: orders covered by an already-"sent" payout period become `paid`; those
 * covered by a pending/processing payout become `requested` (linked to it);
 * everything else is `available`. Loyalty points/referrals are NOT re-awarded
 * (the old code credited points at order time). Safe to re-run: it skips orders
 * already `settled`.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Order } from "../models/Order.js";
import { Payout } from "../models/Payout.js";
import { Seller } from "../models/Seller.js";
import { SellerEarning } from "../models/SellerEarning.js";
import { commissionRateFor } from "../services/earnings.service.js";
import { computeSellerEarning } from "../services/finance.js";
import { orderLines } from "../services/order.lifecycle.js";

const apply = process.argv.includes("--apply");

async function main() {
  await mongoose.connect(env.MONGO_URI);
  const orders = await Order.find({ status: "delivered", settled: { $ne: true } });
  console.log(
    `${orders.length} delivered, unsettled order(s). Mode: ${apply ? "APPLY" : "DRY RUN"}`,
  );

  const payouts = await Payout.find({ status: { $in: ["sent", "pending", "processing"] } }).lean();
  let rows = 0;

  for (const order of orders) {
    const sellers = await Seller.find({ _id: { $in: order.sellerIds } });
    for (const seller of sellers) {
      const e = computeSellerEarning({
        lines: orderLines(order),
        sellerId: String(seller._id),
        couponSellerId: order.couponSellerId ? String(order.couponSellerId) : undefined,
        commissionRate: commissionRateFor(seller),
      });
      if (e.gross === 0) continue;

      const coveredBy = payouts.find(
        (p) =>
          String(p.sellerId) === String(seller._id) &&
          p.periodEnd &&
          order.createdAt <= p.periodEnd &&
          (!p.periodStart || order.createdAt > p.periodStart),
      );
      const status = !coveredBy ? "available" : coveredBy.status === "sent" ? "paid" : "requested";
      rows += 1;
      console.log(`  ${order.orderNumber} / ${seller.storeName}: net ${e.net} → ${status}`);
      if (!apply) continue;

      await SellerEarning.updateOne(
        { orderId: order._id, sellerId: seller._id },
        {
          $setOnInsert: {
            orderNumber: order.orderNumber,
            gross: e.gross,
            sellerDiscount: e.sellerDiscount,
            commissionBase: e.commissionBase,
            commissionRate: e.commissionRate,
            commission: e.commission,
            net: e.net,
            status,
            payoutId: status === "requested" ? coveredBy!._id : undefined,
            availableAt: order.updatedAt,
          },
        },
        { upsert: true },
      );
      await Seller.updateOne({ _id: seller._id }, { $inc: { totalSales: e.commissionBase } });
    }
    if (apply) {
      order.settled = true;
      order.deliveredAt = order.deliveredAt ?? order.updatedAt;
      if (order.paymentMethod === "cod" && order.paymentStatus !== "paid")
        order.paymentStatus = "paid";
      await order.save();
    }
  }
  console.log(`${apply ? "Wrote" : "Would write"} ${rows} ledger row(s).`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
