import { Schema, model, type InferSchemaType } from "mongoose";

const LoyaltyEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    points: { type: Number, required: true },
    type: {
      type: String,
      enum: ["purchase", "review", "referral", "daily_login", "profile_completed", "redeem", "mystery_box"],
      required: true,
    },
    description: String,
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: true }
);

export type LoyaltyEventDoc = InferSchemaType<typeof LoyaltyEventSchema> & { _id: string };
export const LoyaltyEvent = model("LoyaltyEvent", LoyaltyEventSchema);