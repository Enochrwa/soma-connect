import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useLoginMutation, useVerifyOtpMutation, useRequestOtpMutation } from "../../app/api";
import { useAppDispatch } from "../../app/hooks";
import { setAuth } from "../../features/auth/authSlice";
import { Eye, EyeOff, Phone, Mail, Loader2, ShieldCheck } from "lucide-react";
export default function LoginPage() {
    const [mode, setMode] = useState("phone");
    const [showPw, setShowPw] = useState(false);
    const [phone, setPhone] = useState("+250 ");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState("");
    const [login, { isLoading: loginLoading }] = useLoginMutation();
    const [requestOtp, { isLoading: otpReqLoading }] = useRequestOtpMutation();
    const [verifyOtp, { isLoading: otpVerifyLoading }] = useVerifyOtpMutation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from ?? "/";
    const loading = loginLoading || otpReqLoading || otpVerifyLoading;
    async function handlePhoneLogin(e) {
        e.preventDefault();
        setError("");
        try {
            const res = await login({ phone, password }).unwrap();
            dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
            navigate(from, { replace: true });
        }
        catch (err) {
            const msg = typeof err === "object" && err !== null && "data" in err
                ? err.data?.error
                : undefined;
            setError(msg ?? "Couldn't sign you in. Check your details.");
        }
    }
    async function handleOtpRequest(e) {
        e.preventDefault();
        setError("");
        try {
            await requestOtp({ email }).unwrap();
            setOtpSent(true);
        }
        catch (err) {
            const msg = typeof err === "object" && err !== null && "data" in err
                ? err.data?.error
                : undefined;
            setError(msg ?? "Couldn't send code. Try again.");
        }
    }
    async function handleOtpVerify(e) {
        e.preventDefault();
        setError("");
        try {
            const res = await verifyOtp({ email, code: otpCode }).unwrap();
            dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
            navigate(from, { replace: true });
        }
        catch (err) {
            const msg = typeof err === "object" && err !== null && "data" in err
                ? err.data?.error
                : undefined;
            setError(msg ?? "Invalid or expired code.");
        }
    }
    return (_jsx("div", { className: "min-h-[80vh] flex items-center justify-center px-4 py-12 bg-ivory", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "inline-flex items-center justify-center w-14 h-14 bg-forest rounded-2xl mb-4 shadow-card", children: _jsx(ShieldCheck, { className: "text-saffron", size: 28 }) }), _jsx("h1", { className: "font-display text-3xl font-bold text-forest", children: "Welcome back" }), _jsx("p", { className: "text-slate/60 mt-1 text-sm", children: "Sign in to your SOMA account" })] }), _jsxs("div", { className: "flex bg-forest/5 rounded-xl p-1 mb-6", children: [_jsxs("button", { onClick: () => {
                                setMode("phone");
                                setError("");
                            }, className: `flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${mode === "phone"
                                ? "bg-white text-forest shadow-card"
                                : "text-slate/60 hover:text-slate"}`, children: [_jsx(Phone, { size: 15 }), " Phone & Password"] }), _jsxs("button", { onClick: () => {
                                setMode("otp");
                                setError("");
                                setOtpSent(false);
                            }, className: `flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${mode === "otp" ? "bg-white text-forest shadow-card" : "text-slate/60 hover:text-slate"}`, children: [_jsx(Mail, { size: 15 }), " Email OTP"] })] }), _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-6 space-y-4", children: [error && (_jsx("div", { className: "bg-vermillion/10 border border-vermillion/20 text-vermillion rounded-xl px-4 py-3 text-sm", children: error })), mode === "phone" ? (_jsxs("form", { onSubmit: handlePhoneLogin, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Phone number" }), _jsx("input", { type: "tel", value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "+250 7XX XXX XXX", className: "w-full rounded-xl border border-forest/15 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPw ? "text" : "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Your password", className: "w-full rounded-xl border border-forest/15 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition", required: true }), _jsx("button", { type: "button", onClick: () => setShowPw(!showPw), className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate/40 hover:text-slate transition", children: showPw ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) })] })] }), _jsxs("button", { type: "submit", disabled: loading, className: "w-full bg-forest text-white rounded-xl py-3 font-semibold text-sm hover:bg-forest-light transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2", children: [loading && _jsx(Loader2, { size: 16, className: "animate-spin" }), "Sign in"] })] })) : (_jsxs("form", { onSubmit: otpSent ? handleOtpVerify : handleOtpRequest, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Email address" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", disabled: otpSent, className: "w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition disabled:bg-ivory disabled:opacity-70", required: true })] }), otpSent && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "6-digit code" }), _jsx("input", { type: "text", value: otpCode, onChange: (e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)), placeholder: "123456", maxLength: 6, className: "w-full rounded-xl border border-forest/15 px-4 py-3 font-mono text-xl tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition", required: true }), _jsx("button", { type: "button", onClick: () => {
                                                setOtpSent(false);
                                                setOtpCode("");
                                            }, className: "text-xs text-saffron hover:underline mt-1", children: "Use a different email" })] })), _jsxs("button", { type: "submit", disabled: loading, className: "w-full bg-forest text-white rounded-xl py-3 font-semibold text-sm hover:bg-forest-light transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2", children: [loading && _jsx(Loader2, { size: 16, className: "animate-spin" }), otpSent ? "Verify code" : "Send code"] })] }))] }), _jsxs("p", { className: "text-center text-sm text-slate/60 mt-6", children: ["New to SOMA?", " ", _jsx(Link, { to: "/register", className: "text-forest font-semibold hover:text-saffron transition", children: "Create an account" })] })] }) }));
}
