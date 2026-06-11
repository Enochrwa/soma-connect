import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { formatRWF } from "../../utils/format";
export default function ProductCard({ p }) {
    const onSale = p.comparePrice && p.comparePrice > p.price;
    return (_jsxs(Link, { to: `/products/${p._id}`, className: "card overflow-hidden group block", children: [_jsxs("div", { className: "relative aspect-square bg-ivory", children: [_jsx("img", { src: p.images?.[0], alt: p.title, loading: "lazy", className: "w-full h-full object-cover group-hover:scale-[1.03] transition" }), onSale && (_jsxs("span", { className: "absolute top-2 left-2 pill bg-vermillion text-white text-xs px-2 py-0.5 rounded-full", children: ["-", Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100), "%"] })), _jsx("button", { onClick: (e) => {
                            e.preventDefault();
                        }, className: "absolute top-2 right-2 w-9 h-9 grid place-items-center rounded-full bg-white/90 hover:bg-white", "aria-label": "Save to wishlist", children: _jsx(Heart, { size: 16 }) })] }), _jsxs("div", { className: "p-3 space-y-1", children: [_jsx("div", { className: "text-sm font-medium line-clamp-2", children: p.title }), _jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx("span", { className: "price text-base", children: formatRWF(p.price) }), onSale && (_jsx("span", { className: "text-xs text-slate/40 line-through font-mono", children: formatRWF(p.comparePrice) }))] }), _jsxs("div", { className: "flex items-center justify-between text-xs text-slate/60", children: [_jsxs("span", { children: ["\u2605 ", (p.avgRating ?? 0).toFixed(1), " (", p.reviewCount ?? 0, ")"] }), _jsx("span", { children: p.stock > 0 ? `${p.stock} in stock` : "Sold out" })] })] })] }));
}
