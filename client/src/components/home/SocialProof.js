import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function SocialProof() {
    const stats = [
        { value: "12,400+", label: "Active buyers in Kigali" },
        { value: "480+", label: "Verified sellers" },
        { value: "RWF 2.1B", label: "Traded last quarter" },
        { value: "98%", label: "Orders delivered on time" },
    ];
    return (_jsx("section", { className: "mx-auto max-w-7xl px-4 mt-12", children: _jsx("div", { className: "rounded-3xl bg-forest text-ivory px-6 md:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-6", children: stats.map((s) => (_jsxs("div", { children: [_jsx("div", { className: "font-display text-3xl text-saffron", children: s.value }), _jsx("div", { className: "text-sm text-ivory/70 mt-1", children: s.label })] }, s.label))) }) }));
}
