import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PageSkeleton() {
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-6", children: [_jsx("div", { className: "skeleton h-64 rounded-2xl" }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: Array.from({ length: 8 }).map((_, i) => (_jsx("div", { className: "skeleton h-48 rounded-xl" }, i))) })] }));
}
