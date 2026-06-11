// ─── Shared server-side types ────────────────────────────────────────────────

export type UserRole = "buyer" | "seller" | "admin";
export type LoyaltyTier = "starter" | "regular" | "trusted" | "vip";
export type VerificationTier = "basic" | "trusted" | "verified" | "top_seller";
export type OrderStatus =
  | "placed"
  | "payment_confirmed"
  | "preparing"
  | "packed"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "manual_review" | "paid" | "failed" | "refunded";
export type PaymentMethod = "mtn_momo" | "airtel_money" | "cod";
export type DeliverySpeed = "standard" | "express" | "pickup";

/** Re-export for use in route handlers */
export interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
