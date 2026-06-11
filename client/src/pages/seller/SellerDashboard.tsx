import { useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  useGetMyStoreQuery,
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useApplyAsSellerMutation,
  useGetMeQuery,
} from "../../app/api";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { formatRWF } from "../../utils/format";
import type { Product } from "../../types";
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  Eye,
  BarChart2,
  Store,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Upload,
  Tag,
  DollarSign,
  Layers,
} from "lucide-react";

// ── Onboarding form ──────────────────────────────────────────────────────────

function SellerOnboarding({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    storeName: "",
    description: "",
    accountType: "individual",
    sector: "Kigali",
  });
  const [apply, { isLoading }] = useApplyAsSellerMutation();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apply(form).unwrap();
      onDone();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      setError(msg ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-saffron rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-gold">
          <Store size={28} className="text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-forest">Open your store</h1>
        <p className="text-slate/60 mt-1 text-sm">
          Fill in your store details to start selling on SOMA
        </p>
      </div>
      {error && (
        <div className="bg-vermillion/10 border border-vermillion/20 text-vermillion rounded-xl px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
            Store name <span className="text-vermillion">*</span>
          </label>
          <input
            type="text"
            value={form.storeName}
            onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
            placeholder="e.g. Kigali Crafts"
            className="w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
            Store description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Tell customers about your store..."
            rows={3}
            className="w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
            Location (sector) <span className="text-vermillion">*</span>
          </label>
          <input
            type="text"
            value={form.sector}
            onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
            placeholder="e.g. Kigali, Remera"
            className="w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
            Account type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {["individual", "business", "farm"].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm((f) => ({ ...f, accountType: t }))}
                className={`border-2 rounded-xl py-3 text-sm font-medium capitalize transition ${
                  form.accountType === t
                    ? "border-forest bg-forest/5 text-forest"
                    : "border-forest/10 text-slate/60 hover:border-forest/25"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest-light transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          Create store
        </button>
      </form>
    </div>
  );
}

// ── Product form modal ───────────────────────────────────────────────────────

interface ProductFormProps {
  initial?: Partial<Product>;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  "electronics",
  "fashion",
  "home",
  "food",
  "beauty",
  "sports",
  "agriculture",
  "books",
  "other",
];

function ProductForm({ initial, onClose, onSaved }: ProductFormProps) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "electronics",
    price: initial?.price?.toString() ?? "",
    comparePrice: initial?.comparePrice?.toString() ?? "",
    stock: initial?.stock?.toString() ?? "0",
    condition: initial?.condition ?? "new",
    tags: initial?.tags?.join(", ") ?? "",
    images: initial?.images?.join("\n") ?? "",
  });
  const [error, setError] = useState("");

  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const isLoading = creating || updating;
  const isEdit = !!initial?._id;

  const field =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const images = form.images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!images.length) {
      setError("Please add at least one image URL.");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
      stock: Number(form.stock),
      condition: form.condition as "new" | "used",
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images,
    };

    try {
      if (isEdit) {
        await updateProduct({ id: initial!._id as string, ...payload }).unwrap();
      } else {
        await createProduct(payload).unwrap();
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      setError(msg ?? "Failed to save product.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-forest/8">
          <h2 className="font-display font-bold text-forest">
            {isEdit ? "Edit product" : "Add new product"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-forest/5 text-slate/50"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-vermillion/10 border border-vermillion/20 text-vermillion rounded-xl px-4 py-2.5 text-sm flex gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
              <Tag size={11} className="inline mr-1" /> Product title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={field("title")}
              required
              className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
              placeholder="e.g. Rwandan Hand-Woven Basket"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={field("description")}
              rows={3}
              className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 resize-none"
              placeholder="Describe your product..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                <Layers size={11} className="inline mr-1" /> Category *
              </label>
              <select
                value={form.category}
                onChange={field("category")}
                className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 bg-white capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                Condition
              </label>
              <select
                value={form.condition}
                onChange={field("condition")}
                className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 bg-white"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                <DollarSign size={11} className="inline mr-1" /> Price (RWF) *
              </label>
              <input
                type="number"
                value={form.price}
                onChange={field("price")}
                required
                min={1}
                className="w-full rounded-xl border border-forest/15 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 font-mono"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                Original price
              </label>
              <input
                type="number"
                value={form.comparePrice}
                onChange={field("comparePrice")}
                min={1}
                className="w-full rounded-xl border border-forest/15 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 font-mono"
                placeholder="7000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                Stock qty
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={field("stock")}
                min={0}
                className="w-full rounded-xl border border-forest/15 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 font-mono"
                placeholder="10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
              <Upload size={11} className="inline mr-1" /> Image URLs * (one per line)
            </label>
            <textarea
              value={form.images}
              onChange={field("images")}
              rows={3}
              className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 resize-none font-mono"
              placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={field("tags")}
              className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
              placeholder="handmade, rwandan, craft"
            />
          </div>
        </form>
        <div className="p-5 border-t border-forest/8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-forest/15 rounded-xl py-2.5 text-sm font-semibold text-slate/60 hover:bg-forest/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={isLoading}
            className="flex-1 bg-forest text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-forest-light transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={15} className="animate-spin" />}
            {isEdit ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Products tab ─────────────────────────────────────────────────────────────

function ProductsTab() {
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const { data, refetch } = useListProductsQuery({ limit: 50 });
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();

  function handleSaved() {
    refetch();
    setSuccess("Product saved successfully!");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleDelete(id: string) {
    try {
      await deleteProduct(id).unwrap();
      setDeleteId(null);
      refetch();
      setSuccess("Product removed from store.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      /* */
    }
  }

  return (
    <div>
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
          <CheckCircle size={15} /> {success}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-forest">My Products</h2>
        <button
          onClick={() => {
            setEditProduct(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-forest text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-forest-light transition"
        >
          <Plus size={16} /> Add product
        </button>
      </div>

      {!data?.items?.length ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-card">
          <Package className="text-forest/20 mx-auto mb-3" size={40} />
          <p className="text-slate/50 mb-4">You haven't added any products yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-forest text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-forest-light transition text-sm"
          >
            Add your first product
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((p) => (
            <div
              key={p._id}
              className="bg-white rounded-2xl shadow-card p-4 flex gap-4 items-center"
            >
              <img
                src={p.images?.[0] ?? "/placeholder.png"}
                alt={p.title}
                className="w-14 h-14 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-forest line-clamp-1">{p.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-saffron font-bold text-sm">
                    {formatRWF(p.price)}
                  </span>
                  <span className="text-xs text-slate/40">{p.stock} in stock</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-50 text-green-700" : "bg-slate/10 text-slate/50"}`}
                  >
                    {p.isActive ? "Active" : "Hidden"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/products/${p._id}`}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-forest/15 text-slate/50 hover:text-forest hover:border-forest/30 transition"
                  title="View"
                >
                  <Eye size={14} />
                </Link>
                <button
                  onClick={() => {
                    setEditProduct(p);
                    setShowForm(true);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-forest/15 text-slate/50 hover:text-forest hover:border-forest/30 transition"
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(p._id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-vermillion/20 text-vermillion/60 hover:text-vermillion hover:border-vermillion/40 transition"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product form modal */}
      {showForm && (
        <ProductForm
          initial={editProduct ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditProduct(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card-hover p-6 w-full max-w-sm text-center">
            <Trash2 className="text-vermillion mx-auto mb-3" size={32} />
            <h3 className="font-display font-bold text-forest mb-2">Remove product?</h3>
            <p className="text-sm text-slate/60 mb-5">
              This will hide the product from your store. You can re-activate it later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-forest/15 rounded-xl py-2.5 text-sm font-semibold hover:bg-forest/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="flex-1 bg-vermillion text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  seller,
}: {
  seller: { storeName: string; rating: number; totalSales: number; verificationTier: string };
}) {
  const { data: productsData } = useListProductsQuery({ limit: 4 });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Sales", value: seller.totalSales, suffix: "" },
          { label: "Products", value: productsData?.total ?? 0, suffix: "" },
          { label: "Rating", value: seller.rating?.toFixed(1) ?? "—", suffix: "/ 5" },
          { label: "Tier", value: seller.verificationTier, suffix: "" },
        ].map(({ label, value, suffix }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card p-4 text-center">
            <div className="font-display text-2xl font-bold text-forest">
              {value}
              {suffix}
            </div>
            <div className="text-xs text-slate/50 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent products */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-forest">Recent products</h3>
          <Link to="/seller/products" className="text-sm text-saffron hover:underline">
            Manage all
          </Link>
        </div>
        {!productsData?.items?.length ? (
          <div className="text-center py-8 bg-white rounded-2xl shadow-card">
            <p className="text-slate/40 text-sm">No products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {productsData.items.slice(0, 4).map((p) => (
              <div key={p._id} className="bg-white rounded-xl shadow-card overflow-hidden">
                <img
                  src={p.images?.[0]}
                  alt={p.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-2">
                  <p className="text-xs font-semibold text-forest line-clamp-1">{p.title}</p>
                  <p className="font-mono text-xs text-saffron font-bold mt-0.5">
                    {formatRWF(p.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export default function SellerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector((s: RootState) => s.auth.user);
  useGetMeQuery(undefined, { skip: !user });
  const { data: storeData, isLoading, refetch } = useGetMyStoreQuery(undefined, { skip: !user });

  const activeTab = location.pathname.includes("products") ? "products" : "overview";

  if (!user) {
    navigate("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );
  }

  // No seller profile yet — show onboarding
  if (!storeData?.seller) {
    return <SellerOnboarding onDone={() => refetch()} />;
  }

  const seller = storeData.seller;

  const NAV = [
    { path: "/seller", label: "Overview", icon: BarChart2 },
    { path: "/seller/products", label: "Products", icon: Package },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-forest rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-saffron/20 flex items-center justify-center text-saffron font-bold text-xl font-display shrink-0">
          {seller.storeName?.[0]?.toUpperCase() ?? "S"}
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-white">{seller.storeName}</h1>
          <p className="text-white/50 text-sm capitalize">
            {seller.accountType} · {seller.verificationTier}
          </p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2">
          <Link
            to={`/sellers/${seller.storeSlug}`}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white border border-white/15 px-3 py-1.5 rounded-lg transition"
          >
            <Eye size={14} /> View store
          </Link>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-forest/5 rounded-xl p-1 mb-6 w-fit">
        {NAV.map(({ path, label, icon: Icon }) => {
          const isActive = activeTab === (path.includes("products") ? "products" : "overview");
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive ? "bg-white text-forest shadow-card" : "text-slate/60 hover:text-forest"
              }`}
            >
              <Icon size={15} /> {label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <Routes>
        <Route path="/" element={<OverviewTab seller={seller} />} />
        <Route path="/products" element={<ProductsTab />} />
        <Route path="*" element={<OverviewTab seller={seller} />} />
      </Routes>
    </div>
  );
}
