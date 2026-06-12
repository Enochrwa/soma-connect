import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { io } from "socket.io-client";
import {
  useGetOrderQuery,
  useCancelOrderMutation,
  useOpenDisputeMutation,
  useGetLoyaltyQuery,
} from "../app/api";
import { useAppSelector } from "../app/hooks";
import type { RootState } from "../app/store";
import { formatRWF } from "../utils/format";
import { ExternalLink, AlertTriangle, XCircle, Loader2 } from "lucide-react";

const STEPS = [
  "placed",
  "payment_confirmed",
  "preparing",
  "packed",
  "picked_up",
  "out_for_delivery",
  "delivered",
];
const LABELS: Record<string, string> = {
  placed: "Order placed",
  payment_confirmed: "Payment confirmed",
  preparing: "Seller preparing",
  packed: "Packed",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered ✅",
  cancelled: "Cancelled",
};

const DISPUTE_REASONS = [
  { value: "wrong_item", label: "Wrong item received" },
  { value: "damaged", label: "Item arrived damaged" },
  { value: "not_delivered", label: "Not delivered" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "other", label: "Other" },
];

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { data, refetch } = useGetOrderQuery(id!);
  const user = useAppSelector((s: RootState) => s.auth.user);
  const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();
  const [openDispute, { isLoading: disputeLoading }] = useOpenDisputeMutation();
  const { refetch: refetchLoyalty } = useGetLoyaltyQuery();

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("wrong_item");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeError, setDisputeError] = useState("");
  const [disputeSuccess, setDisputeSuccess] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000");
    socket.emit("subscribeOrder", id);
    socket.on("orderUpdate", () => refetch());
    return () => {
      socket.disconnect();
    };
  }, [id, refetch]);

  const order = data?.order;
  if (!order)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-slate/50">
        <Loader2 className="animate-spin text-forest mx-auto mb-4" size={28} />
        Loading order…
      </div>
    );

  const currentIdx = STEPS.indexOf(order.status);
  const isCancellable = ["placed", "payment_confirmed"].includes(order.status);
  const canDispute = order.status === "delivered" && !disputeSuccess;
  const isBuyer = user?.id === order.buyerId || user?.id === (order.buyerId as unknown as string);

  async function handleCancel() {
    if (!order) return;
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelError("");
    try {
      await cancelOrder(order._id).unwrap();
      refetch();
      refetchLoyalty();
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } }).data?.error;
      setCancelError(msg ?? "Failed to cancel order.");
    }
  }

  async function handleDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setDisputeError("");
    if (disputeDesc.length < 20) {
      setDisputeError("Please provide at least 20 characters of description.");
      return;
    }
    try {
      await openDispute({
        orderId: order._id,
        reason: disputeReason,
        description: disputeDesc,
      }).unwrap();
      setDisputeSuccess(true);
      setShowDisputeForm(false);
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } }).data?.error;
      setDisputeError(msg ?? "Failed to open dispute.");
    }
  }

  return (
    <>
      <Helmet>
        <title>Order {order.orderNumber} — SOMA Market</title>
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-2xl text-forest">Order {order.orderNumber}</h1>
        <p className="text-sm text-slate/60">Live status updates — no refresh needed.</p>

        {/* Status cancelled banner */}
        {order.status === "cancelled" && (
          <div className="mt-4 bg-vermillion/10 border border-vermillion/20 rounded-2xl p-4 flex items-center gap-3">
            <XCircle size={20} className="text-vermillion flex-shrink-0" />
            <div>
              <p className="font-semibold text-vermillion">Order Cancelled</p>
              {order.paymentStatus === "refunded" && (
                <p className="text-sm text-slate/60 mt-0.5">
                  Your payment has been marked for refund.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress steps */}
        {order.status !== "cancelled" && (
          <ol className="mt-6 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full grid place-items-center font-mono text-xs flex-shrink-0
                  ${i < currentIdx ? "bg-forest text-ivory" : i === currentIdx ? "bg-saffron text-slate" : "bg-white border"}`}
                >
                  {i < currentIdx ? "✓" : i + 1}
                </span>
                <span className={i <= currentIdx ? "text-forest font-medium" : "text-slate/50"}>
                  {LABELS[s]}
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Tracking link */}
        {(order.trackingNumber || order.trackingUrl) && (
          <div className="mt-6 bg-forest/5 border border-forest/15 rounded-2xl p-4">
            <p className="text-sm font-semibold text-forest mb-1">Delivery tracking</p>
            {order.trackingNumber && (
              <p className="text-xs text-slate/60 font-mono">Tracking #: {order.trackingNumber}</p>
            )}
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-forest font-medium mt-2 hover:underline"
              >
                <ExternalLink size={14} /> Track my delivery
              </a>
            )}
          </div>
        )}

        {/* Order totals */}
        <div className="mt-6 bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-display text-lg text-forest mb-3">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate/60">
              <span>Subtotal</span>
              <span className="font-mono">{formatRWF(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate/60">
              <span>Delivery</span>
              <span className="font-mono">
                {order.deliveryFee === 0 ? "FREE" : formatRWF(order.deliveryFee)}
              </span>
            </div>
            {(order.discount ?? 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span className="font-mono">−{formatRWF(order.discount)}</span>
              </div>
            )}
            {(order.pointsRedeemed ?? 0) > 0 && (
              <div className="flex justify-between text-saffron">
                <span>Loyalty points ({order.pointsRedeemed} pts)</span>
                <span className="font-mono">−{formatRWF(order.loyaltyDiscount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-forest/8">
              <span className="text-forest">Total</span>
              <span className="font-mono text-saffron">{formatRWF(order.total)}</span>
            </div>
            {(order.pointsEarned ?? 0) > 0 && (
              <p className="text-xs text-forest/60 text-right">
                +{order.pointsEarned} loyalty points earned
              </p>
            )}
          </div>
        </div>

        {/* Buyer actions */}
        {isBuyer && (
          <div className="mt-6 space-y-3">
            {/* Cancel order */}
            {isCancellable && (
              <div>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-2 text-sm text-vermillion border border-vermillion/30 rounded-xl px-4 py-2.5 hover:bg-vermillion/5 transition disabled:opacity-50"
                >
                  {cancelling ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Cancel order
                </button>
                {cancelError && <p className="text-vermillion text-xs mt-1">{cancelError}</p>}
              </div>
            )}

            {/* Open dispute */}
            {canDispute && !showDisputeForm && (
              <button
                onClick={() => setShowDisputeForm(true)}
                className="flex items-center gap-2 text-sm text-amber-700 border border-amber-300 rounded-xl px-4 py-2.5 hover:bg-amber-50 transition"
              >
                <AlertTriangle size={14} />
                Report an issue with this order
              </button>
            )}

            {disputeSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
                ✅ Your dispute has been submitted. Our team will review it within 1–2 business
                days.
              </div>
            )}

            {showDisputeForm && (
              <div className="bg-white rounded-2xl shadow-card p-5">
                <h3 className="font-display text-forest font-bold mb-4">Report an issue</h3>
                <form onSubmit={handleDispute} className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-forest block mb-1">Reason</label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {DISPUTE_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-forest block mb-1">
                      Description *
                    </label>
                    <textarea
                      value={disputeDesc}
                      onChange={(e) => setDisputeDesc(e.target.value)}
                      placeholder="Please describe the issue in detail (min 20 characters)"
                      className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm h-28 resize-none"
                    />
                  </div>
                  {disputeError && <p className="text-vermillion text-xs">{disputeError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={disputeLoading}
                      className="btn-primary flex items-center gap-2"
                    >
                      {disputeLoading && <Loader2 size={14} className="animate-spin" />}
                      Submit dispute
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDisputeForm(false)}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        <Link to="/orders" className="block mt-8 text-sm text-forest/60 hover:text-forest">
          ← Back to all orders
        </Link>
      </div>
    </>
  );
}
