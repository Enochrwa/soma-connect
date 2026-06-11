import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useGetMyStoreQuery, useGetSellerOrdersQuery, useGetSellerAnalyticsQuery, useListProductsQuery, useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation, useUpdateOrderStatusMutation, } from "../../app/api";
import { useAppSelector } from "../../app/hooks";
import { formatRWF } from "../../utils/format";
import { ImageUploader } from "../../components/ui/ImageUploader";
import { LayoutDashboard, Package, ShoppingBag, BarChart2, Plus, Edit2, Trash2, CheckCircle, Clock, Truck, ChevronDown, AlertCircle, Loader2, Store, } from "lucide-react";
// ── Nav ──────────────────────────────────────────────────────────────────────
const NAV = [
    { to: "/seller", end: true, icon: LayoutDashboard, label: "Overview" },
    { to: "/seller/products", icon: Package, label: "Products" },
    { to: "/seller/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/seller/analytics", icon: BarChart2, label: "Analytics" },
];
function SellerNav() {
    return (_jsx("nav", { className: "flex gap-1 flex-wrap border-b border-forest/10 pb-4 mb-6", children: NAV.map(({ to, end, icon: Icon, label }) => (_jsxs(NavLink, { to: to, end: end, className: ({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
             ${isActive ? "bg-forest text-saffron" : "text-slate/70 hover:bg-forest/5 hover:text-forest"}`, children: [_jsx(Icon, { size: 16 }), label] }, to))) }));
}
// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab() {
    const { data: storeData, isLoading } = useGetMyStoreQuery();
    const { data: analytics } = useGetSellerAnalyticsQuery();
    if (isLoading)
        return (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 28 }) }));
    const seller = storeData?.seller;
    if (!seller) {
        return (_jsxs("div", { className: "text-center py-16", children: [_jsx(Store, { size: 48, className: "text-forest/20 mx-auto mb-4" }), _jsx("h2", { className: "font-display text-xl text-forest mb-2", children: "No store yet" }), _jsx("p", { className: "text-slate/60 mb-4", children: "You haven't applied to sell on SOMA Market yet." }), _jsx(NavLink, { to: "/account", className: "btn-primary", children: "Apply as Seller" })] }));
    }
    // Show pending/rejected state
    if (seller.approvalStatus === "pending") {
        return (_jsxs("div", { className: "bg-saffron/10 border border-saffron/30 rounded-2xl p-6 text-center", children: [_jsx(Clock, { size: 40, className: "text-saffron mx-auto mb-3" }), _jsx("h2", { className: "font-display text-xl text-forest mb-2", children: "Application under review" }), _jsxs("p", { className: "text-slate/60 max-w-md mx-auto", children: ["Your store ", _jsx("strong", { children: seller.storeName }), " is pending admin approval. You'll receive an email once approved \u2014 usually within 24 hours."] })] }));
    }
    if (seller.approvalStatus === "rejected") {
        return (_jsxs("div", { className: "bg-vermillion/10 border border-vermillion/30 rounded-2xl p-6 text-center", children: [_jsx(AlertCircle, { size: 40, className: "text-vermillion mx-auto mb-3" }), _jsx("h2", { className: "font-display text-xl text-forest mb-2", children: "Application not approved" }), _jsx("p", { className: "text-slate/60 max-w-md mx-auto", children: seller.approvalNote ?? "Please contact support for more information." })] }));
    }
    const stats = [
        { label: "Orders this month", value: analytics?.totalOrders ?? "—" },
        { label: "Pending orders", value: analytics?.pendingOrders ?? "—" },
        {
            label: "Revenue this month",
            value: analytics ? formatRWF(analytics.revenueThisMonth) : "—",
        },
        {
            label: "Store rating",
            value: analytics
                ? `★ ${(analytics.rating || 0).toFixed(1)} (${analytics.ratingCount})`
                : "—",
        },
        { label: "Active products", value: analytics?.activeProducts ?? "—" },
        { label: "Total products", value: analytics?.totalProducts ?? "—" },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5 flex gap-4 items-start", children: [seller.logo && (_jsx("img", { src: seller.logo, alt: seller.storeName, className: "w-16 h-16 rounded-xl object-cover" })), _jsxs("div", { children: [_jsx("h2", { className: "font-display text-xl text-forest", children: seller.storeName }), _jsx("p", { className: "text-sm text-slate/60 mt-0.5", children: seller.description }), _jsx("span", { className: "text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full mt-1 inline-block capitalize", children: seller.verificationTier })] })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: stats.map(({ label, value }) => (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-4", children: [_jsx("p", { className: "text-xs text-slate/50", children: label }), _jsx("p", { className: "font-display text-xl text-forest mt-1", children: String(value) })] }, label))) })] }));
}
// ── Products ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
    "Electronics", "Fashion", "Food", "Health", "Home", "Agriculture", "Beauty", "Books", "Services",
];
function emptyForm() {
    return {
        title: "",
        description: "",
        category: "",
        price: "",
        comparePrice: "",
        stock: "",
        condition: "new",
        images: [],
        tags: "",
    };
}
function ProductsTab() {
    const { data: storeData } = useGetMyStoreQuery();
    const seller = storeData?.seller;
    const sellerId = seller && "_id" in seller ? seller._id : undefined;
    const { data, isLoading, refetch } = useListProductsQuery(sellerId ? { sellerId } : {}, { skip: !sellerId });
    const [createProduct, { isLoading: creating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
    const [deleteProduct] = useDeleteProductMutation();
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [formError, setFormError] = useState("");
    function openCreate() {
        setForm(emptyForm());
        setEditId(null);
        setShowForm(true);
        setFormError("");
    }
    function openEdit(p) {
        setForm({
            title: String(p.title ?? ""),
            description: String(p.description ?? ""),
            category: String(p.category ?? ""),
            price: String(p.price ?? ""),
            comparePrice: String(p.comparePrice ?? ""),
            stock: String(p.stock ?? ""),
            condition: p.condition ?? "new",
            images: p.images ?? [],
            tags: (p.tags ?? []).join(", "),
        });
        setEditId(String(p._id));
        setShowForm(true);
        setFormError("");
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setFormError("");
        if (!form.title || !form.category || !form.price) {
            setFormError("Title, category and price are required.");
            return;
        }
        if (form.images.length === 0) {
            setFormError("Please upload at least one image.");
            return;
        }
        const payload = {
            title: form.title,
            description: form.description,
            category: form.category,
            price: Number(form.price),
            comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
            stock: Number(form.stock || 0),
            condition: form.condition,
            images: form.images,
            tags: form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
        };
        try {
            if (editId) {
                await updateProduct({ id: editId, ...payload }).unwrap();
            }
            else {
                await createProduct(payload).unwrap();
            }
            setShowForm(false);
            refetch();
        }
        catch (err) {
            const e = err;
            setFormError(e?.data?.error ?? "Failed to save product.");
        }
    }
    if (isLoading)
        return (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 28 }) }));
    const products = data?.items ?? [];
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "font-display text-lg text-forest", children: ["My Products (", products.length, ")"] }), _jsxs("button", { onClick: openCreate, className: "btn-primary flex items-center gap-2", children: [_jsx(Plus, { size: 16 }), " Add Product"] })] }), showForm && (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-6 space-y-4", children: [_jsx("h3", { className: "font-display text-forest text-lg", children: editId ? "Edit Product" : "New Product" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-forest block mb-1", children: "Title *" }), _jsx("input", { className: "w-full border border-forest/20 rounded-lg px-3 py-2 text-sm", value: form.title, onChange: (e) => setForm({ ...form, title: e.target.value }), placeholder: "Product name" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-forest block mb-1", children: "Category *" }), _jsxs("select", { className: "w-full border border-forest/20 rounded-lg px-3 py-2 text-sm bg-white", value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }), children: [_jsx("option", { value: "", children: "Select category" }), CATEGORIES.map((c) => (_jsx("option", { value: c, children: c }, c)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-forest block mb-1", children: "Price (RWF) *" }), _jsx("input", { type: "number", className: "w-full border border-forest/20 rounded-lg px-3 py-2 text-sm", value: form.price, onChange: (e) => setForm({ ...form, price: e.target.value }), placeholder: "5000", min: 0 })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-forest block mb-1", children: "Compare price (RWF)" }), _jsx("input", { type: "number", className: "w-full border border-forest/20 rounded-lg px-3 py-2 text-sm", value: form.comparePrice, onChange: (e) => setForm({ ...form, comparePrice: e.target.value }), placeholder: "Original price (optional)", min: 0 })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-forest block mb-1", children: "Stock" }), _jsx("input", { type: "number", className: "w-full border border-forest/20 rounded-lg px-3 py-2 text-sm", value: form.stock, onChange: (e) => setForm({ ...form, stock: e.target.value }), min: 0 })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-forest block mb-1", children: "Condition" }), _jsxs("select", { className: "w-full border border-forest/20 rounded-lg px-3 py-2 text-sm bg-white", value: form.condition, onChange: (e) => setForm({ ...form, condition: e.target.value }), children: [_jsx("option", { value: "new", children: "New" }), _jsx("option", { value: "used", children: "Used" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-forest block mb-1", children: "Description" }), _jsx("textarea", { className: "w-full border border-forest/20 rounded-lg px-3 py-2 text-sm h-28 resize-none", value: form.description, onChange: (e) => setForm({ ...form, description: e.target.value }), placeholder: "Describe your product..." })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-forest block mb-1", children: "Tags (comma separated)" }), _jsx("input", { className: "w-full border border-forest/20 rounded-lg px-3 py-2 text-sm", value: form.tags, onChange: (e) => setForm({ ...form, tags: e.target.value }), placeholder: "electronics, phone, samsung" })] }), _jsx(ImageUploader, { value: form.images, onChange: (urls) => setForm({ ...form, images: urls }), label: "Product images *" }), formError && (_jsxs("p", { className: "text-vermillion text-sm flex items-center gap-1", children: [_jsx(AlertCircle, { size: 14 }), " ", formError] })), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { type: "submit", disabled: creating || updating, className: "btn-primary flex items-center gap-2", children: [(creating || updating) && _jsx(Loader2, { size: 14, className: "animate-spin" }), editId ? "Save Changes" : "Create Product"] }), _jsx("button", { type: "button", onClick: () => setShowForm(false), className: "btn-ghost", children: "Cancel" })] })] })] })), products.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-slate/50", children: [_jsx(Package, { size: 40, className: "mx-auto mb-3 opacity-30" }), _jsx("p", { children: "No products yet. Create your first listing!" })] })) : (_jsx("div", { className: "space-y-3", children: products.map((p) => {
                    const prod = p;
                    return (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-4 flex items-center gap-4", children: [_jsx("img", { src: prod.images?.[0] ?? "", alt: String(prod.title), className: "w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-slate/10" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-semibold text-forest text-sm truncate", children: String(prod.title) }), _jsxs("p", { className: "text-xs text-slate/50", children: [formatRWF(Number(prod.price)), " \u00B7 Stock: ", String(prod.stock)] }), _jsx("span", { className: `text-xs px-2 py-0.5 rounded-full ${prod.isActive ? "bg-green-50 text-green-700" : "bg-slate/10 text-slate/50"}`, children: prod.isActive ? "Active" : "Inactive" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => openEdit(prod), className: "p-2 hover:bg-forest/5 rounded-lg transition-colors", title: "Edit", children: _jsx(Edit2, { size: 15, className: "text-forest/60" }) }), _jsx("button", { onClick: async () => {
                                            if (confirm("Remove this product from your store?")) {
                                                await deleteProduct(String(prod._id));
                                                refetch();
                                            }
                                        }, className: "p-2 hover:bg-vermillion/10 rounded-lg transition-colors", title: "Delete", children: _jsx(Trash2, { size: 15, className: "text-vermillion/60" }) })] })] }, String(prod._id)));
                }) }))] }));
}
// ── Orders ───────────────────────────────────────────────────────────────────
const ORDER_STATUSES = [
    "placed",
    "payment_confirmed",
    "preparing",
    "packed",
    "out_for_delivery",
    "delivered",
    "cancelled",
];
const STATUS_LABELS = {
    placed: "Placed",
    payment_confirmed: "Payment confirmed",
    preparing: "Preparing",
    packed: "Packed",
    picked_up: "Picked up",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
};
const STATUS_COLORS = {
    placed: "bg-blue-50 text-blue-700",
    payment_confirmed: "bg-green-50 text-green-700",
    preparing: "bg-saffron/15 text-saffron-dark",
    packed: "bg-purple-50 text-purple-700",
    out_for_delivery: "bg-orange-50 text-orange-700",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-50 text-red-700",
};
function OrdersTab() {
    const [statusFilter, setStatusFilter] = useState("");
    const { data, isLoading } = useGetSellerOrdersQuery({ status: statusFilter || undefined });
    const [updateStatus] = useUpdateOrderStatusMutation();
    const [updating, setUpdating] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    async function handleStatusChange(orderId, newStatus) {
        setUpdating(orderId);
        try {
            await updateStatus({ id: orderId, status: newStatus }).unwrap();
        }
        catch (e) {
            console.error("Status update failed", e);
        }
        finally {
            setUpdating(null);
        }
    }
    const orders = data?.orders ?? [];
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "font-display text-lg text-forest", children: ["Orders (", data?.total ?? 0, ")"] }), _jsxs("select", { className: "border border-forest/20 rounded-lg px-3 py-1.5 text-sm bg-white", value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), children: [_jsx("option", { value: "", children: "All statuses" }), ORDER_STATUSES.map((s) => (_jsx("option", { value: s, children: STATUS_LABELS[s] }, s)))] })] }), isLoading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 24 }) })) : orders.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-slate/50", children: [_jsx(ShoppingBag, { size: 40, className: "mx-auto mb-3 opacity-30" }), _jsx("p", { children: "No orders yet." })] })) : (_jsx("div", { className: "space-y-3", children: orders.map((order) => {
                    const o = order;
                    const isExpanded = expandedId === String(o._id);
                    return (_jsxs("div", { className: "bg-white rounded-2xl shadow-card overflow-hidden", children: [_jsxs("div", { className: "p-4 flex items-center gap-3 cursor-pointer hover:bg-forest/2", onClick: () => setExpandedId(isExpanded ? null : String(o._id)), children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "font-mono font-bold text-forest text-sm", children: String(o.orderNumber) }), _jsx("span", { className: `text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[String(o.status)] ?? "bg-slate/10 text-slate"}`, children: STATUS_LABELS[String(o.status)] ?? String(o.status) })] }), _jsxs("p", { className: "text-xs text-slate/50 mt-0.5", children: [new Date(String(o.createdAt)).toLocaleDateString("en-RW"), " \u00B7", " ", formatRWF(Number(o.total))] })] }), _jsx(ChevronDown, { size: 16, className: `text-slate/40 transition-transform ${isExpanded ? "rotate-180" : ""}` })] }), isExpanded && (_jsxs("div", { className: "border-t border-forest/8 p-4 space-y-3", children: [_jsx("div", { className: "space-y-2", children: o.items.map((item, i) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: String(item.image ?? ""), alt: String(item.title), className: "w-10 h-10 rounded-lg object-cover bg-slate/10" }), _jsxs("div", { className: "flex-1 text-sm", children: [_jsx("p", { className: "font-medium text-forest", children: String(item.title) }), _jsxs("p", { className: "text-xs text-slate/50", children: ["x", String(item.quantity), " \u00B7 ", formatRWF(Number(item.unitPrice)), " each"] })] })] }, i))) }), _jsxs("div", { className: "text-xs text-slate/60 bg-slate/5 rounded-lg p-3", children: [_jsx("p", { className: "font-medium text-forest mb-1", children: "Delivery address" }), _jsxs("p", { children: [String(o.deliveryAddress?.sector ?? ""), ",", " ", String(o.deliveryAddress?.district ?? "")] }), _jsx("p", { className: "font-mono", children: String(o.deliveryAddress?.phone ?? "") })] }), o.status !== "delivered" && o.status !== "cancelled" && (_jsx("div", { className: "flex flex-wrap gap-2", children: ORDER_STATUSES.filter((s) => !["placed", "cancelled"].includes(s)).map((s) => (_jsxs("button", { disabled: updating === String(o._id) || o.status === s, onClick: () => handleStatusChange(String(o._id), s), className: `text-xs px-3 py-1.5 rounded-lg border transition-colors ${o.status === s
                                                ? "bg-forest text-saffron border-forest"
                                                : "border-forest/20 text-forest hover:bg-forest/5"}`, children: [updating === String(o._id) ? (_jsx(Loader2, { size: 10, className: "animate-spin inline" })) : null, " ", STATUS_LABELS[s]] }, s))) }))] }))] }, String(o._id)));
                }) }))] }));
}
// ── Analytics stub ───────────────────────────────────────────────────────────
function AnalyticsTab() {
    const { data } = useGetSellerAnalyticsQuery();
    if (!data)
        return (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 24 }) }));
    const metrics = [
        { label: "Total orders", value: data.totalOrders, icon: ShoppingBag },
        { label: "Pending", value: data.pendingOrders, icon: Clock },
        { label: "Revenue (30d)", value: formatRWF(data.revenueThisMonth), icon: BarChart2 },
        { label: "Rating", value: `★ ${(data.rating || 0).toFixed(1)}`, icon: CheckCircle },
        { label: "Active listings", value: data.activeProducts, icon: Package },
        { label: "Total listings", value: data.totalProducts, icon: Truck },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "font-display text-lg text-forest", children: "Store Analytics" }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: metrics.map(({ label, value, icon: Icon }) => (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("p", { className: "text-xs text-slate/50", children: label }), _jsx(Icon, { size: 14, className: "text-forest/30" })] }), _jsx("p", { className: "font-display text-xl text-forest", children: String(value) })] }, label))) }), _jsx("div", { className: "bg-saffron/10 border border-saffron/30 rounded-2xl p-4 text-sm text-slate/70", children: "Full revenue charts coming soon. Use the overview to monitor your store performance." })] }));
}
// ── Root ─────────────────────────────────────────────────────────────────────
export default function SellerDashboard() {
    const user = useAppSelector((s) => s.auth.user);
    const navigate = useNavigate();
    if (!user) {
        navigate("/login");
        return null;
    }
    return (_jsxs("div", { className: "mx-auto max-w-5xl px-4 py-8", children: [_jsx("h1", { className: "font-display text-3xl text-forest mb-6", children: "Seller Dashboard" }), _jsx(SellerNav, {}), _jsxs(Routes, { children: [_jsx(Route, { index: true, element: _jsx(OverviewTab, {}) }), _jsx(Route, { path: "products", element: _jsx(ProductsTab, {}) }), _jsx(Route, { path: "orders", element: _jsx(OrdersTab, {}) }), _jsx(Route, { path: "analytics", element: _jsx(AnalyticsTab, {}) })] })] }));
}
