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

    // ── pawaPay (Merchant API v2) ────────────────────────────────────────────
    provider: { type: String, enum: ["manual", "pawapay"], default: "manual", index: true },
    pawapayDepositId: { type: String, index: true, sparse: true }, // UUIDv4 we generate
    pawapayProvider: { type: String }, // MTN_MOMO_RWA | AIRTEL_RWA
    pawapayStatus: { type: String }, // ACCEPTED|ENQUEUED|SUBMITTED|PROCESSING|COMPLETED|FAILED|IN_RECONCILIATION
    pawapayFailureCode: { type: String },
    pawapayFailureMessage: { type: String },
    providerTransactionId: { type: String },
    // Set when we could not determine the outcome; picked up by the reconcile job.
    needsReconciliation: { type: Boolean, default: false, index: true },
    lastStatusCheckAt: { type: Date },
  },
  { timestamps: true },
);

export type TransactionDoc = InferSchemaType<typeof TransactionSchema> & { _id: string };
export const Transaction = model("Transaction", TransactionSchema);
