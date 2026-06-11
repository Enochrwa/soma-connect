import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { toggleWishlist } from "../features/wishlist/wishlistSlice";
import { addItem } from "../features/cart/cartSlice";
import { formatRWF } from "../utils/format";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
export default function WishlistPage() {
    const dispatch = useAppDispatch();
    const items = useAppSelector((s) => s.wishlist.items);
    if (!items.length) {
        return (_jsxs("div", { className: "max-w-2xl mx-auto px-4 py-20 text-center", children: [_jsx(Heart, { className: "text-forest/20 mx-auto mb-5", size: 64 }), _jsx("h2", { className: "font-display text-2xl font-bold text-forest mb-2", children: "Your wishlist is empty" }), _jsx("p", { className: "text-slate/50 mb-8", children: "Save products you love to revisit them later." }), _jsx(Link, { to: "/search", className: "bg-forest text-white font-bold px-8 py-3 rounded-xl hover:bg-forest-light transition", children: "Browse products" })] }));
    }
    return (_jsxs("div", { className: "max-w-5xl mx-auto px-4 py-8", children: [_jsxs("h1", { className: "font-display text-2xl font-bold text-forest mb-6", children: ["Wishlist ", _jsxs("span", { className: "text-slate/40 font-normal text-lg", children: ["(", items.length, ")"] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: items.map((p) => (_jsxs("div", { className: "bg-white rounded-2xl shadow-card overflow-hidden group", children: [_jsxs(Link, { to: `/products/${p._id}`, className: "block relative aspect-square", children: [_jsx("img", { src: p.images?.[0] ?? "/placeholder.png", alt: p.title, className: "w-full h-full object-cover group-hover:scale-[1.03] transition" }), p.comparePrice && p.comparePrice > p.price && (_jsxs("span", { className: "absolute top-2 left-2 bg-vermillion text-white text-xs font-bold px-2 py-0.5 rounded-full", children: ["-", Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100), "%"] }))] }), _jsxs("div", { className: "p-3 space-y-2", children: [_jsx(Link, { to: `/products/${p._id}`, className: "text-sm font-semibold text-forest hover:text-saffron transition line-clamp-2", children: p.title }), _jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx("span", { className: "font-mono font-bold text-saffron", children: formatRWF(p.price) }), p.comparePrice && p.comparePrice > p.price && (_jsx("span", { className: "font-mono text-xs text-slate/40 line-through", children: formatRWF(p.comparePrice) }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => dispatch(addItem({
                                                productId: p._id,
                                                title: p.title,
                                                image: p.images?.[0] ?? "",
                                                unitPrice: p.price,
                                                quantity: 1,
                                                sellerId: typeof p.sellerId === "string" ? p.sellerId : "",
                                                stock: p.stock,
                                            })), disabled: p.stock === 0, className: "flex-1 flex items-center justify-center gap-1.5 bg-forest text-white text-xs font-semibold py-2 rounded-lg hover:bg-forest-light transition disabled:opacity-40", children: [_jsx(ShoppingCart, { size: 13 }), " Add to cart"] }), _jsx("button", { onClick: () => dispatch(toggleWishlist(p)), className: "w-8 h-8 flex items-center justify-center rounded-lg border border-vermillion/30 text-vermillion hover:bg-vermillion/10 transition", children: _jsx(Trash2, { size: 13 }) })] })] })] }, p._id))) })] }));
}
