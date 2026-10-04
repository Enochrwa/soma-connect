import { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, Link } from "react-router-dom";
import {
  useGetMyStoreQuery,
  useGetSellerOrdersQuery,
  useGetSellerAnalyticsQuery,
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useAiEnhanceProductMutation,
  useUpdateOrderStatusMutation,
  useToggleHolidayModeMutation,
  useGetSellerLowStockQuery,
  useGetMyPayoutsQuery,
  useRequestPayoutMutation,
  useGetMyBalanceQuery,
  useGetMyEarningsQuery,
  useSetOrderTrackingMutation,
} from "../../app/api";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { setAuth } from "../../features/auth/authSlice";
import { formatRWF } from "../../utils/format";
import { ImageUploader } from "../../components/ui/ImageUploader";
import { BulkImportUploader } from "../../components/seller/BulkImportUploader";
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
  PalmtreeIcon,
  CreditCard,
  ExternalLink,
  AlertTriangle,
  UploadCloud,
  Sparkles,
} from "lucide-react";

// ── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { to: "/seller", end: true, icon: LayoutDashboard, label: "Overview" },
  { to: "/seller/products", icon: Package, label: "Products" },
  { to: "/seller/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/seller/payouts", icon: CreditCard, label: "Payouts" },
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
  const { data: storeData, isLoading, refetch } = useGetMyStoreQuery();
  const { data: analytics } = useGetSellerAnalyticsQuery();
  const { data: lowStockData } = useGetSellerLowStockQuery(5);
  const [toggleHoliday, { isLoading: toggling }] = useToggleHolidayModeMutation();

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
        <p className="text-slate/60 mb-4">You haven't applied to sell on OneAfricaShop yet.</p>
        <NavLink to="/seller/apply" className="btn-primary">
          Apply as Seller
        </NavLink>
      </div>
    );
  }

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
          {(seller as unknown as Record<string, string>).approvalNote ??
            "Please contact support for more information."}
        </p>
      </div>
    );
  }

  const stats = [
    { label: "Orders this month", value: analytics?.totalOrders ?? "—" },
    { label: "Pending orders", value: analytics?.pendingOrders ?? "—" },
    {
      label: "Earned this month (after commission)",
      value: analytics ? formatRWF(analytics.netThisMonth) : "—",
    },
    {
      label: "Store rating",
      value: analytics ? `★ ${(analytics.rating || 0).toFixed(1)} (${analytics.ratingCount})` : "—",
    },
    { label: "Active products", value: analytics?.activeProducts ?? "—" },
    { label: "Total products", value: analytics?.totalProducts ?? "—" },
  ];

  const lowStockProducts = lowStockData?.products ?? [];
  const sellerRecord = seller as unknown as Record<string, unknown>;

  return (
    <div className="space-y-6">
      {/* Store info + holiday toggle */}
      <div className="bg-white rounded-2xl shadow-card p-5 flex gap-4 items-start">
        {seller.logo && (
          <img
            src={seller.logo}
            alt={seller.storeName}
            className="w-16 h-16 rounded-xl object-cover"
          />
        )}
        <div className="flex-1">
          <h2 className="font-display text-xl text-forest">{seller.storeName}</h2>
          <p className="text-sm text-slate/60 mt-0.5">{seller.description}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full capitalize">
              {seller.verificationTier}
            </span>
            {Boolean(sellerRecord.holidayMode) && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                🌴 Holiday mode ON
              </span>
            )}
          </div>
        </div>
        <button
          onClick={async () => {
            await toggleHoliday();
            refetch();
          }}
          disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-colors ${
            sellerRecord.holidayMode
              ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
              : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
          }`}
        >
          {toggling ? <Loader2 size={13} className="animate-spin" /> : <PalmtreeIcon size={13} />}
          {sellerRecord.holidayMode ? "Re-open store" : "Enable holiday mode"}
        </button>
      </div>

      {/* Low stock alerts */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800 text-sm">
              Low Stock Alert ({lowStockProducts.length} items)
            </h3>
          </div>
          <div className="space-y-2">
            {lowStockProducts.map((p) => {
              const prod = p as unknown as Record<string, unknown>;
              return (
                <div key={String(prod._id)} className="flex items-center gap-3 text-sm">
                  <img
                    src={(prod.images as string[])?.[0] ?? ""}
                    alt={String(prod.title)}
                    className="w-8 h-8 rounded-lg object-cover bg-slate/10"
                  />
                  <span className="flex-1 text-amber-900 truncate">{String(prod.title)}</span>
                  <span className="font-mono text-amber-700 font-bold">
                    {String(prod.stock)} left
                  </span>
                  <Link to="/seller/products" className="text-xs text-amber-700 underline">
                    Update
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
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
  const [aiEnhance, { isLoading: enhancing }] = useAiEnhanceProductMutation();
  const [enhancingId, setEnhancingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);

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
      setFormError(
        (err as { data?: { error?: string } })?.data?.error ?? "Failed to save product.",
      );
    }
  }

  async function toggleActive(prod: Record<string, unknown>) {
    await updateProduct({ id: String(prod._id), isActive: !prod.isActive }).unwrap();
    refetch();
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-lg text-forest">My Products ({products.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowBulkImport((v) => !v);
              setShowForm(false);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-forest/20 text-forest text-sm hover:bg-forest/5 transition-colors"
          >
            <UploadCloud size={16} /> Bulk Import
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {showBulkImport && (
        <BulkImportUploader
          onDone={() => {
            setShowBulkImport(false);
            refetch();
          }}
        />
      )}

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
                  <button
                    onClick={() => toggleActive(prod)}
                    className={`text-xs px-2 py-0.5 rounded-full mt-1 border transition-colors ${prod.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-slate/10 text-slate/50 border-slate/20"}`}
                  >
                    {prod.isActive ? "Active" : "Inactive"} — click to toggle
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setEnhancingId(String(prod._id));
                      await aiEnhance(String(prod._id))
                        .unwrap()
                        .catch(() => null);
                      setEnhancingId(null);
                      refetch();
                    }}
                    disabled={enhancing && enhancingId === String(prod._id)}
                    className="p-2 hover:bg-saffron/10 rounded-lg transition-colors"
                    title="AI enhance (auto-fill description & tags)"
                  >
                    {enhancing && enhancingId === String(prod._id) ? (
                      <Loader2 size={15} className="animate-spin text-saffron/60" />
                    ) : (
                      <Sparkles size={15} className="text-saffron/60" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(prod)}
                    className="p-2 hover:bg-forest/5 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={15} className="text-forest/60" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Remove this product?")) {
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
  "picked_up",
  "out_for_delivery",
  "delivered",
  "cancelled",
];
// Same order the server enforces — orders only move forward.
const FLOW = [
  "payment_confirmed",
  "preparing",
  "packed",
  "picked_up",
  "out_for_delivery",
  "delivered",
];
const NEXT_STEPS = ["preparing", "packed", "picked_up", "out_for_delivery", "delivered"];
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
  const [setTracking, { isLoading: settingTracking }] = useSetOrderTrackingMutation();
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingMap, setTrackingMap] = useState<Record<string, { num: string; url: string }>>({});

  async function handleStatusChange(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      await updateStatus({ id: orderId, status: newStatus }).unwrap();
    } catch (e) {
      alert((e as { data?: { error?: string } }).data?.error ?? "Couldn't update the order.");
    } finally {
      setUpdating(null);
    }
  }

  async function handleSetTracking(orderId: string) {
    const t = trackingMap[orderId];
    if (!t) return;
    try {
      await setTracking({ id: orderId, trackingNumber: t.num, trackingUrl: t.url }).unwrap();
      alert("Tracking info saved!");
    } catch (e) {
      console.error(e);
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
            const tr = trackingMap[String(o._id)] ?? {
              num: String(o.trackingNumber ?? ""),
              url: String(o.trackingUrl ?? ""),
            };
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
                  <div className="border-t border-forest/8 p-4 space-y-4">
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
                              x{String(item.quantity)} · {formatRWF(Number(item.unitPrice))}
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

                    {/* Tracking info */}
                    {!["cancelled", "delivered"].includes(String(o.status)) && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-forest">Delivery tracking</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            placeholder="Tracking number"
                            value={tr.num}
                            onChange={(e) =>
                              setTrackingMap((m) => ({
                                ...m,
                                [String(o._id)]: { ...tr, num: e.target.value },
                              }))
                            }
                            className="border border-forest/15 rounded-lg px-3 py-1.5 text-sm font-mono"
                          />
                          <input
                            placeholder="Tracking URL (https://...)"
                            value={tr.url}
                            onChange={(e) =>
                              setTrackingMap((m) => ({
                                ...m,
                                [String(o._id)]: { ...tr, url: e.target.value },
                              }))
                            }
                            className="border border-forest/15 rounded-lg px-3 py-1.5 text-sm"
                          />
                        </div>
                        <button
                          onClick={() => handleSetTracking(String(o._id))}
                          disabled={settingTracking}
                          className="flex items-center gap-1.5 text-xs border border-forest/20 text-forest px-3 py-1.5 rounded-lg hover:bg-forest/5"
                        >
                          {settingTracking ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <ExternalLink size={11} />
                          )}
                          Save tracking info
                        </button>
                      </div>
                    )}

                    {/* Status update — only valid next steps are offered */}
                    {(() => {
                      const status = String(o.status);
                      const paymentOk = o.paymentStatus === "paid" || o.paymentMethod === "cod";
                      const multiSeller = (o.sellerIds as unknown[] | undefined)?.length
                        ? (o.sellerIds as unknown[]).length > 1
                        : false;
                      if (status === "delivered" || status === "cancelled") return null;
                      if (!paymentOk || status === "placed") {
                        return (
                          <p className="text-xs bg-saffron/10 text-saffron-dark rounded-lg px-3 py-2">
                            Waiting for payment confirmation before this order can be prepared.
                          </p>
                        );
                      }
                      const idx = FLOW.indexOf(status);
                      const next = NEXT_STEPS.filter(
                        (st) => FLOW.indexOf(st) > idx && !(st === "delivered" && multiSeller),
                      );
                      const canCancel =
                        !multiSeller &&
                        ["payment_confirmed", "preparing", "packed"].includes(status);
                      return (
                        <div className="flex flex-wrap gap-2">
                          {next.map((st) => (
                            <button
                              key={st}
                              disabled={updating === String(o._id)}
                              onClick={() => handleStatusChange(String(o._id), st)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-forest/20 text-forest hover:bg-forest/5 transition-colors"
                            >
                              {updating === String(o._id) ? (
                                <Loader2 size={10} className="animate-spin inline mr-0.5" />
                              ) : null}
                              Mark {STATUS_LABELS[st].toLowerCase()}
                            </button>
                          ))}
                          {multiSeller && (
                            <span className="text-xs text-slate/50">
                              Shared order — the final delivery confirmation is done by
                              OneAfricaShop.
                            </span>
                          )}
                          {canCancel && (
                            <button
                              disabled={updating === String(o._id)}
                              onClick={() => {
                                if (confirm("Cancel this order? The buyer will be refunded."))
                                  handleStatusChange(String(o._id), "cancelled");
                              }}
                              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Cancel order
                            </button>
                          )}
                        </div>
                      );
                    })()}
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

// ── Payouts ───────────────────────────────────────────────────────────────────

function PayoutsTab() {
  const { data, isLoading } = useGetMyPayoutsQuery();
  const { data: balanceData } = useGetMyBalanceQuery();
  const { data: earningsData } = useGetMyEarningsQuery();
  const [requestPayout, { isLoading: requesting }] = useRequestPayoutMutation();
  const [momoPhone, setMomoPhone] = useState("");
  const [reqError, setReqError] = useState("");
  const [reqSuccess, setReqSuccess] = useState("");

  const balance = balanceData?.balance;
  const phone = momoPhone || balanceData?.payoutPhone || "";
  const ratePct = Math.round((balance?.commissionRate ?? 0.1) * 1000) / 10;
  const canRequest = (balance?.available ?? 0) >= (balance?.minPayout ?? 1000);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setReqError("");
    setReqSuccess("");
    if (!phone.trim()) {
      setReqError("Enter your MoMo phone number.");
      return;
    }
    try {
      const result = await requestPayout({ momoPhone: phone.trim() }).unwrap();
      setReqSuccess(result.message ?? "Payout requested!");
    } catch (err: unknown) {
      setReqError(
        (err as { data?: { error?: string } }).data?.error ?? "Failed to request payout.",
      );
    }
  }

  const payouts = data?.payouts ?? [];
  const earnings = earningsData?.earnings ?? [];
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    processing: "bg-blue-50 text-blue-700",
    sent: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
    available: "bg-green-50 text-green-700",
    requested: "bg-blue-50 text-blue-700",
    paid: "bg-slate/10 text-slate",
    reversed: "bg-red-50 text-red-700",
  };

  const cards = balance
    ? [
        { label: "Available to withdraw", value: balance.available, tone: "text-green-700" },
        {
          label: `Clearing (${balance.holdDays}-day hold)`,
          value: balance.clearing,
          tone: "text-saffron",
        },
        { label: "In payout", value: balance.inPayout, tone: "text-blue-700" },
        { label: "Paid out", value: balance.paidOut, tone: "text-forest" },
        { label: "Coming from open orders", value: balance.upcoming, tone: "text-slate/70" },
        {
          label: `Commission paid (${ratePct}%)`,
          value: balance.totalCommission,
          tone: "text-slate/70",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg text-forest">Earnings &amp; payouts</h2>
      <p className="text-sm text-slate/60">
        OneAfricaShop keeps a {ratePct}% commission on item sales (delivery fees are yours to pass
        on, not commissionable). Earnings become withdrawable {balance?.holdDays ?? 2} day(s) after
        an order is delivered. Minimum payout: {formatRWF(balance?.minPayout ?? 1000)}.
      </p>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl shadow-card p-4">
              <p className="text-xs text-slate/50">{c.label}</p>
              <p className={`font-mono font-bold text-lg mt-1 ${c.tone}`}>{formatRWF(c.value)}</p>
            </div>
          ))}
        </div>
      )}
      {balance && balance.owed > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {formatRWF(balance.owed)} from refunded orders will be deducted from your next payout.
        </div>
      )}

      {/* Request payout */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <h3 className="font-semibold text-forest mb-3">Withdraw earnings</h3>
        <form onSubmit={handleRequest} className="flex gap-2">
          <input
            placeholder="MoMo phone (e.g. 0781234567)"
            value={phone}
            onChange={(e) => setMomoPhone(e.target.value)}
            className="flex-1 border border-forest/15 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={requesting || !canRequest}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {requesting ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
            Withdraw {balance ? formatRWF(balance.available) : ""}
          </button>
        </form>
        {!canRequest && balance && (
          <p className="text-xs text-slate/50 mt-2">
            You can withdraw once {formatRWF(balance.minPayout)} is available.
          </p>
        )}
        {reqError && <p className="text-vermillion text-xs mt-2">{reqError}</p>}
        {reqSuccess && <p className="text-green-700 text-xs mt-2">{reqSuccess}</p>}
      </div>

      {/* Per-order commission breakdown */}
      {earnings.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h3 className="font-semibold text-forest mb-3">Earnings by order</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate/50 border-b border-forest/8">
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3 text-right">Sales</th>
                  <th className="py-2 pr-3 text-right">Commission</th>
                  <th className="py-2 pr-3 text-right">You earn</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e) => (
                  <tr key={e._id} className="border-b border-forest/5 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{e.orderNumber}</td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {formatRWF(e.commissionBase)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-slate/60">
                      −{formatRWF(e.commission)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono font-bold text-forest">
                      {formatRWF(e.net)}
                    </td>
                    <td className="py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${statusColors[e.clawbackRequired ? "reversed" : e.status] ?? "bg-slate/10"}`}
                      >
                        {e.clawbackRequired
                          ? "refunded"
                          : e.onHold
                            ? "on hold (dispute)"
                            : e.status === "available" && new Date(e.availableAt) > new Date()
                              ? `clears ${new Date(e.availableAt).toLocaleDateString("en-RW")}`
                              : e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout history */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-forest" size={22} />
        </div>
      ) : payouts.length === 0 ? (
        <p className="text-slate/50 text-center py-8">No payout history yet.</p>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-forest">Payout history</h3>
          {payouts.map((p) => {
            const payout = p as unknown as Record<string, unknown>;
            return (
              <div key={String(payout._id)} className="bg-white rounded-2xl shadow-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-saffron text-lg">
                      {formatRWF(Number(payout.amount))}
                    </p>
                    <p className="text-xs text-slate/50">
                      Requested {new Date(String(payout.createdAt)).toLocaleDateString("en-RW")}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusColors[String(payout.status)] ?? "bg-slate/10"}`}
                  >
                    {String(payout.status)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate/50 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Sales: {formatRWF(Number(payout.grossAmount))}</span>
                  <span>Commission: −{formatRWF(Number(payout.commission))}</span>
                  {Number(payout.adjustments) > 0 && (
                    <span>Refund adjustments: −{formatRWF(Number(payout.adjustments))}</span>
                  )}
                  {payout.momoRef != null && (
                    <span>
                      Ref: <span className="font-mono">{String(payout.momoRef)}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────

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
    { label: "Sales (30d)", value: formatRWF(data.revenueThisMonth), icon: BarChart2 },
    { label: "Commission (30d)", value: formatRWF(data.commissionThisMonth), icon: BarChart2 },
    { label: "You earned (30d)", value: formatRWF(data.netThisMonth), icon: BarChart2 },
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
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function SellerDashboard() {
  const user = useAppSelector((s: RootState) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  // If the user's JWT still says "buyer" but they navigated to /seller,
  // they were likely just approved. Force a token refresh so the new
  // "seller" role is picked up from the DB without requiring a logout.
  useEffect(() => {
    if (user && user.role === "buyer") {
      setRefreshing(true);
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.accessToken && data.user) {
            dispatch(setAuth({ user: data.user, accessToken: data.accessToken }));
          }
        })
        .catch(() => {
          /* silently ignore — user may just need to re-login */
        })
        .finally(() => setRefreshing(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    navigate("/login");
    return null;
  }

  if (refreshing) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-3 text-slate/50">
        <Loader2 className="animate-spin" size={22} />
        <span className="text-sm">Loading your store…</span>
      </div>
    );
  }

  if (user.role === "buyer") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 gap-4">
        <AlertTriangle size={40} className="text-saffron" />
        <h2 className="font-display text-xl text-forest">Your seller account isn't active yet</h2>
        <p className="text-sm text-slate/60 max-w-sm">
          Your application may still be under review, or you need to sign out and back in to
          activate your seller role.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm"
        >
          Sign in again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl text-forest mb-6">Seller Dashboard</h1>
      <SellerNav />
      <Routes>
        <Route index element={<OverviewTab />} />
        <Route path="products" element={<ProductsTab />} />
        <Route path="orders" element={<OrdersTab />} />
        <Route path="payouts" element={<PayoutsTab />} />
        <Route path="analytics" element={<AnalyticsTab />} />
      </Routes>
    </div>
  );
}
