import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAdminDashboardQuery, useAdminUsersQuery, useAdminSellersQuery, useAdminRevenueAnalyticsQuery, useAdminUpdateSellerTierMutation, useAdminApproveSellerMutation, useAdminPendingSellersQuery, useListProductsQuery, useDeleteProductMutation, useUpdateProductMutation, } from "../../app/api";
import { formatRWF } from "../../utils/format";
import { LayoutDashboard, Users, Store, Package, TrendingUp, Loader2, Shield, Edit3, Trash2, CheckCircle, X, } from "lucide-react";
const STATUS_LABELS = {
    placed: "Placed",
    payment_confirmed: "Paid",
    preparing: "Preparing",
    packed: "Packed",
    picked_up: "Picked up",
    out_for_delivery: "Delivering",
    delivered: "Delivered",
    cancelled: "Cancelled",
};
// ── Stats overview ───────────────────────────────────────────────────────────
function DashboardOverview() {
    const { data, isLoading } = useAdminDashboardQuery();
    const { data: revenue } = useAdminRevenueAnalyticsQuery({ days: 30 });
    if (isLoading)
        return (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 28 }) }));
    const stats = data?.stats ?? {};
    const STAT_CARDS = [
        {
            label: "Total Users",
            value: stats.totalUsers ?? 0,
            icon: "👥",
            color: "bg-blue-50 text-blue-700",
        },
        {
            label: "Total Sellers",
            value: stats.totalSellers ?? 0,
            icon: "🏪",
            color: "bg-purple-50 text-purple-700",
        },
        {
            label: "Total Products",
            value: stats.totalProducts ?? 0,
            icon: "📦",
            color: "bg-green-50 text-green-700",
        },
        {
            label: "Total Orders",
            value: stats.totalOrders ?? 0,
            icon: "🛒",
            color: "bg-saffron/10 text-saffron-dark",
        },
        {
            label: "Revenue (RWF)",
            value: stats.totalRevenue ? formatRWF(stats.totalRevenue) : "—",
            icon: "💰",
            color: "bg-forest/10 text-forest",
        },
        {
            label: "Pending Orders",
            value: stats.pendingOrders ?? 0,
            icon: "⏳",
            color: "bg-orange-50 text-orange-700",
        },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-4", children: STAT_CARDS.map(({ label, value, icon, color }) => (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsx("div", { className: `w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${color}`, children: icon }), _jsx("div", { className: "font-display text-2xl font-bold text-forest", children: value }), _jsx("div", { className: "text-xs text-slate/50 mt-0.5", children: label })] }, label))) }), revenue?.data?.length ? (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsxs("h3", { className: "font-display font-bold text-forest mb-4 flex items-center gap-2", children: [_jsx(TrendingUp, { size: 17 }), " Revenue (last 30 days)"] }), _jsx("div", { className: "flex items-end gap-1 h-32", children: revenue.data.slice(-20).map((d, i) => {
                            const max = Math.max(...revenue.data.map((x) => x.revenue));
                            const pct = max > 0 ? (d.revenue / max) * 100 : 0;
                            return (_jsxs("div", { className: "flex-1 flex flex-col items-center gap-1 group relative", children: [_jsx("div", { className: "w-full bg-forest/100 rounded-t hover:bg-saffron transition", style: { height: `${Math.max(pct, 2)}%` } }), _jsxs("div", { className: "absolute bottom-full mb-1 bg-forest text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none", children: [d._id, ": ", formatRWF(d.revenue)] })] }, i));
                        }) })] })) : null, data?.recentOrders?.length ? (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsx("h3", { className: "font-display font-bold text-forest mb-4", children: "Recent Orders" }), _jsx("div", { className: "space-y-2", children: data.recentOrders.slice(0, 8).map((order) => (_jsxs("div", { className: "flex items-center justify-between py-2 border-b border-forest/5 last:border-0", children: [_jsxs("div", { children: [_jsx("span", { className: "font-mono text-xs font-semibold text-forest", children: order.orderNumber }), _jsx("span", { className: `ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${order.status === "delivered"
                                                ? "bg-green-50 text-green-700"
                                                : order.status === "cancelled"
                                                    ? "bg-vermillion/10 text-vermillion"
                                                    : "bg-saffron/10 text-saffron-dark"}`, children: STATUS_LABELS[order.status] })] }), _jsx("span", { className: "font-mono text-sm font-bold text-saffron", children: formatRWF(order.total) })] }, order._id))) })] })) : null] }));
}
// ── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
    const [q, setQ] = useState("");
    const [role, setRole] = useState("");
    const { data, isLoading } = useAdminUsersQuery({ q: q || undefined, role: role || undefined });
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex gap-3 mb-4", children: [_jsx("input", { type: "search", value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search users...", className: "flex-1 rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30" }), _jsxs("select", { value: role, onChange: (e) => setRole(e.target.value), className: "rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none bg-white", children: [_jsx("option", { value: "", children: "All roles" }), _jsx("option", { value: "buyer", children: "Buyer" }), _jsx("option", { value: "seller", children: "Seller" }), _jsx("option", { value: "admin", children: "Admin" })] })] }), isLoading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 24 }) })) : (_jsxs("div", { className: "bg-white rounded-2xl shadow-card overflow-hidden", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-forest/5", children: _jsx("tr", { children: ["Name", "Phone", "Email", "Role", "Points", "Joined"].map((h) => (_jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-slate/60 uppercase tracking-wide", children: h }, h))) }) }), _jsx("tbody", { className: "divide-y divide-forest/5", children: (data?.users ?? []).map((u) => (_jsxs("tr", { className: "hover:bg-forest/5 transition", children: [_jsx("td", { className: "px-4 py-3 font-medium text-forest", children: u.profile?.name ?? "—" }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-slate/60", children: u.phone }), _jsx("td", { className: "px-4 py-3 text-slate/60 text-xs", children: u.email ?? "—" }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${u.role === "admin"
                                                    ? "bg-vermillion/10 text-vermillion"
                                                    : u.role === "seller"
                                                        ? "bg-saffron/15 text-saffron-dark"
                                                        : "bg-forest/10 text-forest"}`, children: u.role }) }), _jsx("td", { className: "px-4 py-3 text-xs text-slate/50", children: u.loyaltyPoints ?? 0 }), _jsx("td", { className: "px-4 py-3 text-xs text-slate/40", children: "\u2014" })] }, u.id))) })] }), !data?.users?.length && (_jsx("div", { className: "text-center py-8 text-slate/40 text-sm", children: "No users found." }))] }))] }));
}
// ── Sellers tab ──────────────────────────────────────────────────────────────
function SellersTab() {
    const { data, isLoading, refetch } = useAdminSellersQuery({});
    const { data: pendingData } = useAdminPendingSellersQuery();
    const [updateTier] = useAdminUpdateSellerTierMutation();
    const [approveSeller, { isLoading: approving }] = useAdminApproveSellerMutation();
    const [editId, setEditId] = useState(null);
    const [tierVal, setTierVal] = useState("");
    const [approvalModal, setApprovalModal] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
    async function saveTier(id) {
        await updateTier({ id, tier: tierVal }).unwrap();
        setEditId(null);
    }
    async function handleApproval() {
        if (!approvalModal)
            return;
        await approveSeller({
            id: approvalModal.id,
            status: approvalModal.action,
            note: rejectNote || undefined,
        }).unwrap();
        setApprovalModal(null);
        setRejectNote("");
        refetch();
    }
    const pendingSellers = pendingData?.sellers ?? [];
    return (_jsxs("div", { className: "space-y-6", children: [pendingSellers.length > 0 && (_jsxs("div", { children: [_jsxs("h3", { className: "font-display text-forest font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "w-5 h-5 bg-saffron text-white rounded-full text-xs flex items-center justify-center font-bold", children: pendingSellers.length }), "Pending Approval"] }), _jsx("div", { className: "space-y-3", children: pendingSellers.map((s) => (_jsxs("div", { className: "bg-saffron/5 border border-saffron/25 rounded-2xl p-4 flex items-center gap-4", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-saffron/20 flex items-center justify-center text-saffron font-bold shrink-0 text-lg", children: s.storeName[0]?.toUpperCase() }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-semibold text-sm text-forest", children: s.storeName }), _jsxs("div", { className: "text-xs text-slate/60 capitalize mt-0.5", children: [s.accountType, " \u00B7 ", s.location?.sector] }), s.description && (_jsx("div", { className: "text-xs text-slate/50 mt-0.5 line-clamp-1", children: s.description }))] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsxs("button", { onClick: () => setApprovalModal({ id: s._id, name: s.storeName, action: "approved" }), className: "flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition", children: [_jsx(CheckCircle, { size: 12 }), " Approve"] }), _jsxs("button", { onClick: () => setApprovalModal({ id: s._id, name: s.storeName, action: "rejected" }), className: "flex items-center gap-1.5 text-xs bg-vermillion/10 text-vermillion px-3 py-1.5 rounded-lg hover:bg-vermillion/20 transition", children: [_jsx(X, { size: 12 }), " Reject"] })] })] }, s._id))) })] })), _jsxs("div", { children: [_jsx("h3", { className: "font-display text-forest font-bold mb-3", children: "All Sellers" }), isLoading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 24 }) })) : (_jsxs("div", { className: "space-y-3", children: [(data?.sellers ?? []).map((s) => (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-4 flex items-center gap-4", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-saffron font-bold shrink-0", children: s.storeName[0]?.toUpperCase() }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-semibold text-sm text-forest", children: s.storeName }), _jsxs("div", { className: "text-xs text-slate/50 capitalize", children: [s.accountType, " \u00B7 ", s.totalSales ?? 0, " sales \u00B7 \u2605 ", s.rating?.toFixed(1) ?? "—"] }), _jsx("span", { className: `text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block font-medium ${s.approvalStatus === "approved"
                                                    ? "bg-green-50 text-green-700"
                                                    : s.approvalStatus === "rejected"
                                                        ? "bg-vermillion/10 text-vermillion"
                                                        : "bg-saffron/10 text-saffron-dark"}`, children: s.approvalStatus ?? "pending" })] }), editId === s._id ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("select", { value: tierVal, onChange: (e) => setTierVal(e.target.value), className: "text-xs rounded-lg border border-forest/15 px-2 py-1.5 bg-white focus:outline-none", children: ["basic", "trusted", "verified", "top_seller"].map((t) => (_jsx("option", { value: t, children: t }, t))) }), _jsx("button", { onClick: () => saveTier(s._id), className: "text-green-600 hover:text-green-700", children: _jsx(CheckCircle, { size: 16 }) }), _jsx("button", { onClick: () => setEditId(null), className: "text-slate/40 hover:text-slate", children: _jsx(X, { size: 16 }) })] })) : (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-xs bg-forest/10 text-forest px-2.5 py-1 rounded-full font-semibold capitalize", children: s.verificationTier }), _jsx("button", { onClick: () => { setEditId(s._id); setTierVal(s.verificationTier); }, className: "text-slate/40 hover:text-forest transition", children: _jsx(Edit3, { size: 14 }) })] }))] }, s._id))), !data?.sellers?.length && (_jsx("div", { className: "text-center py-12 bg-white rounded-2xl shadow-card text-slate/40 text-sm", children: "No sellers found." }))] }))] }), approvalModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl p-6 w-full max-w-sm", children: [_jsx("h3", { className: "font-bold text-forest mb-1", children: approvalModal.action === "approved" ? "✅ Approve Store" : "❌ Reject Store" }), _jsxs("p", { className: "text-sm text-slate/60 mb-4", children: [_jsx("strong", { children: approvalModal.name }), " ", approvalModal.action === "approved"
                                    ? "will be approved and the seller can start listing products."
                                    : "will be rejected and notified."] }), approvalModal.action === "rejected" && (_jsx("textarea", { className: "w-full border border-forest/20 rounded-xl px-3 py-2 text-sm h-20 resize-none mb-3", placeholder: "Reason for rejection (will be sent to seller)\u2026", value: rejectNote, onChange: (e) => setRejectNote(e.target.value) })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => { setApprovalModal(null); setRejectNote(""); }, className: "flex-1 border border-forest/15 rounded-xl py-2.5 text-sm font-semibold hover:bg-forest/5 transition", children: "Cancel" }), _jsxs("button", { onClick: handleApproval, disabled: approving, className: `flex-1 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition ${approvalModal.action === "approved"
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-vermillion hover:bg-vermillion/90"}`, children: [approving && _jsx(Loader2, { size: 14, className: "animate-spin" }), approvalModal.action === "approved" ? "Approve" : "Reject"] })] })] }) }))] }));
}
// ── Products tab ─────────────────────────────────────────────────────────────
function ProductsTab() {
    const { data, refetch } = useListProductsQuery({ limit: 50 });
    const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
    const [updateProduct] = useUpdateProductMutation();
    const [deleteId, setDeleteId] = useState(null);
    async function handleDelete(id) {
        await deleteProduct(id).unwrap();
        setDeleteId(null);
        refetch();
    }
    async function toggleActive(id, current) {
        await updateProduct({ id, isActive: !current }).unwrap();
        refetch();
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "bg-white rounded-2xl shadow-card overflow-hidden", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-forest/5", children: _jsx("tr", { children: ["Product", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (_jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-slate/60 uppercase tracking-wide", children: h }, h))) }) }), _jsx("tbody", { className: "divide-y divide-forest/5", children: (data?.items ?? []).map((p) => (_jsxs("tr", { className: "hover:bg-forest/2 transition", children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: p.images?.[0], alt: "", className: "w-9 h-9 rounded-lg object-cover shrink-0" }), _jsx("span", { className: "font-medium text-forest line-clamp-1 max-w-[160px]", children: p.title })] }) }), _jsx("td", { className: "px-4 py-3 text-slate/60 capitalize", children: p.category }), _jsx("td", { className: "px-4 py-3 font-mono text-saffron font-bold text-xs", children: formatRWF(p.price) }), _jsx("td", { className: "px-4 py-3 text-slate/60", children: p.stock }), _jsx("td", { className: "px-4 py-3", children: _jsx("button", { onClick: () => toggleActive(p._id, p.isActive), className: `text-xs px-2.5 py-1 rounded-full font-semibold ${p.isActive ? "bg-green-50 text-green-700" : "bg-slate/10 text-slate/50"}`, children: p.isActive ? "Active" : "Hidden" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("button", { onClick: () => setDeleteId(p._id), className: "text-vermillion/60 hover:text-vermillion transition", children: _jsx(Trash2, { size: 14 }) }) })] }, p._id))) })] }), !data?.items?.length && (_jsx("div", { className: "text-center py-8 text-slate/40 text-sm", children: "No products found." }))] }), deleteId && (_jsx("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl p-6 w-full max-w-sm text-center", children: [_jsx(Trash2, { className: "text-vermillion mx-auto mb-3", size: 32 }), _jsx("h3", { className: "font-bold text-forest mb-2", children: "Remove product?" }), _jsx("p", { className: "text-sm text-slate/60 mb-5", children: "This will hide the product from the marketplace." }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setDeleteId(null), className: "flex-1 border border-forest/15 rounded-xl py-2.5 text-sm font-semibold hover:bg-forest/5 transition", children: "Cancel" }), _jsxs("button", { onClick: () => handleDelete(deleteId), disabled: deleting, className: "flex-1 bg-vermillion text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2", children: [deleting && _jsx(Loader2, { size: 14, className: "animate-spin" }), " Remove"] })] })] }) }))] }));
}
// ── Layout shell ─────────────────────────────────────────────────────────────
export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const NAV = [
        { path: "/admin", label: "Overview", icon: LayoutDashboard },
        { path: "/admin/users", label: "Users", icon: Users },
        { path: "/admin/sellers", label: "Sellers", icon: Store },
        { path: "/admin/products", label: "Products", icon: Package },
    ];
    return (_jsxs("div", { className: "max-w-6xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx("div", { className: "w-10 h-10 bg-vermillion/10 rounded-xl flex items-center justify-center", children: _jsx(Shield, { size: 20, className: "text-vermillion" }) }), _jsxs("div", { children: [_jsx("h1", { className: "font-display text-xl font-bold text-forest", children: "Admin Panel" }), _jsx("p", { className: "text-xs text-slate/50", children: "SOMA Marketplace Management" })] })] }), _jsx("div", { className: "flex gap-1 bg-forest/5 rounded-xl p-1 mb-6 flex-wrap", children: NAV.map(({ path, label, icon: Icon }) => {
                    const exact = path === "/admin";
                    const isActive = exact
                        ? location.pathname === "/admin"
                        : location.pathname.startsWith(path);
                    return (_jsxs("button", { onClick: () => navigate(path), className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? "bg-white text-forest shadow-card" : "text-slate/60 hover:text-forest"}`, children: [_jsx(Icon, { size: 15 }), " ", label] }, path));
                }) }), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardOverview, {}) }), _jsx(Route, { path: "/users", element: _jsx(UsersTab, {}) }), _jsx(Route, { path: "/sellers", element: _jsx(SellersTab, {}) }), _jsx(Route, { path: "/products", element: _jsx(ProductsTab, {}) }), _jsx(Route, { path: "*", element: _jsx(DashboardOverview, {}) })] })] }));
}
