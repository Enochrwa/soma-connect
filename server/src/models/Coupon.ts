import { Schema, model, type InferSchemaType } from "mongoose";

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", index: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true }, // % or RWF
    minOrder: { type: Number, default: 0 }, // minimum order total RWF
    maxUses: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    usedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CouponDoc = InferSchemaType<typeof CouponSchema> & { _id: string };
export const Coupon = model("Coupon", CouponSchema);
