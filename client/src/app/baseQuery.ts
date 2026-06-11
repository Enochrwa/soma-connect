/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";
import { setAuth, clearAuth } from "../features/auth/authSlice";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(api: any, extraOptions: any): Promise<string | null> {
  const refreshResult: any = await rawBaseQuery(
    { url: "/auth/refresh", method: "POST" },
    api,
    extraOptions,
  );
  if (refreshResult?.data) {
    const { accessToken, user } = refreshResult.data as {
      accessToken: string;
      user: RootState["auth"]["user"];
    };
    api.dispatch(setAuth({ user: user!, accessToken }));
    return accessToken;
  }
  api.dispatch(clearAuth());
  return null;
}

/**
 * Wraps fetchBaseQuery with automatic token refresh on 401.
 * Multiple concurrent 401s share a single refresh call.
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result: any = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = doRefresh(api, extraOptions).finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};
