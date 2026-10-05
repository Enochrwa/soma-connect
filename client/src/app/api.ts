import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import type {
  User,
  Product,
  Seller,
  Order,
  Review,
  LoyaltyEvent,
  PaginatedResponse,
  Coupon,
  Payout,
  SellerBalance,
  PaymentConfig,
  SellerEarningRow,
  ReferralSummary,
  Dispute,
  AppNotification,
} from "../types";

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Products",
    "Product",
    "Cart",
    "Orders",
    "Order",
    "Me",
    "Seller",
    "Reviews",
    "Notifications",
    "Loyalty",
    "AdminStats",
    "Wishlist",
    "Disputes",
  ],
  endpoints: (b) => ({
    // ── Products ─────────────────────────────────────────────────────────────
    listProducts: b.query<PaginatedResponse<Product>, Record<string, string | number | undefined>>({
      query: (params) => ({ url: "/products", params }),
      providesTags: ["Products"],
    }),
    flashDeals: b.query<{ items: Product[] }, void>({
      query: () => "/products/flash-deals",
    }),
    trending: b.query<{ items: Product[] }, void>({
      query: () => "/products/trending",
    }),
    newArrivals: b.query<{ items: Product[] }, void>({
      query: () => "/products/new",
    }),
    getProduct: b.query<{ product: Product }, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Product", id }],
    }),
    createProduct: b.mutation<{ product: Product }, Partial<Product>>({
      query: (body) => ({ url: "/products", method: "POST", body }),
      invalidatesTags: ["Products"],
    }),
    updateProduct: b.mutation<{ product: Product }, { id: string } & Partial<Product>>({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Product", id }, "Products"],
    }),
    deleteProduct: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["Products"],
    }),

    // ── Bulk product import ───────────────────────────────────────────────────
    bulkImportProducts: b.mutation<
      {
        ok: boolean;
        summary: {
          total: number;
          inserted: number;
          validationFailed: number;
          insertFailed: number;
        };
        validationErrors: Array<{ row: number; errors: string[] }>;
        insertErrors: Array<{ row: number; error: string }>;
      },
      FormData
    >({
      query: (formData) => ({
        url: "/products/bulk/import",
        method: "POST",
        body: formData,
        formData: true,
      }),
      invalidatesTags: ["Products"],
    }),
    validateBulkImport: b.mutation<
      {
        ok: boolean;
        total: number;
        validCount: number;
        invalidCount: number;
        rows: Array<{
          row: number;
          valid: boolean;
          errors: string[];
          preview: { title: string; price: number; category: string } | null;
        }>;
      },
      FormData
    >({
      query: (formData) => ({
        url: "/products/bulk/validate",
        method: "POST",
        body: formData,
        formData: true,
      }),
    }),

    // ── Contact ───────────────────────────────────────────────────────────────
    submitContact: b.mutation<
      { ok: boolean; message: string },
      {
        name: string;
        email: string;
        subject: string;
        category:
          | "general"
          | "order_support"
          | "seller_support"
          | "technical"
          | "partnership"
          | "press";
        message: string;
        orderId?: string;
      }
    >({
      query: (body) => ({ url: "/contact", method: "POST", body }),
    }),

    // ── Auth ─────────────────────────────────────────────────────────────────
    login: b.mutation<{ user: User; accessToken: string }, { phone: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    register: b.mutation<
      { user: User; accessToken: string },
      { name: string; phone: string; email?: string; password: string; referralCode?: string }
    >({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    checkReferralCode: b.query<{ valid: boolean; referrerName?: string }, string>({
      query: (code) => `/auth/referral/${encodeURIComponent(code)}`,
    }),
    requestOtp: b.mutation<{ ok: boolean }, { email: string }>({
      query: (body) => ({ url: "/auth/otp/request", method: "POST", body }),
    }),
    verifyOtp: b.mutation<{ user: User; accessToken: string }, { email: string; code: string }>({
      query: (body) => ({ url: "/auth/otp/verify", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    refreshToken: b.mutation<{ user: User; accessToken: string }, void>({
      query: () => ({ url: "/auth/refresh", method: "POST" }),
    }),
    logout: b.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      invalidatesTags: ["Me", "Cart", "Orders"],
    }),

    // ── User ─────────────────────────────────────────────────────────────────
    getMe: b.query<{ user: User }, void>({
      query: () => "/users/me",
      providesTags: ["Me"],
    }),
    updateProfile: b.mutation<{ user: User }, Partial<User>>({
      query: (body) => ({ url: "/users/me", method: "PATCH", body }),
      invalidatesTags: ["Me"],
    }),
    addAddress: b.mutation<
      { addresses: User["addresses"] },
      {
        label?: string;
        sector: string;
        district?: string;
        street?: string;
        phone?: string;
        isDefault?: boolean;
      }
    >({
      query: (body) => ({ url: "/users/me/addresses", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    deleteAddress: b.mutation<{ addresses: User["addresses"] }, string>({
      query: (id) => ({ url: `/users/me/addresses/${id}`, method: "DELETE" }),
      invalidatesTags: ["Me"],
    }),
    getMyOrders: b.query<{ orders: Order[] }, void>({
      query: () => "/users/me/orders",
      providesTags: ["Orders"],
    }),

    // ── Orders ───────────────────────────────────────────────────────────────
    createOrder: b.mutation<
      { order: Order },
      {
        items: Array<{ productId: string; quantity: number; variant?: string }>;
        deliveryAddress: { sector: string; district?: string; street?: string; phone: string };
        deliverySpeed: "standard" | "express" | "pickup";
        paymentMethod: "mtn_momo" | "airtel_money" | "manual_transfer" | "cod";
        couponCode?: string;
        pointsToRedeem?: number;
      }
    >({
      query: (body) => ({ url: "/orders", method: "POST", body }),
      invalidatesTags: ["Orders"],
    }),
    getOrder: b.query<{ order: Order }, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Order", id }],
    }),

    // ── Payments ─────────────────────────────────────────────────────────────
    getPaymentConfig: b.query<PaymentConfig, void>({
      query: () => "/payments/config",
    }),
    submitManualPayment: b.mutation<
      { status: string; message: string },
      {
        orderId: string;
        provider: "mtn_momo" | "airtel_money";
        senderPhone: string;
        reference: string;
      }
    >({
      query: (body) => ({ url: "/payments/manual", method: "POST", body }),
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "Order", id: orderId }, "Orders"],
    }),
    payMock: b.mutation<
      { mockRef: string; message: string },
      { orderId: string; method: "mtn_momo" | "airtel_money"; phone: string }
    >({
      query: (body) => ({ url: "/payments/mock", method: "POST", body }),
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "Order", id: orderId }],
    }),

    // ── Reviews ──────────────────────────────────────────────────────────────
    getReviews: b.query<{ reviews: Review[] }, string>({
      query: (productId) => `/reviews/product/${productId}`,
      providesTags: (_r, _e, id) => [{ type: "Reviews", id }],
    }),
    createReview: b.mutation<
      { review: Review },
      { productId: string; rating: number; text: string; images?: string[]; tags?: string[] }
    >({
      query: (body) => ({ url: "/reviews", method: "POST", body }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "Reviews", id: productId },
        { type: "Product", id: productId },
      ],
    }),

    // ── Sellers ──────────────────────────────────────────────────────────────
    getSeller: b.query<{ seller: Seller; products: Product[] }, string>({
      query: (slug) => `/sellers/${slug}`,
      providesTags: (_r, _e, slug) => [{ type: "Seller", id: slug }],
    }),
    applyAsSeller: b.mutation<
      { seller: Seller },
      {
        storeName: string;
        description?: string;
        accountType?: string;
        sector: string;
        payoutPhone?: string;
        logo?: string;
        banner?: string;
        nidUrl?: string;
        licenseUrl?: string;
      }
    >({
      query: (body) => ({ url: "/sellers/apply", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    getMyStore: b.query<{ seller: Seller; productCount: number }, void>({
      query: () => "/sellers/me/overview",
      providesTags: ["Seller"],
    }),

    // ── Uploads ──────────────────────────────────────────────────────────────
    initiatePayment: b.mutation<
      { mockRef?: string; txRef?: string; message: string },
      { orderId: string; method: string; phone: string }
    >({
      query: (body) => ({ url: "/payments/mock", method: "POST", body }),
      invalidatesTags: ["Orders"],
    }),
    // ── pawaPay (Merchant API v2) ────────────────────────────────────────────
    pawapayPredict: b.mutation<
      { country: string; provider: "MTN_MOMO_RWA" | "AIRTEL_RWA"; phoneNumber: string },
      { phone: string }
    >({
      query: (body) => ({ url: "/payments/pawapay/predict", method: "POST", body }),
    }),
    pawapayInitiate: b.mutation<
      { depositId: string; status: string; provider?: string; message: string },
      { orderId: string; phone: string; provider?: "MTN_MOMO_RWA" | "AIRTEL_RWA" }
    >({
      query: (body) => ({ url: "/payments/pawapay/initiate", method: "POST", body }),
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "Order", id: orderId }],
    }),
    pawapayStatus: b.query<{ status: string; pawapayStatus?: string; message?: string }, string>({
      query: (depositId) => `/payments/pawapay/status/${depositId}`,
    }),

    getPaymentStatus: b.query<{ status: string; method: string }, string>({
      query: (ref) => `/payments/status/${ref}`,
    }),

    uploadFiles: b.mutation<{ urls: string[] }, FormData>({
      query: (formData) => ({
        url: "/uploads",
        method: "POST",
        body: formData,
        formData: true,
      }),
    }),

    // ── AI ───────────────────────────────────────────────────────────────────
    aiChat: b.mutation<
      { reply: string },
      { messages: Array<{ role: "user" | "assistant" | "system"; content: string }> }
    >({
      query: (body) => ({ url: "/ai/chat", method: "POST", body }),
    }),

    // ── Loyalty ──────────────────────────────────────────────────────────────
    getLoyalty: b.query<{ points: number; tier: string; events: LoyaltyEvent[] }, void>({
      query: () => "/loyalty/me",
      providesTags: ["Loyalty"],
    }),
    getMyReferrals: b.query<ReferralSummary, void>({
      query: () => "/users/me/referrals",
      providesTags: ["Loyalty"],
    }),
    claimDailyLogin: b.mutation<{ awarded: number; message?: string }, void>({
      query: () => ({ url: "/loyalty/daily-login", method: "POST" }),
      invalidatesTags: ["Loyalty", "Me"],
    }),

    // ── Notifications ────────────────────────────────────────────────────────
    getNotifications: b.query<{ notifications: AppNotification[]; unreadCount: number }, void>({
      query: () => "/notifications",
      providesTags: ["Notifications"],
    }),
    markNotificationRead: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      invalidatesTags: ["Notifications"],
    }),
    markAllRead: b.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
      invalidatesTags: ["Notifications"],
    }),

    // ── Admin ────────────────────────────────────────────────────────────────
    adminDashboard: b.query<{ stats: Record<string, number>; recentOrders: Order[] }, void>({
      query: () => "/admin/dashboard",
      providesTags: ["AdminStats"],
    }),
    adminUsers: b.query<
      { users: User[]; total: number; pages: number },
      { q?: string; role?: string; page?: number }
    >({
      query: (params) => ({ url: "/admin/users", params }),
    }),
    adminSellers: b.query<{ sellers: Seller[]; total: number }, { tier?: string; page?: number }>({
      query: (params) => ({ url: "/admin/sellers", params }),
    }),
    adminUpdateSellerTier: b.mutation<{ seller: Seller }, { id: string; tier: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/sellers/${id}/tier`, method: "PATCH", body }),
      invalidatesTags: ["AdminStats"],
    }),
    adminApproveSeller: b.mutation<
      { seller: Seller; message: string },
      { id: string; status: "approved" | "rejected"; note?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/admin/sellers/${id}/approve`, method: "PATCH", body }),
      invalidatesTags: ["AdminStats"],
    }),
    adminPendingSellers: b.query<{ sellers: Seller[]; total: number }, void>({
      query: () => "/admin/sellers/pending",
      providesTags: ["AdminStats"],
    }),

    // ── Seller Orders & Analytics ────────────────────────────────────────────
    getSellerOrders: b.query<
      { orders: Order[]; total: number; page: number; pages: number },
      { status?: string; page?: number }
    >({
      query: (params) => ({ url: "/sellers/me/orders", params }),
      providesTags: ["Orders"],
    }),
    getSellerAnalytics: b.query<
      {
        totalOrders: number;
        pendingOrders: number;
        revenueThisMonth: number;
        commissionThisMonth: number;
        netThisMonth: number;
        balance: SellerBalance;
        totalProducts: number;
        activeProducts: number;
        rating: number;
        ratingCount: number;
      },
      void
    >({
      query: () => "/sellers/me/analytics",
      providesTags: ["Seller"],
    }),
    updateOrderStatus: b.mutation<{ order: Order }, { id: string; status: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/status`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Order", id }, "Orders"],
    }),

    adminRevenueAnalytics: b.query<
      { data: Array<{ _id: string; revenue: number; orders: number }> },
      { days?: number }
    >({
      query: (params) => ({ url: "/admin/analytics/revenue", params }),
    }),

    // ── Coupons ──────────────────────────────────────────────────────────────
    validateCoupon: b.mutation<
      {
        valid: boolean;
        coupon: {
          code: string;
          type: string;
          value: number;
          discountAmount: number;
          storeSpecific?: boolean;
        };
      },
      {
        code: string;
        items: Array<{ productId: string; quantity: number; variant?: string }>;
      }
    >({
      query: (body) => ({ url: "/coupons/validate", method: "POST", body }),
    }),
    adminGetCoupons: b.query<{ coupons: Coupon[]; total: number }, void>({
      query: () => "/admin/coupons",
      providesTags: ["AdminStats"],
    }),
    adminCreateCoupon: b.mutation<{ coupon: Coupon }, Partial<Coupon> & { expiresAt: string }>({
      query: (body) => ({ url: "/admin/coupons", method: "POST", body }),
      invalidatesTags: ["AdminStats"],
    }),
    adminToggleCoupon: b.mutation<{ coupon: Coupon }, string>({
      query: (id) => ({ url: `/admin/coupons/${id}/toggle`, method: "PATCH" }),
      invalidatesTags: ["AdminStats"],
    }),
    adminDeleteCoupon: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/admin/coupons/${id}`, method: "DELETE" }),
      invalidatesTags: ["AdminStats"],
    }),

    // ── Payouts ──────────────────────────────────────────────────────────────
    getMyPayouts: b.query<{ payouts: Payout[] }, void>({
      query: () => "/payouts/me",
      providesTags: ["Seller"],
    }),
    getMyBalance: b.query<{ balance: SellerBalance; payoutPhone: string | null }, void>({
      query: () => "/payouts/me/balance",
      providesTags: ["Seller"],
    }),
    getMyEarnings: b.query<{ earnings: SellerEarningRow[] }, void>({
      query: () => "/payouts/me/earnings",
      providesTags: ["Seller"],
    }),
    requestPayout: b.mutation<{ payout: Payout; message: string }, { momoPhone: string }>({
      query: (body) => ({ url: "/payouts/me/request", method: "POST", body }),
      invalidatesTags: ["Seller"],
    }),
    adminGetPayouts: b.query<{ payouts: Payout[]; total: number }, void>({
      query: () => "/admin/payouts",
      providesTags: ["AdminStats"],
    }),
    adminDisbursePayout: b.mutation<
      { payout: Payout },
      { id: string; momoRef: string; note?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/payouts/admin/${id}/disburse`, method: "PATCH", body }),
      invalidatesTags: ["AdminStats"],
    }),

    adminOrders: b.query<
      { orders: Order[]; total: number; pages: number },
      { status?: string; paymentStatus?: string; page?: number }
    >({
      query: (params) => ({ url: "/admin/orders", params }),
      providesTags: ["Orders"],
    }),
    adminConfirmPayment: b.mutation<{ message: string; order: Order }, string>({
      query: (id) => ({ url: `/admin/orders/${id}/confirm-payment`, method: "POST" }),
      invalidatesTags: ["Orders", "AdminStats"],
    }),
    adminRejectPayment: b.mutation<
      { message: string; order: Order },
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/admin/orders/${id}/reject-payment`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Orders", "AdminStats"],
    }),
    adminMarkRefunded: b.mutation<{ message: string; order: Order }, string>({
      query: (id) => ({ url: `/admin/orders/${id}/mark-refunded`, method: "POST" }),
      invalidatesTags: ["Orders", "AdminStats"],
    }),
    adminSetCommission: b.mutation<{ effectiveRate: number }, { id: string; rate: number | null }>({
      query: ({ id, rate }) => ({
        url: `/admin/sellers/${id}/commission`,
        method: "PATCH",
        body: { rate },
      }),
      invalidatesTags: ["AdminStats"],
    }),

    adminDisbursePawapay: b.mutation<{ payout: Payout; message: string }, string>({
      query: (id) => ({ url: `/payouts/admin/${id}/disburse-pawapay`, method: "PATCH" }),
      invalidatesTags: ["AdminStats"],
    }),
    adminFailPayout: b.mutation<{ payout: Payout }, { id: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/payouts/admin/${id}/fail`, method: "PATCH", body }),
      invalidatesTags: ["AdminStats"],
    }),

    // ── Disputes ─────────────────────────────────────────────────────────────
    openDispute: b.mutation<
      { dispute: Dispute },
      { orderId: string; reason: string; description: string; evidenceImages?: string[] }
    >({
      query: (body) => ({ url: "/disputes", method: "POST", body }),
      invalidatesTags: ["Orders"],
    }),
    getMyDisputes: b.query<{ disputes: Dispute[] }, void>({
      query: () => "/disputes/me",
      providesTags: ["Orders"],
    }),
    adminGetDisputes: b.query<{ disputes: Dispute[]; total: number }, { status?: string }>({
      query: (params) => ({ url: "/admin/disputes", params }),
      providesTags: ["AdminStats"],
    }),
    adminResolveDispute: b.mutation<
      { dispute: Dispute },
      { id: string; status: string; adminNote?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/disputes/admin/${id}/resolve`, method: "PATCH", body }),
      invalidatesTags: ["AdminStats"],
    }),

    // ── Wishlist (server) ─────────────────────────────────────────────────────
    getWishlist: b.query<{ items: Product[] }, void>({
      query: () => "/users/me/wishlist",
      providesTags: ["Me"],
    }),
    addToWishlist: b.mutation<{ items: Product[] }, string>({
      query: (productId) => ({ url: `/users/me/wishlist/${productId}`, method: "POST" }),
      invalidatesTags: ["Me"],
    }),
    removeFromWishlist: b.mutation<{ items: Product[] }, string>({
      query: (productId) => ({ url: `/users/me/wishlist/${productId}`, method: "DELETE" }),
      invalidatesTags: ["Me"],
    }),

    // ── Password Reset ────────────────────────────────────────────────────────
    forgotPassword: b.mutation<
      { ok: boolean; message: string },
      { phone?: string; email?: string }
    >({
      query: (body) => ({ url: "/auth/password/forgot", method: "POST", body }),
    }),
    resetPassword: b.mutation<
      { ok: boolean; message: string },
      { phone?: string; email?: string; code: string; newPassword: string }
    >({
      query: (body) => ({ url: "/auth/password/reset", method: "POST", body }),
    }),

    // ── Order cancel + tracking ───────────────────────────────────────────────
    cancelOrder: b.mutation<{ order: Order; message: string }, string>({
      query: (id) => ({ url: `/orders/${id}/cancel`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Order", id }, "Orders"],
    }),
    setOrderTracking: b.mutation<
      { order: Order },
      { id: string; trackingNumber?: string; trackingUrl?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/tracking`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Order", id }],
    }),

    // ── Seller holiday mode ───────────────────────────────────────────────────
    toggleHolidayMode: b.mutation<{ holidayMode: boolean; message: string }, void>({
      query: () => ({ url: "/sellers/me/holiday", method: "PATCH" }),
      invalidatesTags: ["Seller"],
    }),
    getSellerLowStock: b.query<{ products: Product[]; threshold: number }, number | void>({
      query: (threshold) => ({
        url: "/sellers/me/low-stock",
        params: threshold ? { threshold } : {},
      }),
      providesTags: ["Products"],
    }),

    // ── Review seller reply ───────────────────────────────────────────────────
    replyToReview: b.mutation<{ review: Review }, { id: string; text: string }>({
      query: ({ id, ...body }) => ({ url: `/reviews/${id}/reply`, method: "PATCH", body }),
      invalidatesTags: ["Reviews"],
    }),

    // ── Data export / account deletion ───────────────────────────────────────
    deleteMyAccount: b.mutation<{ ok: boolean; message: string }, void>({
      query: () => ({ url: "/users/me", method: "DELETE" }),
      invalidatesTags: ["Me"],
    }),

    // ── AI: draft seller reply ────────────────────────────────────────────────
    getDraftReply: b.query<{ draft: string }, string>({
      query: (reviewId) => `/reviews/${reviewId}/draft-reply`,
    }),

    // ── AI: review summary for product ────────────────────────────────────────
    getReviewSummary: b.query<{ summary: string }, string>({
      query: (productId) => `/reviews/product/${productId}/summary`,
    }),

    // ── Admin: moderation queue ───────────────────────────────────────────────
    getAdminModerationQueue: b.query<{ reviews: Review[] }, void>({
      query: () => "/reviews/admin/moderation-queue",
      providesTags: ["Reviews"],
    }),
    moderateReview: b.mutation<
      { review?: Review; removed?: boolean },
      { id: string; action: "approve" | "remove" }
    >({
      query: ({ id, action }) => ({
        url: `/reviews/${id}/moderate`,
        method: "PATCH",
        body: { action },
      }),
      invalidatesTags: ["Reviews"],
    }),

    // ── Semantic product search ───────────────────────────────────────────────
    semanticSearch: b.query<{ products: Product[]; semantic: boolean }, string>({
      query: (q) => ({ url: "/products/search/semantic", params: { q } }),
    }),

    // ── AI enhance single product ─────────────────────────────────────────────
    aiEnhanceProduct: b.mutation<{ ok: boolean; description: string; tags: string[] }, string>({
      query: (id) => ({ url: `/products/${id}/ai-enhance`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Product" as const, id }, "Products"],
    }),

    // ── Admin: flagged users (fraud detection) ────────────────────────────────
    getAdminFlaggedUsers: b.query<{ users: User[]; total: number }, void>({
      query: () => "/admin/users/flagged",
    }),
    unflagUser: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/admin/users/${id}/unflag`, method: "PATCH" }),
      invalidatesTags: ["AdminStats"],
    }),

    // ── Admin: trigger automation job manually ────────────────────────────────
    triggerAutomation: b.mutation<{ ok: boolean; job: string; ranAt: string }, string>({
      query: (job) => ({
        url: `/admin/automations/trigger/${job}`,
        method: "POST",
      }),
    }),

    // ── Push subscription ─────────────────────────────────────────────────────
    savePushSubscription: b.mutation<{ ok: boolean }, { subscription: PushSubscriptionJSON }>({
      query: (body) => ({ url: "/users/me/push-subscription", method: "POST", body }),
    }),
  }),
});

