import { Schema, model, type InferSchemaType } from "mongoose";

const ReviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, minlength: 20, maxlength: 2000 },
    images: [String],
    tags: [String],
    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0 },
    needsModeration: { type: Boolean, default: false, index: true },
    sentimentScore: { type: Number },
    sentiment: { type: String, enum: ["positive", "neutral", "negative"] },
    sellerReply: {
      text: String,
      at: Date,
    },
  },
  { timestamps: true },
);

export type ReviewDoc = InferSchemaType<typeof ReviewSchema> & { _id: string };
export const Review = model("Review", ReviewSchema);
