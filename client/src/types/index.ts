// ─── Shared domain types used across the client ─────────────────────────────

export type UserRole = "buyer" | "seller" | "admin";
export type Language = "en" | "rw" | "fr";
export type LoyaltyTier = "starter" | "regular" | "trusted" | "vip";
export type VerificationTier = "basic" | "trusted" | "verified" | "top_seller";
export type AccountType = "individual" | "business" | "farm";
export type Condition = "new" | "used";
export type PaymentMethod = "mtn_momo" | "airtel_money" | "cod";
export type DeliverySpeed = "standard" | "express" | "pickup";

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

// ─── User ────────────────────────────────────────────────────────────────────

export interface Address {
  _id: string;
  label?: string;
  sector: string;
  district?: string;
  street?: string;
  phone?: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  role: UserRole;
  profile?: {
    name?: string;
    avatar?: string;
    language?: Language;
  };
  addresses?: Address[];
  loyaltyPoints: number;
  tier: LoyaltyTier;
  referralCode?: string;
}

// ─── Seller ──────────────────────────────────────────────────────────────────

export interface Seller {
  _id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  logo?: string;
  banner?: string;
  description?: string;
  accountType: AccountType;
  location?: { sector?: string; district?: string };
  verificationTier: VerificationTier;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalNote?: string;
  rating: number;
  ratingCount: number;
  totalSales: number;
  isActive: boolean;
  holidayMode: boolean;
  createdAt: string;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductVariant {
  _id: string;
  name: string;
  options: string[];
  priceDelta: number;
  stock: number;
  sku?: string;
}

export interface Product {
  _id: string;
  sellerId: string | Seller;
  title: string;
  slug: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  price: number;
  comparePrice?: number;
  currency: string;
  images: string[];
  videos?: string[];
  variants?: ProductVariant[];
  stock: number;
  condition: Condition;
  avgRating: number;
  reviewCount: number;
  salesCount: number;
  flashSale?: {
    isActive: boolean;
    endsAt?: string;
    discountPct?: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  _id: string;
  productId: string;
  sellerId: string;
  title: string;
  image?: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
}

export interface StatusHistoryEntry {
  status: string;
  note?: string;
  at: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  buyerId: string;
  items: OrderItem[];
  sellerIds: string[];
  status: OrderStatus;
  deliveryAddress: {
    sector: string;
    district?: string;
    street?: string;
    phone?: string;
  };
  deliverySpeed: DeliverySpeed;
  deliveryFee: number;
  subtotal: number;
  discount: number;
  loyaltyDiscount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  statusHistory: StatusHistoryEntry[];
  couponCode?: string;
  pointsRedeemed: number;
  pointsEarned: number;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review {
  _id: string;
  productId: string;
  buyerId: string;
  orderId?: string;
  rating: number;
  text: string;
  images?: string[];
  tags?: string[];
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  sellerReply?: { text: string; at: string };
  createdAt: string;
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export interface LoyaltyEvent {
  _id: string;
  userId: string;
  points: number;
  type: string;
  description: string;
  createdAt: string;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: unknown;
}

// ─── Coupon ───────────────────────────────────────────────────────────────────

export interface Coupon {
  _id: string;
  code: string;
  sellerId?: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Payout ───────────────────────────────────────────────────────────────────

export interface Payout {
  _id: string;
  sellerId: string | { _id: string; storeName: string };
  amount: number;
  grossAmount: number;
  commission: number;
  commissionRate: number;
  status: "pending" | "processing" | "sent" | "failed";
  momoPhone?: string;
  momoRef?: string;
  note?: string;
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
}

// ─── Dispute ─────────────────────────────────────────────────────────────────

export interface Dispute {
  _id: string;
  orderId: string | { _id: string; orderNumber: string; total: number; status: string };
  buyerId: string | { _id: string; profile?: { name?: string }; phone?: string; email?: string };
  reason: "wrong_item" | "damaged" | "not_delivered" | "quality_issue" | "other";
  description: string;
  evidenceImages?: string[];
  status: "open" | "under_review" | "resolved_refund" | "resolved_no_action" | "closed";
  adminNote?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface AppNotification {
  _id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Order update (add discount/tracking fields) ─────────────────────────────

// Extends Order with new fields
declare module "./index" {}
