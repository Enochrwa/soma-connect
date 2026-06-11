import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useGetProductQuery } from "../app/api";
import { useAppDispatch } from "../app/hooks";
import { addItem } from "../features/cart/cartSlice";
import { formatRWF } from "../utils/format";
import { Heart, Shield, Truck, BadgeCheck } from "lucide-react";
export default function ProductDetailPage() {
    const { id } = useParams();
    const { data, isLoading } = useGetProductQuery(id);
    const dispatch = useAppDispatch();
    if (isLoading)
        return _jsx("div", { className: "mx-auto max-w-7xl px-4 py-12", children: "Loading\u2026" });
    const p = data?.product;
    if (!p)
        return _jsx("div", { className: "mx-auto max-w-7xl px-4 py-12", children: "Product not found." });
    return (_jsxs("div", { className: "mx-auto max-w-7xl px-4 py-8 grid md:grid-cols-2 gap-8", children: [_jsxs("div", { children: [_jsx("img", { src: p.images?.[0], alt: p.title, className: "w-full rounded-2xl aspect-square object-cover" }), _jsx("div", { className: "grid grid-cols-5 gap-2 mt-2", children: (p.images ?? []).slice(0, 5).map((img, i) => (_jsx("img", { src: img, className: "aspect-square object-cover rounded-lg" }, i))) })] }), _jsxs("div", { children: [_jsx("h1", { className: "font-display text-3xl text-forest", children: p.title }), _jsxs("div", { className: "text-sm text-slate/60 mt-1", children: ["\u2605 ", (p.avgRating ?? 0).toFixed(1), " \u00B7 ", p.reviewCount ?? 0, " reviews"] }), _jsxs("div", { className: "mt-4 flex items-baseline gap-3", children: [_jsx("span", { className: "price text-3xl text-saffron", children: formatRWF(p.price) }), p.comparePrice && (_jsx("span", { className: "text-slate/40 line-through font-mono", children: formatRWF(p.comparePrice) }))] }), _jsx("p", { className: "mt-4 text-slate/80 leading-relaxed", children: p.description }), _jsx("div", { className: "mt-2 text-sm", children: p.stock > 0 ? (_jsxs("span", { className: "text-forest", children: ["\u2705 In stock (", p.stock, ")"] })) : (_jsx("span", { className: "text-vermillion", children: "\u274C Out of stock" })) }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [_jsx("button", { className: "btn-primary", disabled: p.stock < 1, onClick: () => dispatch(addItem({
                                    productId: p._id,
                                    title: p.title,
                                    image: p.images?.[0],
                                    unitPrice: p.price,
                                    quantity: 1,
                                    sellerId: typeof p.sellerId === "string" ? p.sellerId : p.sellerId._id,
                                    stock: p.stock,
                                })), children: "Add to cart" }), _jsx("button", { className: "btn-secondary", children: "Buy now" }), _jsxs("button", { className: "btn-ghost", children: [_jsx(Heart, { size: 16 }), " Save"] })] }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-4 text-xs text-slate/70", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Shield, { size: 14 }), " Secure payment"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Truck, { size: 14 }), " 7-day returns"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(BadgeCheck, { size: 14 }), " Verified seller"] })] })] })] }));
}
