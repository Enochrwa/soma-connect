import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Tracks one invitation: referrer → the friend they brought in.
 * A person can only ever be referred once (unique refereeId), and the reward is
 * paid exactly once, when the friend's first qualifying order is delivered.
 */
const ReferralSchema = new Schema(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refereeId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    code: { type: String, required: true }, // the referral code that was used
    status: {
      type: String,
      enum: ["pending", "rewarded", "rejected"],
      default: "pending",
      index: true,
    },
    qualifyingOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    referrerPoints: { type: Number, default: 0 },
    refereePoints: { type: Number, default: 0 },
    rewardedAt: Date,
    rejectReason: String,
  },
  { timestamps: true },
);

export type ReferralDoc = InferSchemaType<typeof ReferralSchema> & { _id: string };
export const Referral = model("Referral", ReferralSchema);
