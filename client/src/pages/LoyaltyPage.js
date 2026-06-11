import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useGetLoyaltyQuery, useClaimDailyLoginMutation } from "../app/api";
import { useAppSelector } from "../app/hooks";
import { Star, Gift, Zap, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
const TIER_CONFIG = {
    starter: {
        color: "bg-slate/10 text-slate",
        next: "regular",
        pointsNeeded: 500,
        label: "Starter",
    },
    regular: {
        color: "bg-blue-50 text-blue-700",
        next: "trusted",
        pointsNeeded: 1500,
        label: "Regular",
    },
    trusted: {
        color: "bg-purple-50 text-purple-700",
        next: "vip",
        pointsNeeded: 5000,
        label: "Trusted",
    },
    vip: {
        color: "bg-saffron/15 text-saffron-dark",
        next: null,
        pointsNeeded: null,
        label: "VIP 👑",
    },
};
export default function LoyaltyPage() {
    const user = useAppSelector((s) => s.auth.user);
    const { data, isLoading } = useGetLoyaltyQuery(undefined, { skip: !user });
    const [claimDaily, { isLoading: claiming }] = useClaimDailyLoginMutation();
    const [claimed, setClaimed] = useState(false);
    const [claimMsg, setClaimMsg] = useState("");
    async function handleClaim() {
        try {
            const res = await claimDaily().unwrap();
            setClaimed(true);
            setClaimMsg(res.message ?? `+${res.awarded} points earned!`);
        }
        catch (err) {
            const msg = typeof err === "object" && err !== null && "data" in err
                ? err.data?.error
                : undefined;
            setClaimMsg(msg ?? "Already claimed today.");
            setClaimed(true);
        }
    }
    if (isLoading)
        return (_jsx("div", { className: "flex justify-center py-16", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 28 }) }));
    const tier = (user?.tier ?? "starter");
    const tierInfo = TIER_CONFIG[tier];
    const points = user?.loyaltyPoints ?? 0;
    const progress = tierInfo.pointsNeeded
        ? Math.min((points / tierInfo.pointsNeeded) * 100, 100)
        : 100;
    return (_jsxs("div", { className: "max-w-2xl mx-auto px-4 py-8 space-y-6", children: [_jsx("h1", { className: "font-display text-2xl font-bold text-forest", children: "Your Rewards" }), _jsxs("div", { className: "bg-forest rounded-2xl p-6 text-white", children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white/60 text-sm", children: "Available points" }), _jsx("p", { className: "font-display text-4xl font-bold text-saffron mt-1", children: points.toLocaleString() })] }), _jsx("div", { className: `px-3 py-1.5 rounded-full text-sm font-bold ${tierInfo.color}`, children: tierInfo.label })] }), tierInfo.pointsNeeded && (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-xs text-white/50 mb-1.5", children: [_jsxs("span", { children: ["Progress to ", TIER_CONFIG[tierInfo.next]?.label] }), _jsxs("span", { children: [points, " / ", tierInfo.pointsNeeded] })] }), _jsx("div", { className: "h-2 bg-white/10 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-saffron rounded-full transition-all", style: { width: `${progress}%` } }) })] }))] }), _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 bg-saffron/10 rounded-xl flex items-center justify-center", children: _jsx(Gift, { size: 20, className: "text-saffron" }) }), _jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-forest", children: "Daily Login Bonus" }), _jsx("p", { className: "text-xs text-slate/50", children: "Earn points by logging in every day" })] })] }), claimed ? (_jsxs("div", { className: "flex items-center gap-2 text-green-600 text-sm font-medium", children: [_jsx(CheckCircle, { size: 16 }), " ", claimMsg] })) : (_jsxs("button", { onClick: handleClaim, disabled: claiming, className: "flex items-center gap-2 bg-saffron text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-saffron-dark transition disabled:opacity-60", children: [claiming ? _jsx(Loader2, { size: 15, className: "animate-spin" }) : _jsx(Zap, { size: 15 }), "Claim daily bonus"] }))] }), data?.events?.length ? (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsx("h2", { className: "font-display font-bold text-forest mb-4", children: "Points history" }), _jsx("div", { className: "space-y-3", children: data.events.map((ev) => (_jsxs("div", { className: "flex items-center justify-between py-2 border-b border-forest/5 last:border-0", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-forest", children: ev.description }), _jsx("p", { className: "text-xs text-slate/40 mt-0.5", children: new Date(ev.createdAt).toLocaleDateString("en-RW") })] }), _jsxs("span", { className: `font-mono font-bold text-sm ${ev.points >= 0 ? "text-green-600" : "text-vermillion"}`, children: [ev.points >= 0 ? "+" : "", ev.points] })] }, ev._id))) })] })) : null, _jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsxs("h2", { className: "font-display font-bold text-forest mb-4 flex items-center gap-2", children: [_jsx(Star, { size: 16, className: "text-saffron" }), " How to earn points"] }), _jsx("div", { className: "space-y-3", children: [
                            { label: "Daily login", points: "+10", icon: "🌅" },
                            { label: "Make a purchase", points: "+1 per 100 RWF", icon: "🛒" },
                            { label: "Leave a review", points: "+50", icon: "⭐" },
                            { label: "Refer a friend", points: "+200", icon: "👥" },
                        ].map(({ label, points: pts, icon }) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3 text-sm text-slate/70", children: [_jsx("span", { children: icon }), " ", label] }), _jsx("span", { className: "text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full", children: pts })] }, label))) })] })] }));
}
