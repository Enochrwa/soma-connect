import { Schema, model, type InferSchemaType } from "mongoose";

const TransactionSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["mtn_momo", "airtel_money", "cod"], required: true },
    mockRef: String,
    phone: String,
    status: {
      type: String,
      enum: ["initiated", "manual_review", "succeeded", "failed"],
      default: "initiated",
    },
    rawMeta: Schema.Types.Mixed,
  },
  { timestamps: true },
);

export type TransactionDoc = InferSchemaType<typeof TransactionSchema> & { _id: string };
export const Transaction = model("Transaction", TransactionSchema);
