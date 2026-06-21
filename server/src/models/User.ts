import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

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

/** Shape inferred from the schema — used internally. */
type UserSchemaType = InferSchemaType<typeof UserSchema>;

/**
 * Instance methods / virtual fields that exist on Mongoose documents but are
 * not part of the persisted schema.  Declaring them here causes `model<IUser>`
 * to include them on every document returned by `findOne`, `create`, etc.
 */
export interface IUser extends UserSchemaType {
  _id: string;
  /**
   * Transient flag set by the passport verify callback to signal that an
   * existing-email account was just linked to Google for the first time.
   * Never saved to the database.
   */
  newlyLinkedGoogle?: boolean;
}

/** Hydrated Mongoose document — what `User.findOne()` / `User.create()` return. */
export type UserDoc = HydratedDocument<IUser>;

export const User = model<IUser>("User", UserSchema);
