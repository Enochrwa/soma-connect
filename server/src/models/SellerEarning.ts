import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * One row per (order, seller): what that seller earned from a delivered order
 * and how the platform's commission was taken. This is the ledger payouts are
 * built from — a payout can only ever claim rows that are `available`, and each
 * row can be claimed by exactly one payout, so earnings can't be paid twice.
 *
 * Lifecycle: available ──claim──▶ requested ──disbursed──▶ paid
 *                │                    └──payout failed──▶ available
 *                └──refund before payout──▶ reversed
 */
const SellerEarningSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },

    gross: { type: Number, required: true }, // item sales for this seller
    sellerDiscount: { type: Number, default: 0 }, // discounts the seller funded
    commissionBase: { type: Number, required: true }, // gross − sellerDiscount
    commissionRate: { type: Number, required: true },
    commission: { type: Number, required: true }, // platform's cut
    net: { type: Number, required: true }, // what the seller keeps

    status: {
      type: String,
      enum: ["available", "requested", "paid", "reversed"],
      default: "available",
      index: true,
    },
    // True while the buyer has an open dispute on this order — blocks withdrawal.
    onHold: { type: Boolean, default: false, index: true },
    // Withdrawable from this moment on (delivery + hold window).
    availableAt: { type: Date, required: true, index: true },
    payoutId: { type: Schema.Types.ObjectId, ref: "Payout", index: true },
    reversedAt: Date,
    reversalReason: String,
    // Set if a refund happened after the money was already requested/paid out —
    // an admin has to recover it from the seller's next payout.
    clawbackRequired: { type: Boolean, default: false, index: true },
    // The pending payout that is recovering this clawback (so two payouts can't both take it).
    clawbackPayoutId: { type: Schema.Types.ObjectId, ref: "Payout" },
  },
  { timestamps: true },
);

SellerEarningSchema.index({ orderId: 1, sellerId: 1 }, { unique: true });

export type SellerEarningDoc = InferSchemaType<typeof SellerEarningSchema> & { _id: string };
export const SellerEarning = model("SellerEarning", SellerEarningSchema);
