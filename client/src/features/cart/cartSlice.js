import { createSlice } from "@reduxjs/toolkit";
const initial = JSON.parse(localStorage.getItem("soma.cart") ?? '{"items":[]}');
function persist(state) {
    localStorage.setItem("soma.cart", JSON.stringify(state));
}
const slice = createSlice({
    name: "cart",
    initialState: initial,
    reducers: {
        addItem(state, action) {
            const existing = state.items.find((i) => i.productId === action.payload.productId && i.variant === action.payload.variant);
            if (existing) {
                existing.quantity = Math.min(existing.stock, existing.quantity + action.payload.quantity);
            }
            else {
                state.items.push(action.payload);
            }
            persist(state);
        },
        updateQty(state, action) {
            const it = state.items.find((i) => i.productId === action.payload.productId && i.variant === action.payload.variant);
            if (it) {
                it.quantity = Math.max(1, Math.min(it.stock, action.payload.quantity));
                persist(state);
            }
        },
        removeItem(state, action) {
            state.items = state.items.filter((i) => !(i.productId === action.payload.productId && i.variant === action.payload.variant));
            persist(state);
        },
        clearCart(state) {
            state.items = [];
            persist(state);
        },
    },
});
export const { addItem, updateQty, removeItem, clearCart } = slice.actions;
export default slice.reducer;
export const selectCartTotal = (items) => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
