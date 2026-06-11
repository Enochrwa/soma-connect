import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGetMeQuery, useUpdateProfileMutation, useLogoutMutation } from "../app/api";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { clearAuth, setAuth } from "../features/auth/authSlice";
import { User, Package, Heart, Star, LogOut, Settings, Camera, Loader2, ChevronRight, Shield, } from "lucide-react";
function Avatar({ name, avatar }) {
    if (avatar)
        return _jsx("img", { src: avatar, alt: name, className: "w-20 h-20 rounded-2xl object-cover" });
    const initials = name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) ?? "?";
    return (_jsx("div", { className: "w-20 h-20 rounded-2xl bg-forest flex items-center justify-center text-saffron font-bold text-2xl font-display", children: initials }));
}
export default function AccountPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [tab, setTab] = useState("profile");
    const user = useAppSelector((s) => s.auth.user);
    const { data } = useGetMeQuery(undefined, { skip: !user });
    const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();
    const [logout] = useLogoutMutation();
    const [name, setName] = useState(user?.profile?.name ?? "");
    const [lang, setLang] = useState(user?.profile?.language ?? "en");
    const [saved, setSaved] = useState(false);
    async function handleSave(e) {
        e.preventDefault();
        try {
            const res = await updateProfile({
                profile: { name, language: lang },
            }).unwrap();
            dispatch(setAuth({ user: res.user, accessToken: "" }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
        catch {
            /* */
        }
    }
    async function handleLogout() {
        await logout();
        dispatch(clearAuth());
        navigate("/");
    }
    const me = data?.user ?? user;
    const TABS = [
        { key: "profile", label: "My Profile", icon: User },
        { key: "orders", label: "My Orders", icon: Package },
        { key: "settings", label: "Settings", icon: Settings },
    ];
    return (_jsxs("div", { className: "max-w-4xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "bg-forest rounded-2xl p-6 mb-6 flex items-center gap-5", children: [_jsxs("div", { className: "relative", children: [_jsx(Avatar, { name: me?.profile?.name, avatar: me?.profile?.avatar }), _jsx("button", { className: "absolute -bottom-1 -right-1 w-7 h-7 bg-saffron rounded-full flex items-center justify-center shadow", children: _jsx(Camera, { size: 12, className: "text-white" }) })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "font-display text-xl font-bold text-white", children: me?.profile?.name ?? "SOMA User" }), _jsx("p", { className: "text-white/60 text-sm mt-0.5", children: me?.phone }), _jsxs("div", { className: "flex items-center gap-3 mt-2", children: [_jsx("span", { className: "bg-saffron/20 text-saffron text-xs font-bold px-2.5 py-1 rounded-full capitalize", children: me?.tier ?? "starter" }), _jsxs("span", { className: "text-white/40 text-xs", children: ["\u2B50 ", me?.loyaltyPoints ?? 0, " points"] })] })] }), me?.role === "seller" && (_jsxs(Link, { to: "/seller", className: "bg-saffron text-forest font-bold px-4 py-2 rounded-xl text-sm hover:bg-saffron-dark transition flex items-center gap-2", children: [_jsx(Star, { size: 14 }), " Seller Dashboard"] })), me?.role === "admin" && (_jsxs(Link, { to: "/admin", className: "bg-vermillion text-white font-bold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition flex items-center gap-2", children: [_jsx(Shield, { size: 14 }), " Admin Panel"] }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6", children: [_jsxs("div", { className: "space-y-1", children: [TABS.map(({ key, label, icon: Icon }) => (_jsxs("button", { onClick: () => setTab(key), className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${tab === key
                                    ? "bg-forest text-white"
                                    : "text-slate/70 hover:bg-forest/10 hover:text-forest"}`, children: [_jsx(Icon, { size: 16 }), " ", label] }, key))), _jsxs("button", { onClick: handleLogout, className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-vermillion hover:bg-vermillion/5 transition text-left", children: [_jsx(LogOut, { size: 16 }), " Sign out"] })] }), _jsxs("div", { className: "md:col-span-3", children: [tab === "profile" && (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-6", children: [_jsx("h2", { className: "font-display font-bold text-forest mb-5", children: "Personal information" }), _jsxs("form", { onSubmit: handleSave, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Full name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "Your name", className: "w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Phone number" }), _jsx("input", { type: "tel", value: me?.phone ?? "", disabled: true, className: "w-full rounded-xl border border-forest/10 px-4 py-3 text-sm bg-ivory text-slate/50 font-mono" }), _jsx("p", { className: "text-xs text-slate/40 mt-1", children: "Phone number cannot be changed." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Email" }), _jsx("input", { type: "email", value: me?.email ?? "", disabled: true, className: "w-full rounded-xl border border-forest/10 px-4 py-3 text-sm bg-ivory text-slate/50" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5", children: "Language" }), _jsxs("select", { value: lang, onChange: (e) => setLang(e.target.value), className: "w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 bg-white", children: [_jsx("option", { value: "en", children: "English" }), _jsx("option", { value: "rw", children: "Kinyarwanda" }), _jsx("option", { value: "fr", children: "Fran\u00E7ais" })] })] }), _jsxs("button", { type: "submit", disabled: saving, className: `flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition ${saved ? "bg-green-500 text-white" : "bg-forest text-white hover:bg-forest-light"} disabled:opacity-60`, children: [saving && _jsx(Loader2, { size: 15, className: "animate-spin" }), saved ? "Saved!" : "Save changes"] })] })] })), tab === "orders" && (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-6", children: [_jsx("h2", { className: "font-display font-bold text-forest mb-5", children: "My Orders" }), _jsxs("div", { className: "flex flex-col items-center py-8 text-center", children: [_jsx(Package, { className: "text-forest/20 mb-3", size: 40 }), _jsx("p", { className: "text-slate/50 mb-4", children: "View all your orders here" }), _jsxs(Link, { to: "/orders", className: "flex items-center gap-2 bg-forest text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-forest-light transition text-sm", children: ["View orders ", _jsx(ChevronRight, { size: 15 })] })] })] })), tab === "settings" && (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-6 space-y-5", children: [_jsx("h2", { className: "font-display font-bold text-forest", children: "Account Settings" }), _jsxs("div", { className: "space-y-3", children: [_jsxs(Link, { to: "/rewards", className: "flex items-center justify-between p-4 rounded-xl border border-forest/10 hover:bg-forest/5 transition group", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Star, { size: 18, className: "text-saffron" }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold text-sm text-forest", children: "Loyalty Rewards" }), _jsxs("div", { className: "text-xs text-slate/50", children: [me?.loyaltyPoints ?? 0, " points \u00B7 ", me?.tier] })] })] }), _jsx(ChevronRight, { size: 16, className: "text-slate/30 group-hover:text-forest transition" })] }), _jsxs(Link, { to: "/wishlist", className: "flex items-center justify-between p-4 rounded-xl border border-forest/10 hover:bg-forest/5 transition group", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Heart, { size: 18, className: "text-vermillion" }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold text-sm text-forest", children: "Wishlist" }), _jsx("div", { className: "text-xs text-slate/50", children: "Saved products" })] })] }), _jsx(ChevronRight, { size: 16, className: "text-slate/30 group-hover:text-forest transition" })] })] }), _jsx("div", { className: "pt-3 border-t border-forest/8", children: _jsxs("button", { onClick: handleLogout, className: "flex items-center gap-2 text-sm text-vermillion font-semibold hover:underline", children: [_jsx(LogOut, { size: 15 }), " Sign out of SOMA"] }) })] }))] })] })] }));
}
