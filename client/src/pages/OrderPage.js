import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useGetOrderQuery } from "../app/api";
import { useOrderTracking } from "../hooks/useSocket";
import { formatRWF } from "../utils/format";
import { Loader2, Package, MapPin, CheckCircle, Circle, Clock, Zap, } from "lucide-react";
const STATUSES = [
    "placed",
    "payment_confirmed",
    "preparing",
    "packed",
    "out_for_delivery",
    "delivered",
];
const STATUS_LABELS = {
    placed: "Order placed",
    payment_confirmed: "Payment confirmed",
    preparing: "Preparing your order",
    packed: "Packed & ready",
    picked_up: "Picked up by courier",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered! 🎉",
    cancelled: "Cancelled",
};
export default function OrderPage() {
    const { id } = useParams();
    const { data, isLoading, refetch } = useGetOrderQuery(id);
    const [liveStatus, setLiveStatus] = useState(null);
    const [liveNote, setLiveNote] = useState(undefined);
    const [flash, setFlash] = useState(false);
    // Real-time order updates via Socket.IO
    useOrderTracking(id, (payload) => {
        const p = payload;
        setLiveStatus(p.status);
        setLiveNote(p.note);
        setFlash(true);
        refetch(); // also refresh the full order from server
        setTimeout(() => setFlash(false), 3000);
    });
    if (isLoading) {
        return (_jsx("div", { className: "max-w-3xl mx-auto px-4 py-16 flex items-center justify-center", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 28 }) }));
    }
    if (!data?.order) {
        return (_jsxs("div", { className: "max-w-3xl mx-auto px-4 py-16 text-center", children: [_jsx(Package, { className: "text-forest/20 mx-auto mb-3", size: 48 }), _jsx("h2", { className: "font-display text-xl font-bold text-forest mb-2", children: "Order not found" }), _jsx(Link, { to: "/orders", className: "text-saffron hover:underline text-sm", children: "Back to orders" })] }));
    }
    const order = data.order;
    const currentStatus = liveStatus ?? order.status;
    const currentStep = STATUSES.indexOf(currentStatus);
    return (_jsxs(_Fragment, { children: [_jsx(Helmet, { children: _jsxs("title", { children: ["Order ", order.orderNumber, " \u2014 SOMA Market"] }) }), _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-8 space-y-6", children: [flash && liveStatus && (_jsxs("div", { className: "bg-saffron/15 border border-saffron/30 rounded-xl px-4 py-3 flex items-center gap-2 animate-pulse", children: [_jsx(Zap, { size: 16, className: "text-saffron" }), _jsxs("span", { className: "text-sm font-medium text-saffron-dark", children: ["Order updated: ", STATUS_LABELS[liveStatus], liveNote ? ` — ${liveNote}` : ""] })] })), _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx(Link, { to: "/orders", className: "text-sm text-saffron hover:underline flex items-center gap-1 mb-3", children: "\u2190 Back to orders" }), _jsxs("h1", { className: "font-display text-2xl font-bold text-forest", children: ["Order ", order.orderNumber] }), _jsxs("p", { className: "text-sm text-slate/50 mt-1 flex items-center gap-1", children: [_jsx(Clock, { size: 13 }), " ", new Date(order.createdAt).toLocaleString("en-RW")] })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "font-mono font-bold text-saffron text-xl", children: formatRWF(order.total) }), _jsx("div", { className: `text-xs font-semibold px-2.5 py-1 rounded-full mt-1 inline-block ${currentStatus === "delivered"
                                            ? "bg-green-50 text-green-700"
                                            : currentStatus === "cancelled"
                                                ? "bg-vermillion/10 text-vermillion"
                                                : "bg-saffron/15 text-saffron-dark"}`, children: STATUS_LABELS[currentStatus] })] })] }), currentStatus !== "cancelled" && (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-6", children: [_jsxs("h2", { className: "font-display font-bold text-forest mb-5 flex items-center gap-2", children: ["Order tracking", _jsx("span", { className: "text-xs bg-forest/10 text-forest/60 px-2 py-0.5 rounded-full font-normal", children: "Live" })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute left-4 top-0 bottom-0 w-0.5 bg-forest/10" }), STATUSES.map((status, i) => {
                                        const isCompleted = i <= currentStep;
                                        const isCurrent = i === currentStep;
                                        return (_jsxs("div", { className: "relative flex items-start gap-4 pb-5 last:pb-0", children: [_jsx("div", { className: `relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isCompleted ? "bg-forest" : "bg-ivory border-2 border-forest/15"} ${isCurrent && flash ? "ring-4 ring-saffron/30" : ""}`, children: isCompleted ? (_jsx(CheckCircle, { size: 16, className: "text-saffron" })) : (_jsx(Circle, { size: 16, className: "text-forest/20" })) }), _jsxs("div", { className: `pt-1 ${isCompleted ? "opacity-100" : "opacity-40"}`, children: [_jsx("div", { className: `text-sm font-semibold ${isCurrent ? "text-forest" : "text-slate/70"}`, children: STATUS_LABELS[status] }), isCurrent && (_jsx("div", { className: "text-xs text-saffron font-medium mt-0.5", children: liveStatus === status && flash ? "Just updated!" : "Current status" }))] })] }, status));
                                    })] })] })), _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsx("h2", { className: "font-display font-bold text-forest mb-4", children: "Items ordered" }), _jsx("div", { className: "space-y-3", children: order.items.map((item) => (_jsxs("div", { className: "flex gap-4", children: [_jsx("img", { src: item.image ?? "/placeholder.png", alt: item.title, className: "w-14 h-14 rounded-xl object-cover shrink-0 bg-slate/10" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx(Link, { to: `/products/${item.productId}`, className: "text-sm font-semibold text-forest hover:text-saffron transition line-clamp-2", children: item.title }), item.variant && _jsx("p", { className: "text-xs text-slate/50", children: item.variant }), _jsxs("p", { className: "text-xs text-slate/50", children: ["Qty: ", item.quantity] })] }), _jsx("span", { className: "font-mono font-bold text-saffron text-sm shrink-0", children: formatRWF(item.unitPrice * item.quantity) })] }, item._id))) })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(MapPin, { size: 16, className: "text-forest" }), _jsx("h3", { className: "font-display font-bold text-forest text-sm", children: "Delivery address" })] }), _jsxs("div", { className: "text-sm text-slate/60 space-y-0.5", children: [_jsx("p", { children: order.deliveryAddress.sector }), order.deliveryAddress.district && _jsx("p", { children: order.deliveryAddress.district }), order.deliveryAddress.street && _jsx("p", { children: order.deliveryAddress.street }), order.deliveryAddress.phone && (_jsx("p", { className: "font-mono", children: order.deliveryAddress.phone }))] })] }), _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsx("h3", { className: "font-display font-bold text-forest text-sm mb-3", children: "Payment" }), _jsxs("div", { className: "space-y-1.5 text-sm", children: [_jsxs("div", { className: "flex justify-between text-slate/60", children: [_jsx("span", { children: "Subtotal" }), _jsx("span", { className: "font-mono", children: formatRWF(order.subtotal) })] }), _jsxs("div", { className: "flex justify-between text-slate/60", children: [_jsx("span", { children: "Delivery" }), _jsx("span", { className: "font-mono", children: formatRWF(order.deliveryFee) })] }), _jsxs("div", { className: "flex justify-between font-bold text-forest border-t border-forest/8 pt-1.5", children: [_jsx("span", { children: "Total" }), _jsx("span", { className: "font-mono text-saffron", children: formatRWF(order.total) })] }), _jsxs("div", { className: "text-xs text-slate/40 capitalize mt-1", children: [order.paymentMethod.replace("_", " "), " \u00B7 ", order.paymentStatus] })] })] })] })] })] }));
}
