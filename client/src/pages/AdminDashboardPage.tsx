import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  useAdminDashboardQuery,
  useAdminPendingSellersQuery,
  useAdminApproveSellerMutation,
  useAdminGetCouponsQuery,
  useAdminCreateCouponMutation,
  useAdminToggleCouponMutation,
  useAdminDeleteCouponMutation,
  useAdminGetPayoutsQuery,
  useAdminDisbursePayoutMutation,
  useAdminGetDisputesQuery,
  useAdminResolveDisputeMutation,
  useGetAdminModerationQueueQuery,
  useModerateReviewMutation,
  useGetAdminFlaggedUsersQuery,
  useUnflagUserMutation,
  useTriggerAutomationMutation,
} from "../app/api";
import { formatRWF } from "../utils/format";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Tag,
  CreditCard,
  AlertTriangle,
  Users,
  AlertCircle,
  Shield,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Play,
  RefreshCw,
} from "lucide-react";

type AdminTab =
  | "overview"
  | "sellers"
  | "coupons"
  | "payouts"
  | "disputes"
  | "moderation"
  | "fraud"
  | "automations";

const TAB_LABELS: Record<AdminTab, string> = {
  overview: "Overview",
  sellers: "Pending Sellers",
  coupons: "Coupons",
  payouts: "Payouts",
  disputes: "Disputes",
  moderation: "Moderation Queue",
  fraud: "Fraud Signals",
  automations: "Automations",
};

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading } = useAdminDashboardQuery();
  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={24} />
      </div>
    );
  const stats = data?.stats;
  if (!stats) return null;
  const statCards = [
    { label: "Total Users", value: stats.totalUsers },
    { label: "Total Sellers", value: stats.totalSellers },
    { label: "Active Products", value: stats.totalProducts },
    { label: "Total Orders", value: stats.totalOrders },
    { label: "Pending Approvals", value: stats.pendingSellerApprovals },
    { label: "Platform Revenue", value: formatRWF(stats.gmv ?? 0) },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-xs text-slate/50">{label}</p>
            <p className="font-display text-xl text-forest mt-1">{String(value)}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-card p-5">
        <h3 className="font-display text-forest mb-3">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate/50 border-b border-forest/8">
                <th className="pb-2 pr-4">Order #</th>
                <th className="pb-2 pr-4">Buyer</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentOrders ?? []).map((o) => {
                const order = o as unknown as Record<string, unknown>;
                const buyer = order.buyerId as Record<string, unknown> | null;
                return (
                  <tr
                    key={String(order._id)}
                    className="border-b border-forest/5 hover:bg-forest/2"
                  >
                    <td className="py-2 pr-4 font-mono text-xs">{String(order.orderNumber)}</td>
                    <td className="py-2 pr-4">
                      {String(
                        (buyer?.profile as Record<string, unknown>)?.name ?? buyer?.phone ?? "—",
                      )}
                    </td>
                    <td className="py-2 pr-4 font-mono">{formatRWF(Number(order.total))}</td>
                    <td className="py-2">
                      <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full">
                        {String(order.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Pending Sellers ───────────────────────────────────────────────────────────

function SellersTab() {
  const { data, isLoading, refetch } = useAdminPendingSellersQuery();
  const [approveSeller] = useAdminApproveSellerMutation();
  const [approving, setApproving] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  async function handle(id: string, status: "approved" | "rejected") {
    setApproving(id);
    try {
      await approveSeller({ id, status, note: noteMap[id] }).unwrap();
      refetch();
    } finally {
      setApproving(null);
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={24} />
      </div>
    );
  const sellers = data?.sellers ?? [];

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-forest">
        Pending Seller Applications ({sellers.length})
      </h2>
      {sellers.length === 0 ? (
        <p className="text-slate/50 text-center py-12">No pending applications.</p>
      ) : (
        sellers.map((s) => {
          const seller = s as unknown as Record<string, unknown>;
          const user = seller.userId as Record<string, unknown> | null;
          const docs = seller.documents as Record<string, string | undefined> | undefined;
          return (
            <div
              key={String(seller._id)}
              className="bg-white rounded-2xl shadow-card p-5 space-y-3"
            >
              <div className="flex gap-4">
                {seller.logo != null && (
                  <img
                    src={String(seller.logo)}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-bold text-forest">{String(seller.storeName)}</p>
                  <p className="text-xs text-slate/50">
                    {String((user?.profile as Record<string, unknown>)?.name ?? "—")} ·{" "}
                    {String(user?.phone ?? "—")} · {String(user?.email ?? "—")}
                  </p>
                  <p className="text-xs text-slate/50 mt-0.5">
                    {String(seller.accountType)} ·{" "}
                    {String((seller.location as Record<string, unknown>)?.district ?? "")}
                  </p>
                </div>
              </div>
              {(docs?.nidUrl || docs?.licenseUrl) && (
                <div className="flex gap-3 text-xs">
                  {docs.nidUrl && (
                    <a
                      href={docs.nidUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-forest underline"
                    >
                      📄 NID
                    </a>
                  )}
                  {docs.licenseUrl && (
                    <a
                      href={docs.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-forest underline"
                    >
                      📄 License
                    </a>
                  )}
                </div>
              )}
              <input
                placeholder="Rejection note (optional)"
                value={noteMap[String(seller._id)] ?? ""}
                onChange={(e) =>
                  setNoteMap((m) => ({ ...m, [String(seller._id)]: e.target.value }))
                }
                className="w-full border border-forest/15 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handle(String(seller._id), "approved")}
                  disabled={approving === String(seller._id)}
                  className="flex items-center gap-1.5 text-sm bg-forest text-white px-4 py-2 rounded-lg hover:bg-forest/90 disabled:opacity-50"
                >
                  {approving === String(seller._id) ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle size={13} />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => handle(String(seller._id), "rejected")}
                  disabled={approving === String(seller._id)}
                  className="flex items-center gap-1.5 text-sm border border-vermillion/30 text-vermillion px-4 py-2 rounded-lg hover:bg-vermillion/5 disabled:opacity-50"
                >
                  <XCircle size={13} /> Reject
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Coupons ───────────────────────────────────────────────────────────────────

function CouponsTab() {
  const { data, isLoading, refetch } = useAdminGetCouponsQuery();
  const [createCoupon, { isLoading: creating }] = useAdminCreateCouponMutation();
  const [toggleCoupon] = useAdminToggleCouponMutation();
  const [deleteCoupon] = useAdminDeleteCouponMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "percentage",
    value: "",
    minOrder: "0",
    maxUses: "100",
    expiresAt: "",
  });
  const [formError, setFormError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.code || !form.value || !form.expiresAt) {
      setFormError("Code, value and expiry are required.");
      return;
    }
    try {
      await createCoupon({
        code: form.code.toUpperCase(),
        type: form.type as "percentage" | "fixed",
        value: Number(form.value),
        minOrder: Number(form.minOrder),
        maxUses: Number(form.maxUses),
        expiresAt: new Date(form.expiresAt).toISOString(),
      }).unwrap();
      setShowForm(false);
      setForm({
        code: "",
        type: "percentage",
        value: "",
        minOrder: "0",
        maxUses: "100",
        expiresAt: "",
      });
      refetch();
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } }).data?.error;
      setFormError(msg ?? "Failed to create coupon.");
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={24} />
      </div>
    );
  const coupons = data?.coupons ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-forest">Coupons ({coupons.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Tag size={14} /> New Coupon
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Code *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm font-mono uppercase"
                  placeholder="SAVE20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (RWF)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Value *</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={form.type === "percentage" ? "20" : "5000"}
                  min={0}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">
                  Min order (RWF)
                </label>
                <input
                  type="number"
                  value={form.minOrder}
                  onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Max uses</label>
                <input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                  min={1}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-1">Expires at *</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            {formError && <p className="text-vermillion text-xs">{formError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="btn-primary flex items-center gap-2"
              >
                {creating && <Loader2 size={13} className="animate-spin" />} Create
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {coupons.map((c) => {
          const coupon = c as unknown as Record<string, unknown>;
          return (
            <div
              key={String(coupon._id)}
              className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <p className="font-mono font-bold text-forest">{String(coupon.code)}</p>
                <p className="text-xs text-slate/50">
                  {String(coupon.type) === "percentage"
                    ? `${String(coupon.value)}% off`
                    : `RWF ${Number(coupon.value).toLocaleString()} off`}
                  {" · "}
                  {String(coupon.usedCount)}/{String(coupon.maxUses)} used
                  {" · "} Expires {new Date(String(coupon.expiresAt)).toLocaleDateString("en-RW")}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${coupon.isActive ? "bg-green-50 text-green-700" : "bg-slate/10 text-slate/50"}`}
              >
                {coupon.isActive ? "Active" : "Inactive"}
              </span>
              <button
                onClick={async () => {
                  await toggleCoupon(String(coupon._id));
                  refetch();
                }}
                className="text-xs border border-forest/20 text-forest px-3 py-1.5 rounded-lg hover:bg-forest/5"
              >
                {coupon.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={async () => {
                  if (confirm("Delete this coupon?")) {
                    await deleteCoupon(String(coupon._id));
                    refetch();
                  }
                }}
                className="text-xs border border-vermillion/20 text-vermillion px-3 py-1.5 rounded-lg hover:bg-vermillion/5"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Payouts ───────────────────────────────────────────────────────────────────

function PayoutsTab() {
  const { data, isLoading, refetch } = useAdminGetPayoutsQuery();
  const [disbursePayout] = useAdminDisbursePayoutMutation();
  const [momoRefMap, setMomoRefMap] = useState<Record<string, string>>({});
  const [disbursing, setDisbursing] = useState<string | null>(null);

  async function handleDisburse(id: string) {
    const ref = momoRefMap[id];
    if (!ref?.trim()) {
      alert("Please enter a MoMo reference.");
      return;
    }
    setDisbursing(id);
    try {
      await disbursePayout({ id, momoRef: ref }).unwrap();
      refetch();
    } catch (err: unknown) {
      alert((err as { data?: { error?: string } }).data?.error ?? "Failed to disburse.");
    } finally {
      setDisbursing(null);
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={24} />
      </div>
    );
  const payouts = data?.payouts ?? [];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    processing: "bg-blue-50 text-blue-700",
    sent: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-forest">Payout Requests ({payouts.length})</h2>
      {payouts.length === 0 ? (
        <p className="text-slate/50 text-center py-12">No payout requests yet.</p>
      ) : (
        payouts.map((p) => {
          const payout = p as unknown as Record<string, unknown>;
          const seller = payout.sellerId as Record<string, unknown> | null;
          return (
            <div key={String(payout._id)} className="bg-white rounded-2xl shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-forest">{String(seller?.storeName ?? "—")}</p>
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
              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div>
                  <p className="text-xs text-slate/50">Gross</p>
                  <p className="font-mono font-bold text-forest">
                    {formatRWF(Number(payout.grossAmount))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate/50">Commission (10%)</p>
                  <p className="font-mono text-slate/60">{formatRWF(Number(payout.commission))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate/50">Net payout</p>
                  <p className="font-mono font-bold text-saffron">
                    {formatRWF(Number(payout.amount))}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate/60 mb-3">
                MoMo: <span className="font-mono">{String(payout.momoPhone ?? "—")}</span>
              </p>
              {payout.status === "pending" && (
                <div className="flex gap-2">
                  <input
                    placeholder="MoMo reference *"
                    value={momoRefMap[String(payout._id)] ?? ""}
                    onChange={(e) =>
                      setMomoRefMap((m) => ({ ...m, [String(payout._id)]: e.target.value }))
                    }
                    className="flex-1 border border-forest/15 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                  <button
                    onClick={() => handleDisburse(String(payout._id))}
                    disabled={disbursing === String(payout._id)}
                    className="flex items-center gap-1.5 text-sm bg-forest text-white px-4 py-2 rounded-lg hover:bg-forest/90 disabled:opacity-50"
                  >
                    {disbursing === String(payout._id) ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CreditCard size={13} />
                    )}
                    Disburse
                  </button>
                </div>
              )}
              {String(payout.status) === "sent" && payout.momoRef != null && (
                <p className="text-xs text-green-600">
                  ✅ Ref: <span className="font-mono">{String(payout.momoRef)}</span>
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Disputes ─────────────────────────────────────────────────────────────────

function DisputesTab() {
  const { data, isLoading, refetch } = useAdminGetDisputesQuery({});
  const [resolveDispute] = useAdminResolveDisputeMutation();
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState<string | null>(null);

  async function handleResolve(id: string, status: string) {
    setResolving(id);
    try {
      await resolveDispute({ id, status, adminNote: noteMap[id] }).unwrap();
      refetch();
    } catch (err: unknown) {
      alert((err as { data?: { error?: string } }).data?.error ?? "Failed to resolve.");
    } finally {
      setResolving(null);
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={24} />
      </div>
    );
  const disputes = data?.disputes ?? [];

  const statusColors: Record<string, string> = {
    open: "bg-red-50 text-red-700",
    under_review: "bg-yellow-50 text-yellow-700",
    resolved_refund: "bg-green-50 text-green-700",
    resolved_no_action: "bg-slate/10 text-slate",
    closed: "bg-slate/10 text-slate/50",
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-forest">Disputes ({disputes.length})</h2>
      {disputes.length === 0 ? (
        <p className="text-slate/50 text-center py-12">No disputes.</p>
      ) : (
        disputes.map((d) => {
          const dispute = d as unknown as Record<string, unknown>;
          const order = dispute.orderId as Record<string, unknown> | null;
          const buyer = dispute.buyerId as Record<string, unknown> | null;
          return (
            <div
              key={String(dispute._id)}
              className="bg-white rounded-2xl shadow-card p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-forest">
                    Order: {String(order?.orderNumber ?? "—")}
                  </p>
                  <p className="text-xs text-slate/50">
                    Buyer:{" "}
                    {String(
                      (buyer?.profile as Record<string, unknown>)?.name ?? buyer?.phone ?? "—",
                    )}{" "}
                    ·{new Date(String(dispute.createdAt)).toLocaleDateString("en-RW")}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${statusColors[String(dispute.status)] ?? "bg-slate/10"}`}
                >
                  {String(dispute.status).replace(/_/g, " ")}
                </span>
              </div>
              <div className="bg-slate/5 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate/50 uppercase mb-1">
                  Reason: {String(dispute.reason).replace(/_/g, " ")}
                </p>
                <p className="text-sm text-slate/80">{String(dispute.description)}</p>
              </div>
              {["open", "under_review"].includes(String(dispute.status)) && (
                <div className="space-y-2">
                  <input
                    placeholder="Admin note (optional)"
                    value={noteMap[String(dispute._id)] ?? ""}
                    onChange={(e) =>
                      setNoteMap((m) => ({ ...m, [String(dispute._id)]: e.target.value }))
                    }
                    className="w-full border border-forest/15 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleResolve(String(dispute._id), "under_review")}
                      disabled={resolving === String(dispute._id)}
                      className="text-xs border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                    >
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => handleResolve(String(dispute._id), "resolved_refund")}
                      disabled={resolving === String(dispute._id)}
                      className="text-xs border border-green-300 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50"
                    >
                      ✅ Resolve — Refund
                    </button>
                    <button
                      onClick={() => handleResolve(String(dispute._id), "resolved_no_action")}
                      disabled={resolving === String(dispute._id)}
                      className="text-xs border border-slate/30 text-slate px-3 py-1.5 rounded-lg hover:bg-slate/5"
                    >
                      Resolve — No Action
                    </button>
                    <button
                      onClick={() => handleResolve(String(dispute._id), "closed")}
                      disabled={resolving === String(dispute._id)}
                      className="text-xs border border-slate/30 text-slate/50 px-3 py-1.5 rounded-lg hover:bg-slate/5"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const tabs: AdminTab[] = [
    "overview",
    "sellers",
    "coupons",
    "payouts",
    "disputes",
    "moderation",
    "fraud",
    "automations",
  ];
  const TAB_ICONS: Record<AdminTab, React.ElementType> = {
    overview: Users,
    sellers: CheckCircle,
    coupons: Tag,
    payouts: CreditCard,
    disputes: AlertTriangle,
    moderation: AlertCircle,
    fraud: Shield,
    automations: Zap,
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard — SOMA Market</title>
      </Helmet>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-display text-3xl text-forest mb-6">Admin Dashboard</h1>
        <nav className="flex gap-1 flex-wrap border-b border-forest/10 pb-4 mb-6">
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-forest text-saffron" : "text-slate/70 hover:bg-forest/5 hover:text-forest"}`}
              >
                <Icon size={15} />
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </nav>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "sellers" && <SellersTab />}
        {activeTab === "coupons" && <CouponsTab />}
        {activeTab === "payouts" && <PayoutsTab />}
        {activeTab === "disputes" && <DisputesTab />}
        {activeTab === "moderation" && <ModerationQueueTab />}
        {activeTab === "fraud" && <FraudSignalsTab />}
        {activeTab === "automations" && <AutomationsTab />}
      </div>
    </>
  );
}

// ── Moderation Queue Tab ──────────────────────────────────────────────────────
function ModerationQueueTab() {
  const { data, isLoading, refetch } = useGetAdminModerationQueueQuery();
  const [moderate] = useModerateReviewMutation();
  const reviews = data?.reviews ?? [];

  async function handleModerate(id: string, action: "approve" | "remove") {
    await moderate({ id, action }).unwrap();
    refetch();
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={24} />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-forest">Moderation Queue ({reviews.length})</h2>
        <p className="text-xs text-slate/50">
          Reviews flagged by AI sentiment analysis as potentially harmful or negative
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate/40 gap-2">
          <CheckCircle size={32} />
          <p className="text-sm">All clear — no reviews need moderation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const r = review as unknown as Record<string, unknown>;
            const product = r.productId as { title?: string } | undefined;
            const buyer = r.buyerId as { email?: string; profile?: { name?: string } } | undefined;
            return (
              <div
                key={String(r._id)}
                className="bg-white rounded-2xl shadow-card p-5 border-l-4 border-amber-400"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        ⚠ Flagged
                      </span>
                      {r.sentiment === "negative" && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ThumbsDown size={9} /> Negative
                        </span>
                      )}
                      <span className="text-xs text-slate/40">
                        {new Date(String(r.createdAt ?? "")).toLocaleDateString("en-RW")}
                      </span>
                    </div>
                    <p className="text-sm text-slate/80 leading-relaxed">{String(r.text ?? "")}</p>
                    <div className="flex gap-3 mt-1 text-xs text-slate/40">
                      {product?.title && <span>Product: {product.title}</span>}
                      {buyer?.email && <span>Buyer: {buyer.profile?.name ?? buyer.email}</span>}
                      <span>Rating: {String(r.rating ?? "")}/5</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleModerate(String(r._id), "approve")}
                      className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100"
                    >
                      <ThumbsUp size={11} /> Approve
                    </button>
                    <button
                      onClick={() => handleModerate(String(r._id), "remove")}
                      className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100"
                    >
                      <XCircle size={11} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Fraud Signals Tab ─────────────────────────────────────────────────────────
function FraudSignalsTab() {
  const { data, isLoading, refetch } = useGetAdminFlaggedUsersQuery();
  const [unflag] = useUnflagUserMutation();
  const users = data?.users ?? [];

  async function handleUnflag(id: string) {
    await unflag(id).unwrap();
    refetch();
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-forest" size={24} />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-forest">Fraud Signals ({users.length})</h2>
        <p className="text-xs text-slate/50">Accounts flagged by automated rule-based detection</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">Fraud detection rules:</p>
        <ul className="list-disc pl-4 space-y-0.5 text-amber-700">
          <li>3+ orders in 1 hour from the same buyer</li>
          <li>5+ disputes opened in the last 30 days</li>
          <li>Loyalty points jumped by more than 10,000 in a single day</li>
        </ul>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate/40 gap-2">
          <Shield size={32} />
          <p className="text-sm">No accounts flagged</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-2xl shadow-card p-5 border-l-4 border-red-400 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                    🚩 Flagged
                  </span>
                  <span className="text-sm font-medium text-forest truncate">
                    {(user as { profile?: { name?: string } }).profile?.name ?? user.email ?? "—"}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate/50 flex-wrap">
                  <span>{user.email}</span>
                  <span>Tier: {(user as { tier?: string }).tier ?? "starter"}</span>
                  <span>
                    Points:{" "}
                    {(user as { loyaltyPoints?: number }).loyaltyPoints?.toLocaleString() ?? 0}
                  </span>
                  <span>
                    Joined:{" "}
                    {new Date(
                      String((user as { createdAt?: string }).createdAt ?? ""),
                    ).toLocaleDateString("en-RW")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleUnflag(user.id)}
                className="shrink-0 flex items-center gap-1.5 text-xs bg-forest/5 text-forest border border-forest/20 px-3 py-1.5 rounded-lg hover:bg-forest/10"
              >
                <CheckCircle size={11} /> Clear flag
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Automations Tab ───────────────────────────────────────────────────────────
const AUTOMATION_JOBS: Array<{
  id: string;
  label: string;
  description: string;
  schedule: string;
  icon: React.ElementType;
  color: string;
}> = [
  {
    id: "low-stock",
    label: "Low-stock email alerts",
    description: "Send digest emails to sellers whose products are running low.",
    schedule: "Daily at 08:00",
    icon: AlertCircle,
    color: "amber",
  },
  {
    id: "payout-disburse",
    label: "Payout auto-disbursement",
    description: "Auto-process pending payouts older than 7 days via MoMo.",
    schedule: "Weekly (Monday 06:00)",
    icon: CreditCard,
    color: "green",
  },
  {
    id: "order-cancel",
    label: "Order auto-cancel",
    description: "Cancel orders stuck in 'placed' with pending payment > 2 hrs and restore stock.",
    schedule: "Every 15 minutes",
    icon: XCircle,
    color: "red",
  },
  {
    id: "loyalty-tier",
    label: "Loyalty tier upgrades",
    description: "Promote users to regular / trusted / VIP based on point thresholds.",
    schedule: "Nightly at 02:00",
    icon: Zap,
    color: "saffron",
  },
  {
    id: "stale-products",
    label: "Stale product deactivation",
    description: "Pause products that have been out of stock for 30+ days.",
    schedule: "Nightly at 03:00",
    icon: RefreshCw,
    color: "slate",
  },
  {
    id: "fraud-detection",
    label: "Fraud signal detection",
    description: "Flag accounts matching suspicious order / dispute / loyalty patterns.",
    schedule: "Nightly at 04:00",
    icon: Shield,
    color: "red",
  },
  {
    id: "analytics-digest",
    label: "Weekly analytics digest",
    description: "Email every active seller their revenue, orders, and top product for the week.",
    schedule: "Weekly (Monday 07:00)",
    icon: Users,
    color: "forest",
  },
];

function AutomationsTab() {
  const [trigger, { isLoading }] = useTriggerAutomationMutation();
  const [results, setResults] = useState<Record<string, { ok: boolean; ranAt: string }>>({});
  const [running, setRunning] = useState<string | null>(null);

  async function handleTrigger(jobId: string) {
    setRunning(jobId);
    try {
      const res = await trigger(jobId).unwrap();
      setResults((prev) => ({ ...prev, [jobId]: { ok: res.ok, ranAt: res.ranAt } }));
    } catch {
      setResults((prev) => ({ ...prev, [jobId]: { ok: false, ranAt: new Date().toISOString() } }));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-lg text-forest">Automation Jobs</h2>
        <p className="text-xs text-slate/50">
          All jobs run automatically on schedule. Use "Run now" to trigger manually.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AUTOMATION_JOBS.map((job) => {
          const Icon = job.icon;
          const result = results[job.id];
          const isJobRunning = running === job.id && isLoading;

          return (
            <div key={job.id} className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-forest/8 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-forest" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-forest">{job.label}</p>
                  <p className="text-xs text-slate/50 mt-0.5 leading-relaxed">{job.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-forest/5">
                <span className="text-xs text-slate/40 flex items-center gap-1">
                  <Zap size={10} /> {job.schedule}
                </span>

                <div className="flex items-center gap-2">
                  {result && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {result.ok ? "✓ Done" : "✗ Failed"}{" "}
                      {new Date(result.ranAt).toLocaleTimeString("en-RW", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}

                  <button
                    onClick={() => handleTrigger(job.id)}
                    disabled={isJobRunning}
                    className="flex items-center gap-1.5 text-xs bg-forest text-saffron px-3 py-1.5 rounded-lg hover:bg-forest/90 disabled:opacity-50 transition-colors"
                  >
                    {isJobRunning ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Play size={11} />
                    )}
                    Run now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
