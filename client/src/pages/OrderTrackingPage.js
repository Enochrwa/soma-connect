import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useGetOrderQuery } from "../app/api";
const STEPS = [
    "placed",
    "payment_confirmed",
    "preparing",
    "packed",
    "picked_up",
    "out_for_delivery",
    "delivered",
];
const LABELS = {
    placed: "Order placed",
    payment_confirmed: "Payment confirmed",
    preparing: "Seller preparing",
    packed: "Packed",
    picked_up: "Picked up",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
};
export default function OrderTrackingPage() {
    const { id } = useParams();
    const { data, refetch } = useGetOrderQuery(id);
    useEffect(() => {
        const socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000");
        socket.emit("subscribeOrder", id);
        socket.on("orderUpdate", () => refetch());
        return () => {
            socket.disconnect();
        };
    }, [id, refetch]);
    const order = data?.order;
    if (!order)
        return _jsx("div", { className: "mx-auto max-w-3xl px-4 py-12", children: "Loading\u2026" });
    const currentIdx = STEPS.indexOf(order.status);
    return (_jsxs("div", { className: "mx-auto max-w-3xl px-4 py-8", children: [_jsxs("h1", { className: "font-display text-2xl text-forest", children: ["Order ", order.orderNumber] }), _jsx("p", { className: "text-sm text-slate/60", children: "Live status updates \u2014 no refresh needed." }), _jsx("ol", { className: "mt-6 space-y-4", children: STEPS.map((s, i) => (_jsxs("li", { className: "flex items-center gap-3", children: [_jsx("span", { className: `w-8 h-8 rounded-full grid place-items-center font-mono text-xs
              ${i < currentIdx ? "bg-forest text-ivory" : i === currentIdx ? "bg-saffron text-slate" : "bg-white border"}`, children: i < currentIdx ? "✓" : i + 1 }), _jsx("span", { className: i <= currentIdx ? "text-forest font-medium" : "text-slate/50", children: LABELS[s] })] }, s))) })] }));
}