export const {
  // Products
  useListProductsQuery,
  useFlashDealsQuery,
  useTrendingQuery,
  useNewArrivalsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  // Auth
  useLoginMutation,
  useRegisterMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  // User
  useGetMeQuery,
  useUpdateProfileMutation,
  useAddAddressMutation,
  useDeleteAddressMutation,
  useGetMyOrdersQuery,
  useDeleteMyAccountMutation,
  useSavePushSubscriptionMutation,
  // Orders
  useCreateOrderMutation,
  useGetOrderQuery,
  useCancelOrderMutation,
  useSetOrderTrackingMutation,
  // Payments
  usePayMockMutation,
  // Reviews
  useGetReviewsQuery,
  useCreateReviewMutation,
  useReplyToReviewMutation,
  // Sellers
  useGetSellerQuery,
  useApplyAsSellerMutation,
  useGetMyStoreQuery,
  useToggleHolidayModeMutation,
  useGetSellerLowStockQuery,
  // Uploads
  useUploadFilesMutation,
  // AI
  useAiChatMutation,
  // Loyalty
  useGetLoyaltyQuery,
  useClaimDailyLoginMutation,
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllReadMutation,
  // Admin
  useAdminDashboardQuery,
  useAdminUsersQuery,
  useAdminSellersQuery,
  useAdminUpdateSellerTierMutation,
  useAdminApproveSellerMutation,
  useAdminPendingSellersQuery,
  useAdminRevenueAnalyticsQuery,
  useAdminGetCouponsQuery,
  useAdminCreateCouponMutation,
  useAdminToggleCouponMutation,
  useAdminDeleteCouponMutation,
  useAdminGetPayoutsQuery,
  useAdminDisbursePayoutMutation,
  useAdminGetDisputesQuery,
  useAdminResolveDisputeMutation,
  // Seller
  useGetSellerOrdersQuery,
  useGetSellerAnalyticsQuery,
  useUpdateOrderStatusMutation,
  useGetMyPayoutsQuery,
  useRequestPayoutMutation,
  useGetMyBalanceQuery,
  useGetMyEarningsQuery,
  useGetMyReferralsQuery,
  useCheckReferralCodeQuery,
  useAdminConfirmPaymentMutation,
  useAdminDisbursePawapayMutation,
  useAdminFailPayoutMutation,
  useAdminMarkRefundedMutation,
  useAdminRejectPaymentMutation,
  useGetPaymentConfigQuery,
  useSubmitManualPaymentMutation,
  useAdminSetCommissionMutation,
  useAdminOrdersQuery,
  // Coupons
  useValidateCouponMutation,
  // Disputes
  useOpenDisputeMutation,
  useGetMyDisputesQuery,
  // Wishlist
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  // Payment
  useInitiatePaymentMutation,
  usePawapayPredictMutation,
  usePawapayInitiateMutation,
  useLazyPawapayStatusQuery,
  useGetPaymentStatusQuery,
  useGetDraftReplyQuery,
  useGetReviewSummaryQuery,
  useGetAdminModerationQueueQuery,
  useModerateReviewMutation,
  useSemanticSearchQuery,
  useAiEnhanceProductMutation,
  useGetAdminFlaggedUsersQuery,
  useUnflagUserMutation,
  useTriggerAutomationMutation,
  // Bulk import
  useBulkImportProductsMutation,
  useValidateBulkImportMutation,
  // Contact
  useSubmitContactMutation,
} = api;
