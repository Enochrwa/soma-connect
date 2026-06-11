import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSearchParams } from "react-router-dom";
import { useListProductsQuery } from "../app/api";
import ProductCard from "../components/product/ProductCard";
import { Skeleton } from "../components/ui/Skeleton";
import { CATEGORIES } from "../constants";
export default function CatalogPage() {
    const [params, setParams] = useSearchParams();
    const category = params.get("category") ?? undefined;
    const q = params.get("q") ?? undefined;
    const { data, isLoading } = useListProductsQuery({ category, q, limit: 24 });
    return (_jsxs("div", { className: "mx-auto max-w-7xl px-4 py-8", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-6", children: [_jsx("button", { className: "pill bg-white border", onClick: () => setParams({}), children: "All" }), CATEGORIES.map((c) => (_jsxs("button", { onClick: () => setParams({ category: c.label }), className: `pill border ${category === c.label ? "bg-forest text-ivory" : "bg-white"}`, children: [c.emoji, " ", c.label] }, c.slug)))] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: isLoading
                    ? Array.from({ length: 8 }).map((_, i) => _jsx(Skeleton, { className: "aspect-square" }, i))
                    : (data?.items ?? []).map((p) => _jsx(ProductCard, { p: p }, p._id)) })] }));
}
