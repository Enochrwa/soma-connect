import { Schema, model, type InferSchemaType } from "mongoose";

const LoyaltyEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    points: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        "purchase",
        "review",
        "referral",
        "daily_login",
        "profile_complete",
        "mystery_box",
        "spin_wheel",
        "admin_adjustment",
        "redeemed",
      ],
      required: true,
    },
    description: { type: String, default: "" },
    relatedId: { type: Schema.Types.ObjectId }, // orderId, reviewId, etc.
  },
  { timestamps: true },
);

export type LoyaltyEventDoc = InferSchemaType<typeof LoyaltyEventSchema> & { _id: string };
export const LoyaltyEvent = model("LoyaltyEvent", LoyaltyEventSchema);
