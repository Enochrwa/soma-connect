import { Schema, model, type InferSchemaType } from "mongoose";

const SellerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    storeName: { type: String, required: true },
    storeSlug: { type: String, required: true, unique: true, index: true },
    logo: String,
    banner: String,
    description: String,
    accountType: { type: String, enum: ["individual", "business", "farm"], default: "individual" },
    location: { sector: String, district: String },
    documents: {
      nidUrl: String,
      licenseUrl: String,
    },
    verificationTier: {
      type: String,
      enum: ["basic", "trusted", "verified", "top_seller"],
      default: "basic",
    },
    // Approval workflow: new sellers start as pending
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvalNote: String, // Admin note on rejection
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 }, // gross RWF of delivered sales (net of seller-funded discounts)
    // Mobile-money number earnings are paid to. Captured at registration.
    payoutPhone: { type: String },
    // Optional per-seller commission override (0–0.5). Falls back to the platform rate.
    commissionRate: { type: Number, min: 0, max: 0.5 },
    isActive: { type: Boolean, default: false }, // false until admin approves
    holidayMode: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type SellerDoc = InferSchemaType<typeof SellerSchema> & { _id: string };
export const Seller = model("Seller", SellerSchema);
