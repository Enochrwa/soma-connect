import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../../constants";
export default function CategoryPills() {
    return (_jsx("section", { className: "mx-auto max-w-7xl px-4 mt-8", children: _jsx("div", { className: "flex gap-2 overflow-x-auto scrollbar-hide pb-2", children: CATEGORIES.map((c) => (_jsxs(Link, { to: `/catalog?category=${c.label}`, className: "shrink-0 inline-flex items-center gap-2 rounded-full bg-white border border-black/[0.06] px-4 py-2 text-sm shadow-soft hover:border-forest/30 transition", children: [_jsx("span", { children: c.emoji }), " ", c.label] }, c.slug))) }) }));
}
