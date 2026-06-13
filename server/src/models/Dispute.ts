import { Schema, model, type InferSchemaType } from "mongoose";

const DisputeSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: {
      type: String,
      enum: ["wrong_item", "damaged", "not_delivered", "quality_issue", "other"],
      required: true,
    },
    description: { type: String, required: true, minlength: 20, maxlength: 2000 },
    evidenceImages: [String],
    status: {
      type: String,
      enum: ["open", "under_review", "resolved_refund", "resolved_no_action", "closed"],
      default: "open",
      index: true,
    },
    adminNote: { type: String, maxlength: 1000 },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    severity: { type: String, enum: ["high", "medium", "low"], default: "medium", index: true },
    aiClassified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type DisputeDoc = InferSchemaType<typeof DisputeSchema> & { _id: string };
export const Dispute = model("Dispute", DisputeSchema);
