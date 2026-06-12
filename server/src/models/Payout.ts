import { Schema, model, type InferSchemaType } from "mongoose";

const PayoutSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    amount: { type: Number, required: true }, // RWF, after platform commission
    grossAmount: { type: Number, required: true }, // before commission
    commission: { type: Number, required: true }, // platform fee
    commissionRate: { type: Number, default: 0.1 }, // 10%
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      default: "pending",
      index: true,
    },
    momoPhone: { type: String }, // MoMo number to disburse to
    momoRef: { type: String }, // reference from MoMo API
    note: { type: String },
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User" }, // admin who triggered it
    periodStart: { type: Date },
    periodEnd: { type: Date },
  },
  { timestamps: true },
);

export type PayoutDoc = InferSchemaType<typeof PayoutSchema> & { _id: string };
export const Payout = model("Payout", PayoutSchema);
