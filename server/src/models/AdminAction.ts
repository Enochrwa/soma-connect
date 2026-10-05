import { Schema, model, type InferSchemaType } from "mongoose";

/** Audit trail: who did what in the admin console, and to which record. */
const AdminActionSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminName: String,
    action: { type: String, required: true, index: true }, // e.g. "order.confirm_payment"
    targetType: { type: String, index: true }, // order | user | seller | product | payout | referral | coupon
    targetId: String,
    summary: { type: String, required: true },
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AdminActionSchema.index({ createdAt: -1 });

export type AdminActionDoc = InferSchemaType<typeof AdminActionSchema> & { _id: string };
export const AdminAction = model("AdminAction", AdminActionSchema);
