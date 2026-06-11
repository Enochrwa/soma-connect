import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInitiatePaymentMutation, useGetPaymentStatusQuery } from "../../app/api";
import { Loader2, CheckCircle, XCircle, Smartphone, Banknote, Info } from "lucide-react";
import { formatRWF } from "../../utils/format";
export function PaymentModal({ orderId, orderNumber, total, method, defaultPhone = "", onClose, onSuccess, }) {
    const navigate = useNavigate();
    const [phone, setPhone] = useState(defaultPhone);
    const [state, setState] = useState("idle");
    const [txRef, setTxRef] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [initiatePayment] = useInitiatePaymentMutation();
    // Poll payment status every 3s while awaiting USSD confirmation
    const { data: statusData } = useGetPaymentStatusQuery(txRef ?? "", {
        skip: !txRef || state !== "awaiting_confirmation",
        pollingInterval: 3000,
    });
    useEffect(() => {
        if (!statusData)
            return;
        if (statusData.status === "succeeded") {
            setState("success");
            setTimeout(() => {
                onSuccess();
                navigate(`/orders/${orderId}`);
            }, 1800);
        }
        else if (statusData.status === "failed") {
            setState("failed");
            setErrorMsg("Payment was declined or timed out. Please try again.");
        }
    }, [statusData, orderId, navigate, onSuccess]);
    async function handlePay() {
        if (method !== "cod" && !phone.trim()) {
            setErrorMsg("Please enter your mobile money number.");
            return;
        }
        setErrorMsg("");
        setState("initiating");
        try {
            const result = await initiatePayment({ orderId, method, phone: phone.trim() }).unwrap();
            if (method === "cod") {
                setState("success");
                setTimeout(() => { onSuccess(); navigate(`/orders/${orderId}`); }, 1500);
                return;
            }
            // For MoMo: poll via txRef / mockRef
            setTxRef(result.mockRef ?? result.txRef ?? null);
            setState("awaiting_confirmation");
        }
        catch (err) {
            const e = err;
            setState("failed");
            setErrorMsg(e?.data?.error ?? "Payment initiation failed. Please try again.");
        }
    }
    const isMoMo = method !== "cod";
    const methodLabel = method === "mtn_momo" ? "MTN MoMo" : method === "airtel_money" ? "Airtel Money" : "Cash on Delivery";
    const headerColor = method === "mtn_momo" ? "bg-yellow-400" : method === "airtel_money" ? "bg-red-500" : "bg-green-600";
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden", children: [_jsxs("div", { className: `${headerColor} text-white p-5`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [isMoMo ? _jsx(Smartphone, { size: 22 }) : _jsx(Banknote, { size: 22 }), _jsxs("div", { children: [_jsx("h2", { className: "font-bold text-lg leading-none", children: methodLabel }), _jsxs("p", { className: "text-white/80 text-sm mt-0.5", children: ["Order ", orderNumber] })] })] }), _jsx("p", { className: "font-mono font-bold text-2xl mt-3", children: formatRWF(total) })] }), _jsxs("div", { className: "p-5 space-y-4", children: [state === "idle" && (_jsxs(_Fragment, { children: [isMoMo && (_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold text-forest mb-1.5", children: [method === "mtn_momo" ? "MTN" : "Airtel", " number"] }), _jsx("input", { type: "tel", value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "+250 7XX XXX XXX", className: "w-full border border-forest/20 rounded-xl px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30" }), _jsxs("div", { className: "flex items-start gap-2 mt-2.5 bg-blue-50 rounded-lg p-2.5", children: [_jsx(Info, { size: 13, className: "text-blue-600 mt-0.5 shrink-0" }), _jsxs("p", { className: "text-xs text-blue-700", children: ["A USSD push will be sent to this number \u2014 approve it on your phone to confirm.", import.meta.env.DEV && (_jsx("span", { className: "block mt-0.5 font-medium text-blue-500", children: "Demo mode: auto-confirms in ~3 seconds." }))] })] })] })), !isMoMo && (_jsx("p", { className: "text-sm text-slate/70", children: "Your order will be placed now and you pay cash when it arrives. A confirmation email will be sent." })), errorMsg && (_jsxs("p", { className: "text-vermillion text-xs flex items-center gap-1.5", children: [_jsx(XCircle, { size: 13 }), " ", errorMsg] })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: handlePay, className: "flex-1 bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest/90 transition text-sm", children: isMoMo ? "Send USSD Push" : "Place Order" }), _jsx("button", { onClick: onClose, className: "px-4 border border-forest/15 rounded-xl text-sm text-slate/60 hover:bg-forest/5 transition", children: "Cancel" })] })] })), state === "initiating" && (_jsxs("div", { className: "flex flex-col items-center py-6 gap-3", children: [_jsx(Loader2, { className: "animate-spin text-forest", size: 32 }), _jsx("p", { className: "text-sm text-slate/70 font-medium", children: "Sending payment request\u2026" })] })), state === "awaiting_confirmation" && (_jsxs("div", { className: "flex flex-col items-center py-4 gap-3 text-center", children: [_jsx("div", { className: "w-14 h-14 rounded-full bg-saffron/15 flex items-center justify-center", children: _jsx(Smartphone, { size: 26, className: "text-saffron" }) }), _jsxs("div", { children: [_jsx("p", { className: "font-bold text-forest", children: "Check your phone" }), _jsxs("p", { className: "text-sm text-slate/60 mt-1", children: ["USSD prompt sent to", " ", _jsx("span", { className: "font-mono font-semibold", children: phone }), ".", _jsx("br", {}), "Approve to complete payment."] })] }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-slate/40 mt-1", children: [_jsx(Loader2, { size: 12, className: "animate-spin" }), "Waiting for confirmation\u2026"] })] })), state === "success" && (_jsxs("div", { className: "flex flex-col items-center py-6 gap-3 text-center", children: [_jsx(CheckCircle, { size: 44, className: "text-green-500" }), _jsxs("div", { children: [_jsx("p", { className: "font-bold text-forest text-lg", children: "Payment confirmed!" }), _jsx("p", { className: "text-sm text-slate/60 mt-1", children: "Redirecting to your order\u2026" })] })] })), state === "failed" && (_jsxs("div", { className: "flex flex-col items-center py-4 gap-3 text-center", children: [_jsx(XCircle, { size: 44, className: "text-vermillion" }), _jsxs("div", { children: [_jsx("p", { className: "font-bold text-forest", children: "Payment failed" }), _jsx("p", { className: "text-sm text-slate/60 mt-1", children: errorMsg })] }), _jsxs("div", { className: "flex gap-3 w-full", children: [_jsx("button", { onClick: () => { setState("idle"); setErrorMsg(""); }, className: "flex-1 bg-forest text-white font-bold py-2.5 rounded-xl text-sm", children: "Try again" }), _jsx("button", { onClick: onClose, className: "flex-1 border border-forest/15 rounded-xl py-2.5 text-sm text-slate/60", children: "Cancel" })] })] }))] })] }) }));
}
