import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  role: "buyer" | "seller" | "admin";
  profile?: { name?: string; avatar?: string; language?: string };
  loyaltyPoints?: number;
  tier?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
}

const initial: AuthState = {
  user: JSON.parse(localStorage.getItem("soma.user") ?? "null"),
  accessToken: localStorage.getItem("soma.at"),
};

const slice = createSlice({
  name: "auth",
  initialState: initial,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      localStorage.setItem("soma.user", JSON.stringify(action.payload.user));
      localStorage.setItem("soma.at", action.payload.accessToken);
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      localStorage.removeItem("soma.user");
      localStorage.removeItem("soma.at");
    },
  },
});

export const { setAuth, clearAuth } = slice.actions;
export default slice.reducer;
