import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useGetMyOrdersQuery } from "../app/api";
import { formatRWF } from "../utils/format";
import { Package, Loader2, ChevronRight, Clock } from "lucide-react";
const STATUS_COLORS = {
    placed: "bg-saffron/15 text-saffron-dark",
    payment_confirmed: "bg-blue-50 text-blue-700",
    preparing: "bg-blue-50 text-blue-700",
    packed: "bg-purple-50 text-purple-700",
    picked_up: "bg-indigo-50 text-indigo-700",
    out_for_delivery: "bg-orange-50 text-orange-700",
    delivered: "bg-green-50 text-green-700",
    cancelled: "bg-vermillion/10 text-vermillion",
};
const STATUS_LABELS = {
    placed: "Order placed",
    payment_confirmed: "Payment confirmed",
    preparing: "Preparing",
    packed: "Packed",
    picked_up: "Picked up",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
};
export default function OrdersPage() {
    const { data, isLoading } = useGetMyOrdersQuery();
    if (isLoading) {
        return (_jsx("div", { className: "max-w-3xl mx-auto px-4 py-16 flex items-center justify-center", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 28 }) }));
    }
    if (!data?.orders?.length) {
        return (_jsxs("div", { className: "max-w-2xl mx-auto px-4 py-20 text-center", children: [_jsx(Package, { className: "text-forest/20 mx-auto mb-5", size: 64 }), _jsx("h2", { className: "font-display text-2xl font-bold text-forest mb-2", children: "No orders yet" }), _jsx("p", { className: "text-slate/50 mb-8", children: "When you place an order, it will show up here." }), _jsx(Link, { to: "/search", className: "bg-forest text-white font-bold px-8 py-3 rounded-xl hover:bg-forest-light transition", children: "Start shopping" })] }));
    }
    return (_jsxs("div", { className: "max-w-3xl mx-auto px-4 py-8", children: [_jsx("h1", { className: "font-display text-2xl font-bold text-forest mb-6", children: "My Orders" }), _jsx("div", { className: "space-y-4", children: data.orders.map((order) => (_jsxs(Link, { to: `/orders/${order._id}`, className: "block bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all p-5 group", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-xs text-slate/50 font-semibold", children: order.orderNumber }), _jsx("span", { className: `text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`, children: STATUS_LABELS[order.status] })] }), _jsxs("div", { className: "mt-2 flex gap-2", children: [order.items.slice(0, 3).map((item) => (_jsx("img", { src: item.image ?? "/placeholder.png", alt: item.title, className: "w-12 h-12 rounded-lg object-cover" }, item._id))), order.items.length > 3 && (_jsxs("div", { className: "w-12 h-12 rounded-lg bg-forest/5 flex items-center justify-center text-xs font-semibold text-forest/50", children: ["+", order.items.length - 3] }))] })] }), _jsxs("div", { className: "text-right shrink-0", children: [_jsx("div", { className: "font-mono font-bold text-saffron", children: formatRWF(order.total) }), _jsxs("div", { className: "text-xs text-slate/40 mt-1 flex items-center gap-1 justify-end", children: [_jsx(Clock, { size: 10 }), " ", new Date(order.createdAt).toLocaleDateString("en-RW")] })] })] }), _jsxs("div", { className: "flex items-center justify-between mt-3 pt-3 border-t border-forest/8", children: [_jsxs("span", { className: "text-xs text-slate/50", children: [order.items.length, " item", order.items.length !== 1 ? "s" : ""] }), _jsxs("span", { className: "text-xs text-saffron font-semibold group-hover:gap-2 flex items-center gap-1 transition-all", children: ["View details ", _jsx(ChevronRight, { size: 12 })] })] })] }, order._id))) })] }));
}
