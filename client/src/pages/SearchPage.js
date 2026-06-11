import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useListProductsQuery } from "../app/api";
import ProductCard from "../components/product/ProductCard";
import { Skeleton } from "../components/ui/Skeleton";
import { Filter, X, ChevronDown, Search } from "lucide-react";
const CATEGORIES = [
    "electronics",
    "fashion",
    "home",
    "food",
    "beauty",
    "sports",
    "agriculture",
    "books",
];
const SORT_OPTIONS = [
    { value: "relevance", label: "Most relevant" },
    { value: "newest", label: "Newest first" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "rating", label: "Highest rated" },
];
export default function SearchPage() {
    const [params, setParams] = useSearchParams();
    const [showFilters, setShowFilters] = useState(false);
    const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
    const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");
    const q = params.get("q") ?? "";
    const category = params.get("category") ?? "";
    const sort = params.get("sort") ?? "relevance";
    const inStock = params.get("inStock") ?? "";
    const condition = params.get("condition") ?? "";
    const page = Number(params.get("page") ?? "1");
    const { data, isLoading, isFetching } = useListProductsQuery({
        q: q || undefined,
        category: category || undefined,
        sort,
        inStock: inStock || undefined,
        condition: condition || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        page,
        limit: 24,
    });
    function setParam(key, val) {
        const p = new URLSearchParams(params);
        if (val)
            p.set(key, val);
        else
            p.delete(key);
        p.delete("page");
        setParams(p);
    }
    function clearFilters() {
        setParams(q ? { q } : {});
        setMinPrice("");
        setMaxPrice("");
    }
    const hasFilters = !!(category || inStock || condition || minPrice || maxPrice);
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6 flex-wrap", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "font-display text-2xl font-bold text-forest", children: q ? (`Results for "${q}"`) : category ? (_jsx("span", { className: "capitalize", children: category })) : ("All Products") }), data && (_jsxs("p", { className: "text-sm text-slate/50 mt-0.5", children: [data.total.toLocaleString(), " products found"] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [hasFilters && (_jsxs("button", { onClick: clearFilters, className: "flex items-center gap-1.5 text-sm text-vermillion border border-vermillion/30 px-3 py-1.5 rounded-lg hover:bg-vermillion/5 transition", children: [_jsx(X, { size: 14 }), " Clear filters"] })), _jsxs("button", { onClick: () => setShowFilters(!showFilters), className: `flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border transition ${showFilters ? "bg-forest text-white border-forest" : "border-forest/15 text-forest hover:bg-forest/5"}`, children: [_jsx(Filter, { size: 15 }), " Filters", " ", hasFilters && (_jsx("span", { className: "bg-saffron text-white text-xs rounded-full w-4 h-4 flex items-center justify-center", children: "!" }))] }), _jsxs("div", { className: "relative", children: [_jsx("select", { value: sort, onChange: (e) => setParam("sort", e.target.value), className: "appearance-none text-sm border border-forest/15 rounded-xl px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-saffron/30 bg-white cursor-pointer", children: SORT_OPTIONS.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) }), _jsx(ChevronDown, { size: 14, className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-slate/40 pointer-events-none" })] })] })] }), showFilters && (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 animate-slide-up", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-2", children: "Category" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: CATEGORIES.map((c) => (_jsx("button", { onClick: () => setParam("category", category === c ? "" : c), className: `text-xs px-3 py-1.5 rounded-full font-medium transition capitalize ${category === c
                                        ? "bg-forest text-white"
                                        : "bg-forest/10 text-forest hover:bg-forest/15"}`, children: c }, c))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-2", children: "Condition" }), _jsx("div", { className: "flex gap-2", children: ["new", "used"].map((c) => (_jsx("button", { onClick: () => setParam("condition", condition === c ? "" : c), className: `flex-1 text-sm py-2 rounded-xl font-medium capitalize transition ${condition === c
                                        ? "bg-forest text-white"
                                        : "bg-forest/10 text-forest hover:bg-forest/15"}`, children: c }, c))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-2", children: "Price range (RWF)" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", placeholder: "Min", value: minPrice, onChange: (e) => setMinPrice(e.target.value), onBlur: () => setParam("minPrice", minPrice), className: "w-full rounded-lg border border-forest/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30" }), _jsx("input", { type: "number", placeholder: "Max", value: maxPrice, onChange: (e) => setMaxPrice(e.target.value), onBlur: () => setParam("maxPrice", maxPrice), className: "w-full rounded-lg border border-forest/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-2", children: "Availability" }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: inStock === "true", onChange: (e) => setParam("inStock", e.target.checked ? "true" : ""), className: "w-4 h-4 accent-forest" }), _jsx("span", { className: "text-sm text-slate/70", children: "In stock only" })] })] })] })), isLoading || isFetching ? (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4", children: Array.from({ length: 20 }).map((_, i) => (_jsxs("div", { className: "rounded-2xl overflow-hidden", children: [_jsx(Skeleton, { className: "aspect-square" }), _jsxs("div", { className: "p-3 space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-4 w-1/2" })] })] }, i))) })) : !data?.items?.length ? (_jsxs("div", { className: "text-center py-20", children: [_jsx(Search, { className: "text-forest/20 mx-auto mb-4", size: 48 }), _jsx("h3", { className: "font-display text-xl font-bold text-forest/40", children: "No products found" }), _jsx("p", { className: "text-slate/40 mt-2", children: "Try different keywords or remove some filters" }), hasFilters && (_jsx("button", { onClick: clearFilters, className: "mt-4 text-sm text-saffron font-semibold hover:underline", children: "Clear all filters" }))] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4", children: data.items.map((p) => (_jsx(ProductCard, { p: p }, p._id))) }), data.pages > 1 && (_jsxs("div", { className: "flex justify-center gap-2 mt-10", children: [page > 1 && (_jsx("button", { onClick: () => setParam("page", String(page - 1)), className: "px-4 py-2 rounded-xl border border-forest/15 text-sm font-medium hover:bg-forest/5 transition", children: "Previous" })), Array.from({ length: Math.min(data.pages, 7) }, (_, i) => {
                                const pg = i + 1;
                                return (_jsx("button", { onClick: () => setParam("page", String(pg)), className: `w-10 h-10 rounded-xl text-sm font-medium transition ${pg === page ? "bg-forest text-white" : "border border-forest/15 hover:bg-forest/5"}`, children: pg }, pg));
                            }), page < data.pages && (_jsx("button", { onClick: () => setParam("page", String(page + 1)), className: "px-4 py-2 rounded-xl border border-forest/15 text-sm font-medium hover:bg-forest/5 transition", children: "Next" }))] }))] }))] }));
}
