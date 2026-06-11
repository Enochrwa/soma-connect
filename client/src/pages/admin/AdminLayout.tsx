import { useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import {
  useAdminDashboardQuery,
  useAdminUsersQuery,
  useAdminSellersQuery,
  useAdminRevenueAnalyticsQuery,
  useAdminUpdateSellerTierMutation,
  useAdminApproveSellerMutation,
  useAdminPendingSellersQuery,
  useListProductsQuery,
  useDeleteProductMutation,
  useUpdateProductMutation,
} from "../../app/api";
import { formatRWF } from "../../utils/format";
import type { OrderStatus } from "../../types";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  TrendingUp,
  Loader2,
  Shield,
  Edit3,
  Trash2,
  CheckCircle,
  X,
} from "lucide-react";

const STATUS_LABELS: Record<OrderStatus, string> = {
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
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {STAT_CARDS.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card p-5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${color}`}
            >
              {icon}
            </div>
            <div className="font-display text-2xl font-bold text-forest">{value}</div>
            <div className="text-xs text-slate/50 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {revenue?.data?.length ? (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h3 className="font-display font-bold text-forest mb-4 flex items-center gap-2">
            <TrendingUp size={17} /> Revenue (last 30 days)
          </h3>
          <div className="flex items-end gap-1 h-32">
            {revenue.data.slice(-20).map((d, i) => {
              const max = Math.max(...revenue.data.map((x) => x.revenue));
              const pct = max > 0 ? (d.revenue / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full bg-forest/100 rounded-t hover:bg-saffron transition"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  <div className="absolute bottom-full mb-1 bg-forest text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                    {d._id}: {formatRWF(d.revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Recent orders */}
      {data?.recentOrders?.length ? (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h3 className="font-display font-bold text-forest mb-4">Recent Orders</h3>
          <div className="space-y-2">
            {data.recentOrders.slice(0, 8).map((order) => (
              <div
                key={order._id}
                className="flex items-center justify-between py-2 border-b border-forest/5 last:border-0"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-forest">
                    {order.orderNumber}
                  </span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.status === "delivered"
                        ? "bg-green-50 text-green-700"
                        : order.status === "cancelled"
                          ? "bg-vermillion/10 text-vermillion"
                          : "bg-saffron/10 text-saffron-dark"
                    }`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-saffron">
                  {formatRWF(order.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const { data, isLoading } = useAdminUsersQuery({ q: q || undefined, role: role || undefined });

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users..."
          className="flex-1 rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none bg-white"
        >
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-forest" size={24} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-forest/5">
              <tr>
                {["Name", "Phone", "Email", "Role", "Points", "Joined"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate/60 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-forest/5">
              {(data?.users ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-forest/5 transition">
                  <td className="px-4 py-3 font-medium text-forest">{u.profile?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate/60">{u.phone}</td>
                  <td className="px-4 py-3 text-slate/60 text-xs">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        u.role === "admin"
                          ? "bg-vermillion/10 text-vermillion"
                          : u.role === "seller"
                            ? "bg-saffron/15 text-saffron-dark"
                            : "bg-forest/10 text-forest"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate/50">{u.loyaltyPoints ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-slate/40">—</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.users?.length && (
            <div className="text-center py-8 text-slate/40 text-sm">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sellers tab ──────────────────────────────────────────────────────────────
function SellersTab() {
  const { data, isLoading, refetch } = useAdminSellersQuery({});
  const { data: pendingData } = useAdminPendingSellersQuery();
  const [updateTier] = useAdminUpdateSellerTierMutation();
  const [approveSeller, { isLoading: approving }] = useAdminApproveSellerMutation();
  const [editId, setEditId] = useState<string | null>(null);
  const [tierVal, setTierVal] = useState("");
  const [approvalModal, setApprovalModal] = useState<{
    id: string;
    name: string;
    action: "approved" | "rejected";
  } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function saveTier(id: string) {
    await updateTier({ id, tier: tierVal }).unwrap();
    setEditId(null);
  }

  async function handleApproval() {
    if (!approvalModal) return;
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

  return (
    <div className="space-y-6">
      {/* Pending approvals */}
      {pendingSellers.length > 0 && (
        <div>
          <h3 className="font-display text-forest font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-saffron text-white rounded-full text-xs flex items-center justify-center font-bold">
              {pendingSellers.length}
            </span>
            Pending Approval
          </h3>
          <div className="space-y-3">
            {pendingSellers.map((s) => (
              <div
                key={s._id}
                className="bg-saffron/5 border border-saffron/25 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-saffron/20 flex items-center justify-center text-saffron font-bold shrink-0 text-lg">
                  {s.storeName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-forest">{s.storeName}</div>
                  <div className="text-xs text-slate/60 capitalize mt-0.5">
                    {s.accountType} · {s.location?.sector}
                  </div>
                  {s.description && (
                    <div className="text-xs text-slate/50 mt-0.5 line-clamp-1">{s.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      setApprovalModal({ id: s._id, name: s.storeName, action: "approved" })
                    }
                    className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
                  >
                    <CheckCircle size={12} /> Approve
                  </button>
                  <button
                    onClick={() =>
                      setApprovalModal({ id: s._id, name: s.storeName, action: "rejected" })
                    }
                    className="flex items-center gap-1.5 text-xs bg-vermillion/10 text-vermillion px-3 py-1.5 rounded-lg hover:bg-vermillion/20 transition"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All sellers */}
      <div>
        <h3 className="font-display text-forest font-bold mb-3">All Sellers</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-forest" size={24} />
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.sellers ?? []).map((s) => (
              <div
                key={s._id}
                className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-saffron font-bold shrink-0">
                  {s.storeName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-forest">{s.storeName}</div>
                  <div className="text-xs text-slate/50 capitalize">
                    {s.accountType} · {s.totalSales ?? 0} sales · ★ {s.rating?.toFixed(1) ?? "—"}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block font-medium ${
                      s.approvalStatus === "approved"
                        ? "bg-green-50 text-green-700"
                        : s.approvalStatus === "rejected"
                          ? "bg-vermillion/10 text-vermillion"
                          : "bg-saffron/10 text-saffron-dark"
                    }`}
                  >
                    {s.approvalStatus ?? "pending"}
                  </span>
                </div>
                {editId === s._id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={tierVal}
                      onChange={(e) => setTierVal(e.target.value)}
                      className="text-xs rounded-lg border border-forest/15 px-2 py-1.5 bg-white focus:outline-none"
                    >
                      {["basic", "trusted", "verified", "top_seller"].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => saveTier(s._id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="text-slate/40 hover:text-slate"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-forest/10 text-forest px-2.5 py-1 rounded-full font-semibold capitalize">
                      {s.verificationTier}
                    </span>
                    <button
                      onClick={() => {
                        setEditId(s._id);
                        setTierVal(s.verificationTier);
                      }}
                      className="text-slate/40 hover:text-forest transition"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!data?.sellers?.length && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-card text-slate/40 text-sm">
                No sellers found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval confirmation modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-forest mb-1">
              {approvalModal.action === "approved" ? "✅ Approve Store" : "❌ Reject Store"}
            </h3>
            <p className="text-sm text-slate/60 mb-4">
              <strong>{approvalModal.name}</strong>{" "}
              {approvalModal.action === "approved"
                ? "will be approved and the seller can start listing products."
                : "will be rejected and notified."}
            </p>
            {approvalModal.action === "rejected" && (
              <textarea
                className="w-full border border-forest/20 rounded-xl px-3 py-2 text-sm h-20 resize-none mb-3"
                placeholder="Reason for rejection (will be sent to seller)…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setApprovalModal(null);
                  setRejectNote("");
                }}
                className="flex-1 border border-forest/15 rounded-xl py-2.5 text-sm font-semibold hover:bg-forest/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApproval}
                disabled={approving}
                className={`flex-1 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  approvalModal.action === "approved"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-vermillion hover:bg-vermillion/90"
                }`}
              >
                {approving && <Loader2 size={14} className="animate-spin" />}
                {approvalModal.action === "approved" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Products tab ─────────────────────────────────────────────────────────────
function ProductsTab() {
  const { data, refetch } = useListProductsQuery({ limit: 50 });
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    await deleteProduct(id).unwrap();
    setDeleteId(null);
    refetch();
  }

  async function toggleActive(id: string, current: boolean) {
    await updateProduct({ id, isActive: !current }).unwrap();
    refetch();
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-forest/5">
            <tr>
              {["Product", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-slate/60 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest/5">
            {(data?.items ?? []).map((p) => (
              <tr key={p._id} className="hover:bg-forest/2 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images?.[0]}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover shrink-0"
                    />
                    <span className="font-medium text-forest line-clamp-1 max-w-[160px]">
                      {p.title}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate/60 capitalize">{p.category}</td>
                <td className="px-4 py-3 font-mono text-saffron font-bold text-xs">
                  {formatRWF(p.price)}
                </td>
                <td className="px-4 py-3 text-slate/60">{p.stock}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(p._id, p.isActive)}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${p.isActive ? "bg-green-50 text-green-700" : "bg-slate/10 text-slate/50"}`}
                  >
                    {p.isActive ? "Active" : "Hidden"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDeleteId(p._id)}
                    className="text-vermillion/60 hover:text-vermillion transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.items?.length && (
          <div className="text-center py-8 text-slate/40 text-sm">No products found.</div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <Trash2 className="text-vermillion mx-auto mb-3" size={32} />
            <h3 className="font-bold text-forest mb-2">Remove product?</h3>
            <p className="text-sm text-slate/60 mb-5">
              This will hide the product from the marketplace.
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
                className="flex-1 bg-vermillion text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />} Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-vermillion/10 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-vermillion" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-forest">Admin Panel</h1>
          <p className="text-xs text-slate/50">SOMA Marketplace Management</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-forest/5 rounded-xl p-1 mb-6 flex-wrap">
        {NAV.map(({ path, label, icon: Icon }) => {
          const exact = path === "/admin";
          const isActive = exact
            ? location.pathname === "/admin"
            : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive ? "bg-white text-forest shadow-card" : "text-slate/60 hover:text-forest"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Routes>
        <Route path="/" element={<DashboardOverview />} />
        <Route path="/users" element={<UsersTab />} />
        <Route path="/sellers" element={<SellersTab />} />
        <Route path="/products" element={<ProductsTab />} />
        <Route path="*" element={<DashboardOverview />} />
      </Routes>
    </div>
  );
}
// Note: SellersTab has been extended above with approval workflow — injecting into existing file below
