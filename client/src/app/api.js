import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
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
    ],
    endpoints: (b) => ({
        // ── Products ─────────────────────────────────────────────────────────────
        listProducts: b.query({
            query: (params) => ({ url: "/products", params }),
            providesTags: ["Products"],
        }),
        flashDeals: b.query({
            query: () => "/products/flash-deals",
        }),
        trending: b.query({
            query: () => "/products/trending",
        }),
        newArrivals: b.query({
            query: () => "/products/new",
        }),
        getProduct: b.query({
            query: (id) => `/products/${id}`,
            providesTags: (_r, _e, id) => [{ type: "Product", id }],
        }),
        createProduct: b.mutation({
            query: (body) => ({ url: "/products", method: "POST", body }),
            invalidatesTags: ["Products"],
        }),
        updateProduct: b.mutation({
            query: ({ id, ...body }) => ({ url: `/products/${id}`, method: "PUT", body }),
            invalidatesTags: (_r, _e, { id }) => [{ type: "Product", id }, "Products"],
        }),
        deleteProduct: b.mutation({
            query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
            invalidatesTags: ["Products"],
        }),
        // ── Auth ─────────────────────────────────────────────────────────────────
        login: b.mutation({
            query: (body) => ({ url: "/auth/login", method: "POST", body }),
            invalidatesTags: ["Me"],
        }),
        register: b.mutation({
            query: (body) => ({ url: "/auth/register", method: "POST", body }),
            invalidatesTags: ["Me"],
        }),
        requestOtp: b.mutation({
            query: (body) => ({ url: "/auth/otp/request", method: "POST", body }),
        }),
        verifyOtp: b.mutation({
            query: (body) => ({ url: "/auth/otp/verify", method: "POST", body }),
            invalidatesTags: ["Me"],
        }),
        refreshToken: b.mutation({
            query: () => ({ url: "/auth/refresh", method: "POST" }),
        }),
        logout: b.mutation({
            query: () => ({ url: "/auth/logout", method: "POST" }),
            invalidatesTags: ["Me", "Cart", "Orders"],
        }),
        // ── User ─────────────────────────────────────────────────────────────────
        getMe: b.query({
            query: () => "/users/me",
            providesTags: ["Me"],
        }),
        updateProfile: b.mutation({
            query: (body) => ({ url: "/users/me", method: "PATCH", body }),
            invalidatesTags: ["Me"],
        }),
        addAddress: b.mutation({
            query: (body) => ({ url: "/users/me/addresses", method: "POST", body }),
            invalidatesTags: ["Me"],
        }),
        deleteAddress: b.mutation({
            query: (id) => ({ url: `/users/me/addresses/${id}`, method: "DELETE" }),
            invalidatesTags: ["Me"],
        }),
        getMyOrders: b.query({
            query: () => "/users/me/orders",
            providesTags: ["Orders"],
        }),
        // ── Orders ───────────────────────────────────────────────────────────────
        createOrder: b.mutation({
            query: (body) => ({ url: "/orders", method: "POST", body }),
            invalidatesTags: ["Orders"],
        }),
        getOrder: b.query({
            query: (id) => `/orders/${id}`,
            providesTags: (_r, _e, id) => [{ type: "Order", id }],
        }),
        // ── Payments ─────────────────────────────────────────────────────────────
        payMock: b.mutation({
            query: (body) => ({ url: "/payments/mock", method: "POST", body }),
            invalidatesTags: (_r, _e, { orderId }) => [{ type: "Order", id: orderId }],
        }),
        // ── Reviews ──────────────────────────────────────────────────────────────
        getReviews: b.query({
            query: (productId) => `/reviews/product/${productId}`,
            providesTags: (_r, _e, id) => [{ type: "Reviews", id }],
        }),
        createReview: b.mutation({
            query: (body) => ({ url: "/reviews", method: "POST", body }),
            invalidatesTags: (_r, _e, { productId }) => [
                { type: "Reviews", id: productId },
                { type: "Product", id: productId },
            ],
        }),
        // ── Sellers ──────────────────────────────────────────────────────────────
        getSeller: b.query({
            query: (slug) => `/sellers/${slug}`,
            providesTags: (_r, _e, slug) => [{ type: "Seller", id: slug }],
        }),
        applyAsSeller: b.mutation({
            query: (body) => ({ url: "/sellers/apply", method: "POST", body }),
            invalidatesTags: ["Me"],
        }),
        getMyStore: b.query({
            query: () => "/sellers/me/overview",
            providesTags: ["Seller"],
        }),
        // ── Uploads ──────────────────────────────────────────────────────────────
        initiatePayment: b.mutation({
            query: (body) => ({ url: "/payment/mock", method: "POST", body }),
            invalidatesTags: ["Orders"],
        }),
        getPaymentStatus: b.query({
            query: (ref) => `/payment/status/${ref}`,
        }),
        uploadFiles: b.mutation({
            query: (formData) => ({
                url: "/uploads",
                method: "POST",
                body: formData,
                formData: true,
            }),
        }),
        // ── AI ───────────────────────────────────────────────────────────────────
        aiChat: b.mutation({
            query: (body) => ({ url: "/ai/chat", method: "POST", body }),
        }),
        // ── Loyalty ──────────────────────────────────────────────────────────────
        getLoyalty: b.query({
            query: () => "/loyalty/me",
            providesTags: ["Loyalty"],
        }),
        claimDailyLogin: b.mutation({
            query: () => ({ url: "/loyalty/daily-login", method: "POST" }),
            invalidatesTags: ["Loyalty", "Me"],
        }),
        // ── Notifications ────────────────────────────────────────────────────────
        getNotifications: b.query({
            query: () => "/notifications",
            providesTags: ["Notifications"],
        }),
        markNotificationRead: b.mutation({
            query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
            invalidatesTags: ["Notifications"],
        }),
        markAllRead: b.mutation({
            query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
            invalidatesTags: ["Notifications"],
        }),
        // ── Admin ────────────────────────────────────────────────────────────────
        adminDashboard: b.query({
            query: () => "/admin/dashboard",
            providesTags: ["AdminStats"],
        }),
        adminUsers: b.query({
            query: (params) => ({ url: "/admin/users", params }),
        }),
        adminSellers: b.query({
            query: (params) => ({ url: "/admin/sellers", params }),
        }),
        adminUpdateSellerTier: b.mutation({
            query: ({ id, ...body }) => ({ url: `/admin/sellers/${id}/tier`, method: "PATCH", body }),
            invalidatesTags: ["AdminStats"],
        }),
        adminApproveSeller: b.mutation({
            query: ({ id, ...body }) => ({ url: `/admin/sellers/${id}/approve`, method: "PATCH", body }),
            invalidatesTags: ["AdminStats"],
        }),
        adminPendingSellers: b.query({
            query: () => "/admin/sellers/pending",
            providesTags: ["AdminStats"],
        }),
        // ── Seller Orders & Analytics ────────────────────────────────────────────
        getSellerOrders: b.query({
            query: (params) => ({ url: "/sellers/me/orders", params }),
            providesTags: ["Orders"],
        }),
        getSellerAnalytics: b.query({
            query: () => "/sellers/me/analytics",
            providesTags: ["Seller"],
        }),
        updateOrderStatus: b.mutation({
            query: ({ id, ...body }) => ({ url: `/orders/${id}/status`, method: "PATCH", body }),
            invalidatesTags: (_r, _e, { id }) => [{ type: "Order", id }, "Orders"],
        }),
        adminRevenueAnalytics: b.query({
            query: (params) => ({ url: "/admin/analytics/revenue", params }),
        }),
    }),
});
export const { 
// Products
useListProductsQuery, useFlashDealsQuery, useTrendingQuery, useNewArrivalsQuery, useGetProductQuery, useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation, 
// Auth
useLoginMutation, useRegisterMutation, useRequestOtpMutation, useVerifyOtpMutation, useRefreshTokenMutation, useLogoutMutation, 
// User
useGetMeQuery, useUpdateProfileMutation, useAddAddressMutation, useDeleteAddressMutation, useGetMyOrdersQuery, 
// Orders
useCreateOrderMutation, useGetOrderQuery, 
// Payments
usePayMockMutation, 
// Reviews
useGetReviewsQuery, useCreateReviewMutation, 
// Sellers
useGetSellerQuery, useApplyAsSellerMutation, useGetMyStoreQuery, 
// Uploads
useUploadFilesMutation, 
// AI
useAiChatMutation, 
// Loyalty
useGetLoyaltyQuery, useClaimDailyLoginMutation, 
// Notifications
useGetNotificationsQuery, useMarkNotificationReadMutation, useMarkAllReadMutation, 
// Admin
useAdminDashboardQuery, useAdminUsersQuery, useAdminSellersQuery, useAdminUpdateSellerTierMutation, useAdminApproveSellerMutation, useAdminPendingSellersQuery, useAdminRevenueAnalyticsQuery, 
// Seller
useGetSellerOrdersQuery, useGetSellerAnalyticsQuery, useUpdateOrderStatusMutation, 
// Payment
useInitiatePaymentMutation, useGetPaymentStatusQuery,
// Upload
 } = api;
