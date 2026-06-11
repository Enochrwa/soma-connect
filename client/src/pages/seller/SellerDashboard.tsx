import { useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  useGetMyStoreQuery,
  useGetSellerOrdersQuery,
  useGetSellerAnalyticsQuery,
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateOrderStatusMutation,
} from "../../app/api";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { formatRWF } from "../../utils/format";
import { ImageUploader } from "../../components/ui/ImageUploader";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  BarChart2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Truck,
  ChevronDown,
  AlertCircle,
  Loader2,
  Store,
} from "lucide-react";

// ── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { to: "/seller", end: true, icon: LayoutDashboard, label: "Overview" },
  { to: "/seller/products", icon: Package, label: "Products" },
  { to: "/seller/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/seller/analytics", icon: BarChart2, label: "Analytics" },
];

function SellerNav() {
  return (
    <nav className="flex gap-1 flex-wrap border-b border-forest/10 pb-4 mb-6">
      {NAV.map(({ to, end, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
             ${isActive ? "bg-forest text-saffron" : "text-slate/70 hover:bg-forest/5 hover:text-forest"}`
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: storeData, isLoading } = useGetMyStoreQuery();
  const { data: analytics } = useGetSellerAnalyticsQuery();

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );

  const seller = storeData?.seller;

  if (!seller) {
    return (
      <div className="text-center py-16">
        <Store size={48} className="text-forest/20 mx-auto mb-4" />
        <h2 className="font-display text-xl text-forest mb-2">No store yet</h2>
        <p className="text-slate/60 mb-4">You haven't applied to sell on SOMA Market yet.</p>
        <NavLink to="/account" className="btn-primary">
          Apply as Seller
        </NavLink>
      </div>
    );
  }

  // Show pending/rejected state
  if (seller.approvalStatus === "pending") {
    return (
      <div className="bg-saffron/10 border border-saffron/30 rounded-2xl p-6 text-center">
        <Clock size={40} className="text-saffron mx-auto mb-3" />
        <h2 className="font-display text-xl text-forest mb-2">Application under review</h2>
        <p className="text-slate/60 max-w-md mx-auto">
          Your store <strong>{seller.storeName}</strong> is pending admin approval. You'll receive
          an email once approved — usually within 24 hours.
        </p>
      </div>
    );
  }

  if (seller.approvalStatus === "rejected") {
    return (
      <div className="bg-vermillion/10 border border-vermillion/30 rounded-2xl p-6 text-center">
        <AlertCircle size={40} className="text-vermillion mx-auto mb-3" />
        <h2 className="font-display text-xl text-forest mb-2">Application not approved</h2>
        <p className="text-slate/60 max-w-md mx-auto">
          {seller.approvalNote ?? "Please contact support for more information."}
        </p>
      </div>
    );
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
      value: analytics ? `★ ${(analytics.rating || 0).toFixed(1)} (${analytics.ratingCount})` : "—",
    },
    { label: "Active products", value: analytics?.activeProducts ?? "—" },
    { label: "Total products", value: analytics?.totalProducts ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-card p-5 flex gap-4 items-start">
        {seller.logo && (
          <img
            src={seller.logo}
            alt={seller.storeName}
            className="w-16 h-16 rounded-xl object-cover"
          />
        )}
        <div>
          <h2 className="font-display text-xl text-forest">{seller.storeName}</h2>
          <p className="text-sm text-slate/60 mt-0.5">{seller.description}</p>
          <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full mt-1 inline-block capitalize">
            {seller.verificationTier}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-xs text-slate/50">{label}</p>
            <p className="font-display text-xl text-forest mt-1">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Products ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Food",
  "Health",
  "Home",
  "Agriculture",
  "Beauty",
  "Books",
  "Services",
];

function emptyForm() {
  return {
    title: "",
    description: "",
    category: "",
    price: "",
    comparePrice: "",
    stock: "",
    condition: "new" as "new" | "used",
    images: [] as string[],
    tags: "",
  };
}

function ProductsTab() {
  const { data: storeData } = useGetMyStoreQuery();
  const seller = storeData?.seller;
  const sellerId = seller && "_id" in seller ? (seller as { _id: string })._id : undefined;

  const { data, isLoading, refetch } = useListProductsQuery(sellerId ? { sellerId } : {}, {
    skip: !sellerId,
  });

  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");

  function openCreate() {
    setForm(emptyForm());
    setEditId(null);
    setShowForm(true);
    setFormError("");
  }

  function openEdit(p: Record<string, unknown>) {
    setForm({
      title: String(p.title ?? ""),
      description: String(p.description ?? ""),
      category: String(p.category ?? ""),
      price: String(p.price ?? ""),
      comparePrice: String(p.comparePrice ?? ""),
      stock: String(p.stock ?? ""),
      condition: (p.condition as "new" | "used") ?? "new",
      images: (p.images as string[]) ?? [],
      tags: ((p.tags as string[]) ?? []).join(", "),
    });
    setEditId(String(p._id));
    setShowForm(true);
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
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
      } else {
        await createProduct(payload).unwrap();
      }
      setShowForm(false);
      refetch();
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      setFormError(e?.data?.error ?? "Failed to save product.");
    }
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );

  const products = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-forest">My Products ({products.length})</h2>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Product Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <h3 className="font-display text-forest text-lg">
            {editId ? "Edit Product" : "New Product"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Title *</label>
                <input
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Product name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Category *</label>
                <select
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm bg-white"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Price (RWF) *</label>
                <input
                  type="number"
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="5000"
                  min={0}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">
                  Compare price (RWF)
                </label>
                <input
                  type="number"
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                  value={form.comparePrice}
                  onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
                  placeholder="Original price (optional)"
                  min={0}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Stock</label>
                <input
                  type="number"
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  min={0}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Condition</label>
                <select
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm bg-white"
                  value={form.condition}
                  onChange={(e) =>
                    setForm({ ...form, condition: e.target.value as "new" | "used" })
                  }
                >
                  <option value="new">New</option>
                  <option value="used">Used</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-forest block mb-1">Description</label>
              <textarea
                className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm h-28 resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your product..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-forest block mb-1">
                Tags (comma separated)
              </label>
              <input
                className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="electronics, phone, samsung"
              />
            </div>

            <ImageUploader
              value={form.images}
              onChange={(urls) => setForm({ ...form, images: urls })}
              label="Product images *"
            />

            {formError && (
              <p className="text-vermillion text-sm flex items-center gap-1">
                <AlertCircle size={14} /> {formError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || updating}
                className="btn-primary flex items-center gap-2"
              >
                {(creating || updating) && <Loader2 size={14} className="animate-spin" />}
                {editId ? "Save Changes" : "Create Product"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products list */}
      {products.length === 0 ? (
        <div className="text-center py-12 text-slate/50">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>No products yet. Create your first listing!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const prod = p as unknown as Record<string, unknown>;
            return (
              <div
                key={String(prod._id)}
                className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-4"
              >
                <img
                  src={(prod.images as string[])?.[0] ?? ""}
                  alt={String(prod.title)}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-slate/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-forest text-sm truncate">{String(prod.title)}</p>
                  <p className="text-xs text-slate/50">
                    {formatRWF(Number(prod.price))} · Stock: {String(prod.stock)}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      prod.isActive ? "bg-green-50 text-green-700" : "bg-slate/10 text-slate/50"
                    }`}
                  >
                    {prod.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(prod)}
                    className="p-2 hover:bg-forest/5 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={15} className="text-forest/60" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Remove this product from your store?")) {
                        await deleteProduct(String(prod._id));
                        refetch();
                      }
                    }}
                    className="p-2 hover:bg-vermillion/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} className="text-vermillion/60" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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

const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  payment_confirmed: "Payment confirmed",
  preparing: "Preparing",
  packed: "Packed",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
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
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleStatusChange(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      await updateStatus({ id: orderId, status: newStatus }).unwrap();
    } catch (e) {
      console.error("Status update failed", e);
    } finally {
      setUpdating(null);
    }
  }

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-forest">Orders ({data?.total ?? 0})</h2>
        <select
          className="border border-forest/20 rounded-lg px-3 py-1.5 text-sm bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-forest" size={24} />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-slate/50">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const o = order as unknown as Record<string, unknown>;
            const isExpanded = expandedId === String(o._id);
            return (
              <div key={String(o._id)} className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-forest/2"
                  onClick={() => setExpandedId(isExpanded ? null : String(o._id))}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-forest text-sm">
                        {String(o.orderNumber)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[String(o.status)] ?? "bg-slate/10 text-slate"}`}
                      >
                        {STATUS_LABELS[String(o.status)] ?? String(o.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate/50 mt-0.5">
                      {new Date(String(o.createdAt)).toLocaleDateString("en-RW")} ·{" "}
                      {formatRWF(Number(o.total))}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-forest/8 p-4 space-y-3">
                    {/* Items */}
                    <div className="space-y-2">
                      {(o.items as Array<Record<string, unknown>>).map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <img
                            src={String(item.image ?? "")}
                            alt={String(item.title)}
                            className="w-10 h-10 rounded-lg object-cover bg-slate/10"
                          />
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-forest">{String(item.title)}</p>
                            <p className="text-xs text-slate/50">
                              x{String(item.quantity)} · {formatRWF(Number(item.unitPrice))} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery address */}
                    <div className="text-xs text-slate/60 bg-slate/5 rounded-lg p-3">
                      <p className="font-medium text-forest mb-1">Delivery address</p>
                      <p>
                        {String((o.deliveryAddress as Record<string, unknown>)?.sector ?? "")},{" "}
                        {String((o.deliveryAddress as Record<string, unknown>)?.district ?? "")}
                      </p>
                      <p className="font-mono">
                        {String((o.deliveryAddress as Record<string, unknown>)?.phone ?? "")}
                      </p>
                    </div>

                    {/* Status update */}
                    {o.status !== "delivered" && o.status !== "cancelled" && (
                      <div className="flex flex-wrap gap-2">
                        {ORDER_STATUSES.filter((s) => !["placed", "cancelled"].includes(s)).map(
                          (s) => (
                            <button
                              key={s}
                              disabled={updating === String(o._id) || o.status === s}
                              onClick={() => handleStatusChange(String(o._id), s)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                o.status === s
                                  ? "bg-forest text-saffron border-forest"
                                  : "border-forest/20 text-forest hover:bg-forest/5"
                              }`}
                            >
                              {updating === String(o._id) ? (
                                <Loader2 size={10} className="animate-spin inline" />
                              ) : null}{" "}
                              {STATUS_LABELS[s]}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Analytics stub ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { data } = useGetSellerAnalyticsQuery();

  if (!data)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={24} />
      </div>
    );

  const metrics = [
    { label: "Total orders", value: data.totalOrders, icon: ShoppingBag },
    { label: "Pending", value: data.pendingOrders, icon: Clock },
    { label: "Revenue (30d)", value: formatRWF(data.revenueThisMonth), icon: BarChart2 },
    { label: "Rating", value: `★ ${(data.rating || 0).toFixed(1)}`, icon: CheckCircle },
    { label: "Active listings", value: data.activeProducts, icon: Package },
    { label: "Total listings", value: data.totalProducts, icon: Truck },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-forest">Store Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate/50">{label}</p>
              <Icon size={14} className="text-forest/30" />
            </div>
            <p className="font-display text-xl text-forest">{String(value)}</p>
          </div>
        ))}
      </div>
      <div className="bg-saffron/10 border border-saffron/30 rounded-2xl p-4 text-sm text-slate/70">
        Full revenue charts coming soon. Use the overview to monitor your store performance.
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function SellerDashboard() {
  const user = useAppSelector((s: RootState) => s.auth.user);
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl text-forest mb-6">Seller Dashboard</h1>
      <SellerNav />
      <Routes>
        <Route index element={<OverviewTab />} />
        <Route path="products" element={<ProductsTab />} />
        <Route path="orders" element={<OrdersTab />} />
        <Route path="analytics" element={<AnalyticsTab />} />
      </Routes>
    </div>
  );
}
