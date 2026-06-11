import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ProductCard from "../product/ProductCard";
import { Skeleton } from "../ui/Skeleton";
export default function ProductRow({ title, subtitle, items, isLoading, }) {
    return (_jsxs("section", { className: "mx-auto max-w-7xl px-4 mt-12", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "font-display text-2xl text-forest", children: title }), subtitle && _jsx("p", { className: "text-sm text-slate/60", children: subtitle })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: isLoading
                    ? Array.from({ length: 4 }).map((_, i) => _jsx(Skeleton, { className: "aspect-square" }, i))
                    : items.map((p) => _jsx(ProductCard, { p: p }, p._id)) })] }));
}
