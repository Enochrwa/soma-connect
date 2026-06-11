import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginMutation, useRegisterMutation } from "../app/api";
import { useAppDispatch } from "../app/hooks";
import { setAuth } from "../features/auth/authSlice";
export default function AuthPage() {
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({ name: "", phone: "+250 ", email: "", password: "" });
    const [login] = useLoginMutation();
    const [register] = useRegisterMutation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    async function submit(e) {
        e.preventDefault();
        try {
            const res = mode === "login"
                ? await login({ phone: form.phone, password: form.password }).unwrap()
                : await register(form).unwrap();
            dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
            navigate("/");
        }
        catch (err) {
            const msg = typeof err === "object" && err !== null && "data" in err
                ? err.data?.error
                : undefined;
            alert(msg ?? "Couldn't sign you in.");
        }
    }
    return (_jsxs("div", { className: "mx-auto max-w-md px-4 py-12", children: [_jsx("h1", { className: "font-display text-3xl text-forest", children: mode === "login" ? "Welcome back" : "Create your account" }), _jsxs("form", { onSubmit: submit, className: "card p-5 mt-6 space-y-3", children: [mode === "register" && (_jsx("input", { className: "w-full rounded-lg border p-2", placeholder: "Full name", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })), _jsx("input", { className: "w-full rounded-lg border p-2 font-mono", placeholder: "+250 7XX XXX XXX", value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }) }), mode === "register" && (_jsx("input", { className: "w-full rounded-lg border p-2", placeholder: "Email (optional)", type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }) })), _jsx("input", { className: "w-full rounded-lg border p-2", placeholder: "Password", type: "password", value: form.password, onChange: (e) => setForm({ ...form, password: e.target.value }) }), _jsx("button", { className: "btn-primary w-full", children: mode === "login" ? "Sign in" : "Create account" }), _jsx("button", { type: "button", className: "text-sm text-slate/60 w-full", onClick: () => setMode(mode === "login" ? "register" : "login"), children: mode === "login" ? "New here? Create an account" : "Already have an account? Sign in" })] })] }));
}
