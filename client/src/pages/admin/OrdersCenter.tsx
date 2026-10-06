import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Copy, Download, Phone, RefreshCw } from "lucide-react";
import {
  useAdminBulkConfirmMutation,
  useAdminConfirmPaymentMutation,
  useAdminMarkRefundedMutation,
  useAdminOrderCountsQuery,
  useAdminOrderDetailQuery,
  useAdminOrderNoteMutation,
  useAdminOrdersQuery,
  useAdminRejectPaymentMutation,
  useUpdateOrderStatusMutation,
} from "../../app/api";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import type { AdminOrderRow } from "../../types";
import { formatRWF } from "../../utils/format";
import {
  Badge,
  Chip,
  ConfirmModal,
  Drawer,
  Empty,
  PageHeader,
  Pagination,
  ReasonModal,
  SearchInput,
  Spinner,
  Table,
} from "./ui";
import {
  errMsg,
  fmtDate,
  label,
  orderStatusTone,
  paymentTone,
  useDebounced,
  useToast,
} from "./helpers";

const QUEUES: Array<{ key: string; label: string; alert?: boolean; hint: string }> = [
  {
    key: "verify",
    label: "Payments to verify",
    alert: true,
    hint: "Buyers who sent a manual transfer — check your MoMo statement, then confirm or reject.",
  },
  {
    key: "awaiting",
    label: "Awaiting payment",
    hint: "Placed but no payment yet. Unpaid orders auto-cancel after 2 hours.",
  },
  {
    key: "ready",
    label: "Ready to process",
    alert: true,
    hint: "Paid (or cash on delivery) and waiting for the seller to start.",
  },
  { key: "active", label: "In progress", hint: "Being prepared, packed or on the road." },
  {
    key: "refund",
    label: "Refunds to send",
    alert: true,
    hint: "Cancelled or refunded after payment — send the money back, then mark it sent.",
  },
  { key: "delivered", label: "Delivered", hint: "Completed orders." },
  { key: "cancelled", label: "Cancelled", hint: "Cancelled orders." },
  { key: "all", label: "All orders", hint: "Everything, newest first." },
];

const FLOW = [
  "payment_confirmed",
  "preparing",
  "packed",
  "picked_up",
  "out_for_delivery",
  "delivered",
];

const buyerName = (o: AdminOrderRow) => o.buyerId?.profile?.name ?? o.buyerId?.phone ?? "—";

// ── Order drawer ─────────────────────────────────────────────────────────────

function OrderDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const toast = useToast();
  const { data, isFetching } = useAdminOrderDetailQuery(orderId ?? "", { skip: !orderId });
  const [confirmPayment, { isLoading: confirming }] = useAdminConfirmPaymentMutation();
  const [rejectPayment, { isLoading: rejecting }] = useAdminRejectPaymentMutation();
  const [markRefunded, { isLoading: refunding }] = useAdminMarkRefundedMutation();
  const [updateStatus, { isLoading: updating }] = useUpdateOrderStatusMutation();
  const [addNote, { isLoading: noting }] = useAdminOrderNoteMutation();
  const [modal, setModal] = useState<null | "reject" | "cancel" | "confirm" | "deliver" | "refund">(
    null,
  );
  const [note, setNote] = useState("");

  const order = data?.order;
  const busy = confirming || rejecting || refunding || updating;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      const r = await fn();
      const msg = (r as { message?: unknown } | undefined)?.message;
      toast.success(typeof msg === "string" ? msg : ok);
      setModal(null);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, typeof data.order.items>();
    for (const it of data.order.items) {
      const key = String(it.sellerId);
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return [...map.entries()].map(([sellerId, items]) => ({
      sellerId,
      items,
      seller: data.sellers.find((s) => s._id === sellerId),
      earning: data.earnings.find((e) => String(e.sellerId) === sellerId),
    }));
  }, [data]);

  const summaryText = order
    ? [
        `${order.orderNumber} — ${formatRWF(order.total)} (${label(order.paymentMethod)}, ${label(order.paymentStatus)})`,
        `Buyer: ${buyerName(order)} ${order.deliveryAddress.phone ?? order.buyerId?.phone ?? ""}`,
        `Deliver to: ${[order.deliveryAddress.street, order.deliveryAddress.sector, order.deliveryAddress.district].filter(Boolean).join(", ")}`,
        ...order.items.map(
          (i) => `• ${i.quantity}× ${i.title}${i.variant ? ` (${i.variant})` : ""}`,
        ),
      ].join("\n")
    : "";

  const secured = order && (order.paymentStatus === "paid" || order.paymentMethod === "cod");
  const terminal = order && ["delivered", "cancelled"].includes(order.status);
  const idx = order ? FLOW.indexOf(order.status) : -1;
  const later = secured && !terminal ? FLOW.slice(idx + 1) : [];
  const waitingPayment =
    order &&
    order.status === "placed" &&
    ["pending", "failed", "manual_review"].includes(order.paymentStatus);
  const mp = order?.manualPayment;

  return (
    <Drawer
      open={Boolean(orderId)}
      onClose={onClose}
      title={
        order ? (
          <span className="flex items-center gap-2">
            <span className="font-mono">{order.orderNumber}</span>
            {isFetching && <RefreshCw size={14} className="animate-spin text-slate/40" />}
          </span>
        ) : (
          "Order"
        )
      }
    >
      {!order ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={orderStatusTone(order.status)}>{label(order.status)}</Badge>
            <Badge tone={paymentTone(order.paymentStatus)}>
              {order.paymentStatus === "manual_review"
                ? "awaiting verification"
                : label(order.paymentStatus)}
            </Badge>
            <Badge tone="forest">{label(order.paymentMethod)}</Badge>
            <span className="ml-auto font-mono font-bold text-saffron text-lg">
              {formatRWF(order.total)}
            </span>
          </div>

          {/* ── Primary actions ───────────────────────────────────────────── */}
          {order.paymentStatus === "manual_review" && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
              <p className="font-semibold text-blue-900 text-sm">Verify this manual transfer</p>
              <dl className="text-sm grid grid-cols-[110px_1fr] gap-y-1.5 text-blue-900">
                <dt className="text-blue-700">Expected</dt>
                <dd className="font-mono font-bold">{formatRWF(order.total)}</dd>
                <dt className="text-blue-700">Network</dt>
                <dd>{mp?.provider === "airtel_money" ? "Airtel Money" : "MTN MoMo"}</dd>
                <dt className="text-blue-700">Paid from</dt>
                <dd className="font-mono">{mp?.senderPhone ?? "—"}</dd>
                <dt className="text-blue-700">Transaction ID</dt>
                <dd className="font-mono font-bold flex items-center gap-2">
                  {mp?.reference ?? order.paymentRef ?? "—"}
                  {mp?.reference && (
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(mp.reference ?? "");
                        toast.success("Transaction ID copied");
                      }}
                      className="text-blue-600"
                      aria-label="Copy transaction ID"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </dd>
                <dt className="text-blue-700">Submitted</dt>
                <dd>{fmtDate(mp?.submittedAt)}</dd>
              </dl>
              <p className="text-xs text-blue-700">
                Match the transaction ID and amount on your MoMo statement before confirming.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => setModal("confirm")}
                  className="flex-1 bg-forest text-white font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
                >
                  Confirm payment received
                </button>
                <button
                  disabled={busy}
                  onClick={() => setModal("reject")}
                  className="px-4 border border-red-200 text-red-600 text-sm rounded-xl hover:bg-red-50 disabled:opacity-50"
                >
                  Reject…
                </button>
              </div>
            </div>
          )}

          {waitingPayment && order.paymentStatus !== "manual_review" && (
            <div className="bg-saffron/10 border border-saffron/30 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-forest text-sm">No payment recorded yet</p>
              {order.manualPayment?.rejectedReason && (
                <p className="text-xs text-vermillion">
                  Last rejected: {order.manualPayment.rejectedReason}
                </p>
              )}
              <p className="text-xs text-slate/60">
                If you've already received the money (cash, bank, or a transfer the buyer didn't
                submit), confirm it manually.
              </p>
              <button
                disabled={busy}
                onClick={() => setModal("confirm")}
                className="w-full bg-forest text-white font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
              >
                Confirm payment received
              </button>
            </div>
          )}

          {order.paymentStatus === "refund_pending" && (
            <div className="bg-saffron/10 border border-saffron/30 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-forest text-sm">
                Refund due: {formatRWF(order.total)}
              </p>
              <p className="text-xs text-slate/60">
                Send it to the buyer (
                {order.manualPayment?.senderPhone ??
                  order.deliveryAddress.phone ??
                  order.buyerId?.phone ??
                  "their phone"}
                ), then mark it sent.
              </p>
              <button
                disabled={busy}
                onClick={() => setModal("refund")}
                className="w-full bg-saffron text-white font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
              >
                Mark refund sent
              </button>
            </div>
          )}

          {secured && !terminal && (
            <div className="bg-white rounded-2xl shadow-card p-4 space-y-2">
              <p className="font-semibold text-forest text-sm">Move this order forward</p>
              <div className="flex flex-wrap gap-2">
                {later.map((st, i) => (
                  <button
                    key={st}
                    disabled={busy}
                    onClick={() =>
                      st === "delivered"
                        ? setModal("deliver")
                        : void run(
                            () => updateStatus({ id: order._id, status: st }).unwrap(),
                            `Marked ${label(st)}`,
                          )
                    }
                    className={`text-sm px-3 py-2 rounded-xl disabled:opacity-50 ${
                      i === 0
                        ? "bg-forest text-white font-semibold"
                        : "border border-forest/20 text-forest hover:bg-forest/5"
                    }`}
                  >
                    Mark {label(st)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!terminal && (
            <button
              disabled={busy}
              onClick={() => setModal("cancel")}
              className="text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              Cancel this order…
            </button>
          )}

          {/* ── Buyer & delivery ─────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-card p-4 text-sm space-y-1">
            <h3 className="font-semibold text-forest mb-1">Buyer & delivery</h3>
            <p>{buyerName(order)}</p>
            {(order.deliveryAddress.phone ?? order.buyerId?.phone) && (
              <a
                href={`tel:${order.deliveryAddress.phone ?? order.buyerId?.phone}`}
                className="inline-flex items-center gap-1.5 text-forest font-mono"
              >
                <Phone size={13} /> {order.deliveryAddress.phone ?? order.buyerId?.phone}
              </a>
            )}
            {order.buyerId?.email && <p className="text-slate/60">{order.buyerId.email}</p>}
            <p className="text-slate/70 pt-1">
              {[
                order.deliveryAddress.street,
                order.deliveryAddress.sector,
                order.deliveryAddress.district,
              ]
                .filter(Boolean)
                .join(", ")}{" "}
              · {label(order.deliverySpeed)}
            </p>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(summaryText);
                toast.success("Order summary copied — paste it into WhatsApp");
              }}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-forest border border-forest/20 rounded-lg px-2.5 py-1.5 hover:bg-forest/5"
            >
              <Copy size={12} /> Copy order summary
            </button>
          </section>

          {/* ── Items by seller, with commission ─────────────────────────── */}
          {grouped.map((g) => (
            <section key={g.sellerId} className="bg-white rounded-2xl shadow-card p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-forest">{g.seller?.storeName ?? "Store"}</h3>
                {g.seller?.userId?.phone && (
                  <span className="font-mono text-xs text-slate/50">{g.seller.userId.phone}</span>
                )}
              </div>
              <ul className="divide-y divide-forest/5">
                {g.items.map((it, i) => (
                  <li key={i} className="py-1.5 flex justify-between gap-3">
                    <span>
                      {it.quantity}× {it.title}
                      {it.variant && <span className="text-slate/50"> ({it.variant})</span>}
                    </span>
                    <span className="font-mono text-xs">
                      {formatRWF(it.unitPrice * it.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              {g.earning ? (
                <div className="mt-3 bg-forest/5 rounded-xl p-3 text-xs grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-slate/50">Sales</p>
                    <p className="font-mono font-bold">{formatRWF(g.earning.commissionBase)}</p>
                  </div>
                  <div>
                    <p className="text-slate/50">Commission</p>
                    <p className="font-mono font-bold text-saffron-dark">
                      −{formatRWF(g.earning.commission)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate/50">Seller earns</p>
                    <p className="font-mono font-bold text-green-700">{formatRWF(g.earning.net)}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate/40">
                  Commission is calculated when the order is delivered.
                </p>
              )}
            </section>
          ))}

          {/* ── Money ────────────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-card p-4 text-sm space-y-1">
            <h3 className="font-semibold text-forest mb-1">Payment</h3>
            <Row k="Subtotal" v={formatRWF(order.subtotal)} />
            <Row k="Delivery" v={order.deliveryFee ? formatRWF(order.deliveryFee) : "Free"} />
            {order.discount > 0 && (
              <Row
                k={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}${order.pointsRedeemed ? ` · ${order.pointsRedeemed} pts` : ""}`}
                v={`−${formatRWF(order.discount)}`}
              />
            )}
            <Row k="Total" v={formatRWF(order.total)} bold />
            {order.paymentRef && <Row k="Reference" v={order.paymentRef} mono />}
            {data?.transactions.map((t) => (
              <p key={t._id} className="text-xs text-slate/50 pt-1">
                {fmtDate(t.createdAt)} · {t.provider} · {t.status} · {formatRWF(t.amount)}
                {t.phone ? ` · ${t.phone}` : ""}
              </p>
            ))}
          </section>

          {/* ── Timeline & notes ─────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-card p-4 text-sm">
            <h3 className="font-semibold text-forest mb-2">Timeline</h3>
            <ol className="space-y-2">
              {[...order.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-xs text-slate/40 w-24 shrink-0">{fmtDate(h.at)}</span>
                  <span>
                    <span className="font-medium">{label(h.status)}</span>
                    {h.note && <span className="text-slate/60"> — {h.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex gap-2 mt-3">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={280}
                placeholder="Add an internal note…"
                className="flex-1 border border-forest/15 rounded-xl px-3 py-2 text-sm"
              />
              <button
                disabled={!note.trim() || noting}
                onClick={() =>
                  void run(async () => {
                    await addNote({ id: order._id, note: note.trim() }).unwrap();
                    setNote("");
                  }, "Note added")
                }
                className="px-3 rounded-xl bg-forest text-white text-sm disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </section>

          {/* ── Modals ───────────────────────────────────────────────────── */}
          <ConfirmModal
            open={modal === "confirm"}
            title="Confirm payment received?"
            body={
              <>
                Confirm that <b>{formatRWF(order.total)}</b> for <b>{order.orderNumber}</b> is in
                your account. The buyer is notified and the seller can start preparing.
              </>
            }
            confirmLabel="Yes, confirm"
            busy={confirming}
            onClose={() => setModal(null)}
            onConfirm={() =>
              void run(() => confirmPayment(order._id).unwrap(), "Payment confirmed")
            }
          />
          <ReasonModal
            open={modal === "reject"}
            title="Reject this payment"
            description="The buyer sees this reason and can resubmit their transaction ID."
            defaultValue="Transaction ID not found on our statement"
            confirmLabel="Reject payment"
            danger
            busy={rejecting}
            onClose={() => setModal(null)}
            onConfirm={(reason) =>
              void run(() => rejectPayment({ id: order._id, reason }).unwrap(), "Payment rejected")
            }
          />
          <ReasonModal
            open={modal === "cancel"}
            title="Cancel this order"
            description={
              order.paymentStatus === "paid"
                ? "Stock, coupons and points are restored. The order is flagged so you can refund the buyer."
                : "Stock, coupons and points are restored."
            }
            placeholder="Reason (shown in the timeline)"
            confirmLabel="Cancel order"
            danger
            busy={updating}
            onClose={() => setModal(null)}
            onConfirm={(reason) =>
              void run(
                () => updateStatus({ id: order._id, status: "cancelled", note: reason }).unwrap(),
                "Order cancelled",
              )
            }
          />
          <ConfirmModal
            open={modal === "deliver"}
            title="Mark as delivered?"
            body="This credits each seller's earnings (after commission), gives the buyer their loyalty points, and checks any referral reward. It can't be undone."
            confirmLabel="Mark delivered"
            busy={updating}
            onClose={() => setModal(null)}
            onConfirm={() =>
              void run(
                () => updateStatus({ id: order._id, status: "delivered" }).unwrap(),
                "Marked delivered",
              )
            }
          />
          <ConfirmModal
            open={modal === "refund"}
            title="Refund sent?"
            body="Only confirm once the money has actually been sent back to the buyer."
            confirmLabel="Yes, refund sent"
            busy={refunding}
            onClose={() => setModal(null)}
            onConfirm={() => void run(() => markRefunded(order._id).unwrap(), "Marked refunded")}
          />
        </>
      )}
    </Drawer>
  );
}

function Row({ k, v, bold, mono }: { k: string; v: string; bold?: boolean; mono?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-3 ${bold ? "font-bold text-forest pt-1 border-t border-forest/10" : ""}`}
    >
      <span className="text-slate/60">{k}</span>
      <span className={mono || bold ? "font-mono" : ""}>{v}</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function OrdersCenter() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const queue = params.get("queue") ?? "verify";
  const page = Number(params.get("page") ?? 1);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const q = useDebounced(search);
  const [openId, setOpenId] = useState<string | null>(params.get("order"));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const token = useAppSelector((s: RootState) => s.auth.accessToken);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const { data: countData } = useAdminOrderCountsQuery(undefined, { pollingInterval: 30_000 });
  const { data, isLoading, isFetching, refetch } = useAdminOrdersQuery(
    { queue: queue === "all" ? undefined : queue, q: q || undefined, page },
    { pollingInterval: 30_000 },
  );
  const [confirmPayment, { isLoading: confirming }] = useAdminConfirmPaymentMutation();
  const [markRefunded] = useAdminMarkRefundedMutation();
  const [updateStatus] = useUpdateOrderStatusMutation();
  const [bulkConfirm, { isLoading: bulking }] = useAdminBulkConfirmMutation();

  const counts = countData?.counts ?? {};
  const orders = data?.orders ?? [];
  const canBulk = queue === "verify" || queue === "awaiting";
  const current = QUEUES.find((x) => x.key === queue) ?? QUEUES[0];
  const allSelected = orders.length > 0 && orders.every((o) => selected.has(o._id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function exportCsv() {
    try {
      const base = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
      const res = await fetch(`${base}/admin/orders/export?queue=${queue === "all" ? "" : queue}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${queue}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export the orders. Please try again.");
    }
  }

  async function quick(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <Helmet>
        <title>Orders — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Orders & payments"
        subtitle="Work through each queue from top to bottom. Click an order to see everything and act on it."
        actions={
          <>
            <button
              onClick={() => void refetch()}
              className="flex items-center gap-1.5 text-sm bg-white shadow-card px-3 py-2 rounded-xl"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => void exportCsv()}
              className="flex items-center gap-1.5 text-sm bg-white shadow-card px-3 py-2 rounded-xl"
            >
              <Download size={14} /> Export CSV
            </button>
          </>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {QUEUES.map((x) => (
          <Chip
            key={x.key}
            active={queue === x.key}
            count={counts[x.key]}
            alert={x.alert}
            onClick={() => {
              setSelected(new Set());
              setParam("queue", x.key);
            }}
          >
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="text-xs text-slate/50 mb-3">{current.hint}</p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setParam("page", null);
          }}
          placeholder="Order #, buyer, phone, transaction ID…"
        />
        {canBulk && selected.size > 0 && (
          <button
            onClick={() => setBulkOpen(true)}
            className="bg-forest text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            Confirm {selected.size} payment{selected.size > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Empty>
          {q ? "No orders match your search." : "Nothing in this queue — you're all caught up 🎉"}
        </Empty>
      ) : (
        <Table
          head={[
            canBulk ? "✓" : "",
            "Order",
            "Buyer",
            "Total",
            "Payment",
            "Status",
            "Placed",
            "",
          ].filter((h, i) => h || i > 0 || canBulk)}
        >
          {orders.map((o) => (
            <tr
              key={o._id}
              className="hover:bg-forest/[0.03] cursor-pointer"
              onClick={() => setOpenId(o._id)}
            >
              {canBulk && (
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(o._id)}
                    onChange={() => toggle(o._id)}
                    aria-label={`Select ${o.orderNumber}`}
                  />
                </td>
              )}
              <td className="px-4 py-3 font-mono font-bold text-forest whitespace-nowrap">
                {o.orderNumber}
              </td>
              <td className="px-4 py-3">
                <div className="max-w-[160px] truncate">{buyerName(o)}</div>
                <div className="text-xs text-slate/40 font-mono">
                  {o.deliveryAddress.phone ?? o.buyerId?.phone}
                </div>
              </td>
              <td className="px-4 py-3 font-mono font-bold text-saffron whitespace-nowrap">
                {formatRWF(o.total)}
              </td>
              <td className="px-4 py-3">
                <Badge tone={paymentTone(o.paymentStatus)}>
                  {o.paymentStatus === "manual_review" ? "to verify" : label(o.paymentStatus)}
                </Badge>
                <div className="text-xs text-slate/40 mt-0.5">{label(o.paymentMethod)}</div>
                {o.manualPayment?.reference && (
                  <div className="text-xs font-mono text-blue-700">{o.manualPayment.reference}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={orderStatusTone(o.status)}>{label(o.status)}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-slate/50 whitespace-nowrap">
                {fmtDate(o.createdAt)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                {(o.paymentStatus === "manual_review" ||
                  (o.paymentStatus === "pending" && o.status === "placed")) && (
                  <button
                    disabled={confirming}
                    onClick={() =>
                      void quick(() => confirmPayment(o._id).unwrap(), `${o.orderNumber} confirmed`)
                    }
                    className="text-xs bg-forest text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    Confirm
                  </button>
                )}
                {o.paymentStatus === "refund_pending" && (
                  <button
                    onClick={() =>
                      void quick(
                        () => markRefunded(o._id).unwrap(),
                        `${o.orderNumber} marked refunded`,
                      )
                    }
                    className="text-xs bg-saffron text-white px-3 py-1.5 rounded-lg"
                  >
                    Refund sent
                  </button>
                )}
                {o.status === "payment_confirmed" && (
                  <button
                    onClick={() =>
                      void quick(
                        () => updateStatus({ id: o._id, status: "preparing" }).unwrap(),
                        `${o.orderNumber} → preparing`,
                      )
                    }
                    className="text-xs border border-forest/20 text-forest px-3 py-1.5 rounded-lg hover:bg-forest/5"
                  >
                    Start preparing
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {canBulk && orders.length > 0 && (
        <button
          onClick={() => setSelected(allSelected ? new Set() : new Set(orders.map((o) => o._id)))}
          className="mt-3 text-xs text-forest underline"
        >
          {allSelected ? "Clear selection" : "Select all on this page"}
        </button>
      )}

      <Pagination
        page={data?.page ?? 1}
        pages={data?.pages ?? 1}
        total={data?.total}
        onPage={(p) => setParam("page", String(p))}
      />

      <OrderDrawer
        orderId={openId}
        onClose={() => {
          setOpenId(null);
          if (params.get("order")) setParam("order", null);
        }}
      />

      <ConfirmModal
        open={bulkOpen}
        title={`Confirm ${selected.size} payment${selected.size > 1 ? "s" : ""}?`}
        body="Only do this if you've checked each one against your MoMo statement. Buyers are notified and sellers can start preparing."
        confirmLabel="Confirm all"
        busy={bulking}
        onClose={() => setBulkOpen(false)}
        onConfirm={async () => {
          try {
            const r = await bulkConfirm([...selected]).unwrap();
            toast.success(
              `${r.confirmed} payment(s) confirmed${r.skipped.length ? `, ${r.skipped.length} skipped` : ""}`,
            );
            setSelected(new Set());
            setBulkOpen(false);
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </>
  );
}
