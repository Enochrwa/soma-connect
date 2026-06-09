import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Products", "Product", "Cart", "Orders", "Order", "Me", "Seller"],
  endpoints: (b) => ({
    listProducts: b.query<{ items: any[]; total: number }, Record<string, any>>({
      query: (params) => ({ url: "/products", params }),
      providesTags: ["Products"],
    }),
    flashDeals: b.query<{ items: any[] }, void>({ query: () => "/products/flash-deals" }),
    trending: b.query<{ items: any[] }, void>({ query: () => "/products/trending" }),
    newArrivals: b.query<{ items: any[] }, void>({ query: () => "/products/new" }),
    getProduct: b.query<{ product: any }, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Product", id }],
    }),
    login: b.mutation<{ user: any; accessToken: string }, { phone: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    register: b.mutation<{ user: any; accessToken: string }, any>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
    }),
    requestOtp: b.mutation<{ ok: true }, { email: string }>({
      query: (body) => ({ url: "/auth/otp/request", method: "POST", body }),
    }),
    verifyOtp: b.mutation<{ user: any; accessToken: string }, { email: string; code: string }>({
      query: (body) => ({ url: "/auth/otp/verify", method: "POST", body }),
    }),
    createOrder: b.mutation<{ order: any }, any>({
      query: (body) => ({ url: "/orders", method: "POST", body }),
      invalidatesTags: ["Orders"],
    }),
    getOrder: b.query<{ order: any }, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Order", id }],
    }),
    payMock: b.mutation<{ mockRef: string; message: string }, { orderId: string; method: string; phone: string }>({
      query: (body) => ({ url: "/payments/mock", method: "POST", body }),
    }),
    aiChat: b.mutation<{ reply: string }, { messages: Array<{ role: string; content: string }> }>({
      query: (body) => ({ url: "/ai/chat", method: "POST", body }),
    }),
  }),
});

export const {
  useListProductsQuery,
  useFlashDealsQuery,
  useTrendingQuery,
  useNewArrivalsQuery,
  useGetProductQuery,
  useLoginMutation,
  useRegisterMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useCreateOrderMutation,
  useGetOrderQuery,
  usePayMockMutation,
  useAiChatMutation,
} = api;