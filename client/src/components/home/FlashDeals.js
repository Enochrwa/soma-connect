import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useFlashDealsQuery } from "../../app/api";
import ProductCard from "../product/ProductCard";
import { Skeleton } from "../ui/Skeleton";
import { countdown } from "../../utils/format";
export default function FlashDeals() {
    const { data, isLoading } = useFlashDealsQuery();
    const items = data?.items ?? [];
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => n + 1), 1000);
        return () => clearInterval(t);
    }, []);
    const soonest = items
        .map((i) => i.flashSale?.endsAt)
        .filter(Boolean)
        .sort()[0];
    if (!isLoading && items.length === 0)
        return null;
    return (_jsxs("section", { className: "mx-auto max-w-7xl px-4 mt-12", children: [_jsxs("div", { className: "flex items-end justify-between mb-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "font-display text-2xl flex items-center gap-2 text-vermillion", children: [_jsx(Flame, {}), " Flash deals"] }), _jsx("p", { className: "text-sm text-slate/60", children: "Verified sellers, sharp prices." })] }), soonest && (_jsxs("div", { className: "font-mono text-sm bg-vermillion text-white rounded-lg px-3 py-1.5", children: ["Ends in ", countdown(soonest), " ", _jsx("span", { className: "sr-only", children: tick })] }))] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: isLoading
                    ? Array.from({ length: 4 }).map((_, i) => _jsx(Skeleton, { className: "aspect-square" }, i))
                    : items.slice(0, 4).map((p) => _jsx(ProductCard, { p: p }, p._id)) })] }));
}
