import { Schema, model, type InferSchemaType } from "mongoose";

const AddressSchema = new Schema(
  {
    label: String,
    sector: { type: String, required: true },
    district: String,
    street: String,
    phone: String,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const UserSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, unique: true, sparse: true, index: true },
    passwordHash: { type: String },
    googleId: { type: String, index: true, sparse: true },
    role: { type: String, enum: ["buyer", "seller", "admin"], default: "buyer", index: true },
    profile: {
      name: String,
      avatar: String,
      language: { type: String, enum: ["en", "rw", "fr"], default: "en" },
    },
    addresses: [AddressSchema],
    loyaltyPoints: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: ["starter", "regular", "trusted", "vip"],
      default: "starter",
    },
    referralCode: { type: String, unique: true, index: true },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: Date,
    emailVerifiedAt: Date,
    phoneVerifiedAt: Date,
    notificationPrefs: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
    wishedProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    // password reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    // push notification subscription
    pushSubscription: { type: Schema.Types.Mixed },
    // fraud detection
    flaggedForReview: { type: Boolean, default: false, index: true },
    // soft-delete
    deletedAt: Date,
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string };
export const User = model("User", UserSchema);
