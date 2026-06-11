/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setAuth, clearAuth } from "../features/auth/authSlice";
const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
        const token = getState().auth.accessToken;
        if (token)
            headers.set("authorization", `Bearer ${token}`);
        return headers;
    },
});
let isRefreshing = false;
let refreshPromise = null;
async function doRefresh(api, extraOptions) {
    const refreshResult = await rawBaseQuery({ url: "/auth/refresh", method: "POST" }, api, extraOptions);
    if (refreshResult?.data) {
        const { accessToken, user } = refreshResult.data;
        api.dispatch(setAuth({ user: user, accessToken }));
        return accessToken;
    }
    api.dispatch(clearAuth());
    return null;
}
/**
 * Wraps fetchBaseQuery with automatic token refresh on 401.
 * Multiple concurrent 401s share a single refresh call.
 */
export const baseQueryWithReauth = async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);
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
