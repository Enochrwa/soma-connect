import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
export default function NotFoundPage() {
    return (_jsx("div", { className: "min-h-[70vh] flex items-center justify-center px-4 text-center", children: _jsxs("div", { children: [_jsx("div", { className: "font-display text-[120px] font-bold text-forest/10 leading-none", children: "404" }), _jsx("h2", { className: "font-display text-2xl font-bold text-forest -mt-4", children: "Page not found" }), _jsx("p", { className: "text-slate/50 mt-2 mb-8", children: "The page you're looking for doesn't exist." }), _jsx(Link, { to: "/", className: "bg-forest text-white font-bold px-8 py-3 rounded-xl hover:bg-forest-light transition", children: "Back to home" })] }) }));
}
