import { Schema, model, type InferSchemaType } from "mongoose";

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true, uppercase: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller" },
    type: { type: String, enum: ["percent", "fixed"], required: true },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    usageLimit: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type CouponDoc = InferSchemaType<typeof CouponSchema> & { _id: string };
export const Coupon = model("Coupon", CouponSchema);