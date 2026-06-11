import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { useCreateOrderMutation } from "../app/api";
import { clearCart } from "../features/cart/cartSlice";
import { PaymentModal } from "../components/payment/PaymentModal";
import { formatRWF } from "../utils/format";
import { Loader2, MapPin, CreditCard, Truck, CheckCircle } from "lucide-react";
const PAYMENT_OPTIONS = [
    { value: "mtn_momo", label: "MTN MoMo", emoji: "📱", desc: "Pay via MTN Mobile Money USSD push" },
    { value: "airtel_money", label: "Airtel Money", emoji: "📲", desc: "Pay via Airtel Money USSD push" },
    { value: "cod", label: "Cash on Delivery", emoji: "💵", desc: "Pay when your order arrives" },
];
const DELIVERY_OPTIONS = [
    { value: "standard", label: "Standard", fee: 1500, eta: "2–4 days" },
    { value: "express", label: "Express", fee: 2000, eta: "Same day" },
    { value: "pickup", label: "Pickup", fee: 0, eta: "Ready in 2 hrs" },
];
const DISTRICTS = ["Kigali", "Nyarugenge", "Gasabo", "Kicukiro", "Musanze", "Rubavu", "Rusizi", "Huye"];
export default function CheckoutPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const items = useAppSelector((s) => s.cart.items);
    const user = useAppSelector((s) => s.auth.user);
    const [createOrder, { isLoading }] = useCreateOrderMutation();
    const [form, setForm] = useState({ sector: "", district: "Kigali", street: "", phone: user?.phone ?? "" });
    const [paymentMethod, setPaymentMethod] = useState("mtn_momo");
    const [deliverySpeed, setDeliverySpeed] = useState("standard");
    const [error, setError] = useState("");
    // After order creation, show payment modal
    const [pendingOrder, setPendingOrder] = useState(null);
    const deliveryFee = DELIVERY_OPTIONS.find((d) => d.value === deliverySpeed)?.fee ?? 1500;
    const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
    const total = subtotal + deliveryFee;
    if (!items.length) {
        navigate("/cart");
        return null;
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!form.sector.trim()) {
            setError("Please enter your sector/neighbourhood.");
            return;
        }
        if (!form.phone.trim()) {
            setError("Please enter your phone number.");
            return;
        }
        try {
            const result = await createOrder({
                items: items.map((i) => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    variant: i.variant,
                })),
                deliveryAddress: form,
                deliverySpeed,
                paymentMethod,
            }).unwrap();
            // Show payment modal — don't clear cart yet
            setPendingOrder({
                id: result.order._id,
                number: result.order.orderNumber,
                total: result.order.total,
            });
        }
        catch (err) {
            const msg = err.data?.error;
            setError(msg ?? "Order failed. Please try again.");
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx(Helmet, { children: _jsx("title", { children: "Checkout \u2014 SOMA Market" }) }), pendingOrder && (_jsx(PaymentModal, { orderId: pendingOrder.id, orderNumber: pendingOrder.number, total: pendingOrder.total, method: paymentMethod, defaultPhone: form.phone, onClose: () => {
                    // If they cancel, go to order page anyway (order is placed)
                    navigate(`/orders/${pendingOrder.id}`);
                }, onSuccess: () => {
                    dispatch(clearCart());
                } })), _jsxs("div", { className: "max-w-5xl mx-auto px-4 py-8", children: [_jsx("h1", { className: "font-display text-2xl font-bold text-forest mb-8", children: "Checkout" }), error && (_jsx("div", { className: "bg-vermillion/10 border border-vermillion/20 text-vermillion rounded-xl px-4 py-3 text-sm mb-6", children: error })), _jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-5", children: [_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(MapPin, { size: 18, className: "text-forest" }), _jsx("h2", { className: "font-display font-bold text-forest", children: "Delivery address" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "sm:col-span-2", children: [_jsxs("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: ["Sector / Neighbourhood ", _jsx("span", { className: "text-vermillion", children: "*" })] }), _jsx("input", { type: "text", value: form.sector, onChange: (e) => setForm((f) => ({ ...f, sector: e.target.value })), placeholder: "e.g. Remera, Gisozi, Kimisagara", className: "w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "District" }), _jsx("select", { value: form.district, onChange: (e) => setForm((f) => ({ ...f, district: e.target.value })), className: "w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-saffron/30", children: DISTRICTS.map((d) => _jsx("option", { value: d, children: d }, d)) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: ["Phone ", _jsx("span", { className: "text-vermillion", children: "*" })] }), _jsx("input", { type: "tel", value: form.phone, onChange: (e) => setForm((f) => ({ ...f, phone: e.target.value })), placeholder: "+250 7XX XXX XXX", className: "w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-saffron/30", required: true })] }), _jsxs("div", { className: "sm:col-span-2", children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Street / Landmark (optional)" }), _jsx("input", { type: "text", value: form.street, onChange: (e) => setForm((f) => ({ ...f, street: e.target.value })), placeholder: "Street name or nearby landmark", className: "w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30" })] })] })] }), _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(Truck, { size: 18, className: "text-forest" }), _jsx("h2", { className: "font-display font-bold text-forest", children: "Delivery speed" })] }), _jsx("div", { className: "grid grid-cols-3 gap-3", children: DELIVERY_OPTIONS.map((opt) => (_jsxs("button", { type: "button", onClick: () => setDeliverySpeed(opt.value), className: `border-2 rounded-xl p-3 text-left transition ${deliverySpeed === opt.value ? "border-forest bg-forest/5" : "border-forest/10 hover:border-forest/25"}`, children: [_jsx("div", { className: "font-semibold text-sm text-forest", children: opt.label }), _jsx("div", { className: "text-xs text-slate/50 mt-0.5", children: opt.eta }), _jsx("div", { className: `font-mono text-sm font-bold mt-1 ${opt.fee === 0 ? "text-green-600" : "text-saffron"}`, children: opt.fee === 0 ? "Free" : formatRWF(opt.fee) })] }, opt.value))) })] }), _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(CreditCard, { size: 18, className: "text-forest" }), _jsx("h2", { className: "font-display font-bold text-forest", children: "Payment method" })] }), _jsx("div", { className: "space-y-2", children: PAYMENT_OPTIONS.map((opt) => (_jsxs("label", { className: `flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${paymentMethod === opt.value ? "border-forest bg-forest/5" : "border-forest/10 hover:border-forest/25"}`, children: [_jsx("input", { type: "radio", name: "payment", value: opt.value, checked: paymentMethod === opt.value, onChange: () => setPaymentMethod(opt.value), className: "sr-only" }), _jsx("span", { className: "text-2xl", children: opt.emoji }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold text-sm text-forest", children: opt.label }), _jsx("div", { className: "text-xs text-slate/50", children: opt.desc })] }), paymentMethod === opt.value && _jsx(CheckCircle, { size: 18, className: "text-forest ml-auto" })] }, opt.value))) })] })] }), _jsx("div", { children: _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5 sticky top-24", children: [_jsx("h2", { className: "font-display font-bold text-forest mb-4", children: "Order summary" }), _jsx("div", { className: "space-y-3 max-h-52 overflow-y-auto pr-1", children: items.map((item) => (_jsxs("div", { className: "flex gap-3 text-sm", children: [_jsx("img", { src: item.image, alt: item.title, className: "w-12 h-12 rounded-lg object-cover shrink-0 bg-slate/10" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-medium text-forest line-clamp-2", children: item.title }), _jsxs("p", { className: "text-xs text-slate/50", children: ["Qty: ", item.quantity] })] }), _jsx("span", { className: "font-mono text-xs font-bold text-saffron shrink-0", children: formatRWF(item.unitPrice * item.quantity) })] }, item.productId))) }), _jsxs("div", { className: "border-t border-forest/8 mt-4 pt-4 space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between text-slate/60", children: [_jsx("span", { children: "Subtotal" }), _jsx("span", { className: "font-mono", children: formatRWF(subtotal) })] }), _jsxs("div", { className: "flex justify-between text-slate/60", children: [_jsx("span", { children: "Delivery" }), _jsx("span", { className: `font-mono ${deliveryFee === 0 ? "text-green-600 font-semibold" : ""}`, children: deliveryFee === 0 ? "FREE" : formatRWF(deliveryFee) })] }), _jsxs("div", { className: "flex justify-between font-bold text-base pt-1 border-t border-forest/8", children: [_jsx("span", { className: "text-forest", children: "Total" }), _jsx("span", { className: "font-mono text-saffron", children: formatRWF(total) })] })] }), _jsxs("button", { type: "submit", disabled: isLoading, className: "w-full mt-4 bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest/90 transition disabled:opacity-60 flex items-center justify-center gap-2", children: [isLoading && _jsx(Loader2, { size: 16, className: "animate-spin" }), "Continue to Payment"] })] }) })] }) })] })] }));
}
