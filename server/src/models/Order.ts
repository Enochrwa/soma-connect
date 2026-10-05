import { Schema, model, type InferSchemaType } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    title: String,
    image: String,
    variant: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    // Share of the order-level discounts attributed to this line. Stored so a
    // seller's earnings can be recomputed exactly, forever, from the order alone.
    couponDiscount: { type: Number, default: 0 },
    loyaltyDiscount: { type: Number, default: 0 },
  },
  { _id: true },
);

const StatusHistorySchema = new Schema(
  {
    status: String,
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [OrderItemSchema],
    sellerIds: [{ type: Schema.Types.ObjectId, ref: "Seller", index: true }],
    status: {
      type: String,
      enum: [
        "placed",
        "payment_confirmed",
        "preparing",
        "packed",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
      index: true,
    },
    deliveryAddress: {
      sector: String,
      district: String,
      street: String,
      phone: String,
    },
    deliverySpeed: { type: String, enum: ["standard", "express", "pickup"], default: "standard" },
    deliveryFee: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // coupon or loyalty discount
    loyaltyDiscount: { type: Number, default: 0 }, // portion from loyalty points
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["mtn_momo", "airtel_money", "manual_transfer", "cod"],
      required: true,
    },
    paymentStatus: {
      type: String,
      // refund_pending: money was received but the order is cancelled/refunded —
      // an admin still has to send it back. refunded: it has been sent back.
      enum: ["pending", "manual_review", "paid", "failed", "refund_pending", "refunded"],
      default: "pending",
    },
    // Filled when the buyer pays by manual mobile-money transfer and submits proof.
    // An admin checks it against the MoMo statement, then confirms or rejects.
    manualPayment: {
      provider: { type: String, enum: ["mtn_momo", "airtel_money"] },
      senderPhone: String,
      reference: { type: String, index: true, sparse: true },
      submittedAt: Date,
      rejectedReason: String,
    },
    paymentRef: String,
    statusHistory: [StatusHistorySchema],
    couponCode: String,
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    // Set when the coupon belongs to one seller (that seller funds the discount).
    couponSellerId: { type: Schema.Types.ObjectId, ref: "Seller" },
    paidAt: Date,
    deliveredAt: Date,
    // True once delivery has been settled: seller earnings written, loyalty
    // points credited, referral reward evaluated. Guards against doing it twice.
    settled: { type: Boolean, default: false },
    pointsRedeemed: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
  },
  { timestamps: true },
);

export type OrderDoc = InferSchemaType<typeof OrderSchema> & { _id: string };
export const Order = model("Order", OrderSchema);
