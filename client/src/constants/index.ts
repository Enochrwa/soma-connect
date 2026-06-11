export const KIGALI_SECTORS = [
  "Kimironko",
  "Remera",
  "Kacyiru",
  "Nyamirambo",
  "Gikondo",
  "Kibagabaga",
  "Kanombe",
  "Niboye",
  "Gisozi",
  "Kicukiro",
  "Gatenga",
  "Nyarugunga",
  "Masaka",
  "Kagarama",
  "Busanza",
] as const;

export const RWANDA_DISTRICTS = [
  "Gasabo",
  "Kicukiro",
  "Nyarugenge",
  "Musanze",
  "Huye",
  "Rubavu",
  "Rusizi",
  "Nyagatare",
  "Muhanga",
] as const;

export const CATEGORIES = [
  { slug: "electronics", label: "Electronics", emoji: "📱", color: "#3B82F6" },
  { slug: "fashion", label: "Fashion", emoji: "👗", color: "#EC4899" },
  { slug: "food", label: "Food & Grocery", emoji: "🍲", color: "#F59E0B" },
  { slug: "health", label: "Health", emoji: "🩺", color: "#10B981" },
  { slug: "home", label: "Home & Living", emoji: "🏠", color: "#8B5CF6" },
  { slug: "agriculture", label: "Agriculture", emoji: "🌱", color: "#22C55E" },
  { slug: "beauty", label: "Beauty", emoji: "💄", color: "#F43F5E" },
  { slug: "books", label: "Books", emoji: "📚", color: "#6366F1" },
  { slug: "services", label: "Services", emoji: "🛠️", color: "#14B8A6" },
  { slug: "automotive", label: "Automotive", emoji: "🚗", color: "#F97316" },
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  preparing: "Seller Preparing",
  packed: "Packed",
  picked_up: "Picked Up",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const LOYALTY_TIERS = {
  starter: { label: "Starter", color: "#94A3B8", emoji: "🥉", minPoints: 0 },
  regular: { label: "Regular", color: "#94A3B8", emoji: "🥈", minPoints: 500 },
  trusted: { label: "Trusted", color: "#F5A623", emoji: "🥇", minPoints: 2000 },
  vip: { label: "VIP", color: "#A855F7", emoji: "💎", minPoints: 5000 },
} as const;

export const DELIVERY_FEES = {
  standard: { label: "Standard (2–3 days)", fee: 1500, freeAbove: 10_000 },
  express: { label: "Express (next day)", fee: 2000, freeAbove: null },
  pickup: { label: "Pickup Point", fee: 0, freeAbove: null },
} as const;

export const VERIFICATION_BADGE: Record<string, { label: string; color: string }> = {
  basic: { label: "Basic", color: "#3B82F6" },
  trusted: { label: "Trusted", color: "#F59E0B" },
  verified: { label: "Verified", color: "#10B981" },
  top_seller: { label: "Top Seller", color: "#A855F7" },
};

export const APP_NAME = "SOMA Market";
export const CURRENCY = "RWF";
export const SUPPORT_WHATSAPP = "+250 788 000 000";
