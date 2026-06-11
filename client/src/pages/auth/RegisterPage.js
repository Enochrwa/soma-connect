import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterMutation } from "../../app/api";
import { useAppDispatch } from "../../app/hooks";
import { setAuth } from "../../features/auth/authSlice";
import { Eye, EyeOff, Loader2, UserPlus, CheckCircle } from "lucide-react";
function PasswordStrength({ password }) {
    const checks = [
        { label: "8+ characters", ok: password.length >= 8 },
        { label: "Uppercase", ok: /[A-Z]/.test(password) },
        { label: "Number", ok: /\d/.test(password) },
    ];
    const score = checks.filter((c) => c.ok).length;
    const colors = ["bg-vermillion", "bg-saffron", "bg-saffron", "bg-green-500"];
    const labels = ["", "Weak", "Fair", "Strong"];
    return (_jsxs("div", { className: "mt-2 space-y-1.5", children: [_jsx("div", { className: "flex gap-1", children: [0, 1, 2].map((i) => (_jsx("div", { className: `h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : "bg-forest/10"}` }, i))) }), _jsx("div", { className: "flex gap-3", children: checks.map((c) => (_jsxs("span", { className: `flex items-center gap-1 text-xs ${c.ok ? "text-green-600" : "text-slate/40"}`, children: [_jsx(CheckCircle, { size: 10, className: c.ok ? "text-green-500" : "text-slate/20" }), c.label] }, c.label))) }), score > 0 && _jsxs("p", { className: "text-xs text-slate/60 font-medium", children: [labels[score], " password"] })] }));
}
export default function RegisterPage() {
    const [form, setForm] = useState({
        name: "",
        phone: "+250 ",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [register, { isLoading }] = useRegisterMutation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (form.password !== form.confirmPassword) {
            setError("Passwords don't match.");
            return;
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        try {
            const payload = {
                name: form.name,
                phone: form.phone,
                password: form.password,
            };
            if (form.email)
                payload.email = form.email;
            const res = await register(payload).unwrap();
            dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
            navigate("/", { replace: true });
        }
        catch (err) {
            const msg = typeof err === "object" && err !== null && "data" in err
                ? err.data?.error
                : undefined;
            setError(msg ?? "Registration failed. Please try again.");
        }
    }
    return (_jsx("div", { className: "min-h-[80vh] flex items-center justify-center px-4 py-12 bg-ivory", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "inline-flex items-center justify-center w-14 h-14 bg-saffron rounded-2xl mb-4 shadow-gold", children: _jsx(UserPlus, { className: "text-white", size: 28 }) }), _jsx("h1", { className: "font-display text-3xl font-bold text-forest", children: "Create account" }), _jsx("p", { className: "text-slate/60 mt-1 text-sm", children: "Join SOMA \u2014 Rwanda's marketplace" })] }), _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-6 space-y-4", children: [error && (_jsx("div", { className: "bg-vermillion/10 border border-vermillion/20 text-vermillion rounded-xl px-4 py-3 text-sm", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Full name" }), _jsx("input", { type: "text", value: form.name, onChange: field("name"), placeholder: "Your full name", className: "w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition", required: true, minLength: 2 })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: ["Phone number ", _jsx("span", { className: "text-vermillion", children: "*" })] }), _jsx("input", { type: "tel", value: form.phone, onChange: field("phone"), placeholder: "+250 7XX XXX XXX", className: "w-full rounded-xl border border-forest/15 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition", required: true })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: ["Email address ", _jsx("span", { className: "text-slate/30", children: "(optional)" })] }), _jsx("input", { type: "email", value: form.email, onChange: field("email"), placeholder: "you@example.com", className: "w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPw ? "text" : "password", value: form.password, onChange: field("password"), placeholder: "Create a strong password", className: "w-full rounded-xl border border-forest/15 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition", required: true, minLength: 8 }), _jsx("button", { type: "button", onClick: () => setShowPw(!showPw), className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate/40 hover:text-slate transition", children: showPw ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) })] }), form.password && _jsx(PasswordStrength, { password: form.password })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Confirm password" }), _jsx("input", { type: showPw ? "text" : "password", value: form.confirmPassword, onChange: field("confirmPassword"), placeholder: "Repeat your password", className: `w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${form.confirmPassword && form.password !== form.confirmPassword
                                                ? "border-vermillion/50 focus:ring-vermillion/30 focus:border-vermillion"
                                                : "border-forest/15 focus:ring-saffron/40 focus:border-saffron"}`, required: true }), form.confirmPassword && form.password !== form.confirmPassword && (_jsx("p", { className: "text-xs text-vermillion mt-1", children: "Passwords don't match" }))] }), _jsxs("p", { className: "text-xs text-slate/50", children: ["By creating an account you agree to our", " ", _jsx("span", { className: "text-forest cursor-pointer hover:underline", children: "Terms of Service" }), " ", "and ", _jsx("span", { className: "text-forest cursor-pointer hover:underline", children: "Privacy Policy" }), "."] }), _jsxs("button", { type: "submit", disabled: isLoading, className: "w-full bg-saffron text-white rounded-xl py-3 font-semibold text-sm hover:bg-saffron-dark transition disabled:opacity-60 flex items-center justify-center gap-2", children: [isLoading && _jsx(Loader2, { size: 16, className: "animate-spin" }), "Create my account"] })] })] }), _jsxs("p", { className: "text-center text-sm text-slate/60 mt-6", children: ["Already have an account?", " ", _jsx(Link, { to: "/login", className: "text-forest font-semibold hover:text-saffron transition", children: "Sign in" })] })] }) }));
}
