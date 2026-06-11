import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Product } from "../../types";

interface WishlistState {
  items: Product[];
}

const load = (): WishlistState => {
  try {
    return JSON.parse(localStorage.getItem("soma.wishlist") ?? '{"items":[]}');
  } catch {
    return { items: [] };
  }
};

const persist = (state: WishlistState) => {
  localStorage.setItem("soma.wishlist", JSON.stringify(state));
};

const slice = createSlice({
  name: "wishlist",
  initialState: load(),
  reducers: {
    toggleWishlist(state, action: PayloadAction<Product>) {
      const idx = state.items.findIndex((i) => i._id === action.payload._id);
      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items.push(action.payload);
      }
      persist(state);
    },
    clearWishlist(state) {
      state.items = [];
      persist(state);
    },
  },
});

export const { toggleWishlist, clearWishlist } = slice.actions;
export default slice.reducer;

export const selectIsWishlisted = (items: Product[], productId: string) =>
  items.some((i) => i._id === productId);
