import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useGetOrderQuery } from "../app/api";
import { useOrderTracking } from "../hooks/useSocket";
import { formatRWF } from "../utils/format";
import { Loader2, Package, MapPin, CheckCircle, Circle, Clock, Zap } from "lucide-react";
import type { OrderStatus } from "../types";

const STATUSES: OrderStatus[] = [
  "placed",
  "payment_confirmed",
  "preparing",
  "packed",
  "out_for_delivery",
  "delivered",
];

const STATUS_LABELS: Record<string, string> = {
  placed: "Order placed",
  payment_confirmed: "Payment confirmed",
  preparing: "Preparing your order",
  packed: "Packed & ready",
  picked_up: "Picked up by courier",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered! 🎉",
  cancelled: "Cancelled",
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useGetOrderQuery(id!);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | undefined>(undefined);
  const [flash, setFlash] = useState(false);

  // Real-time order updates via Socket.IO
  useOrderTracking(id, (payload) => {
    const p = payload as { status: string; note?: string };
    setLiveStatus(p.status);
    setLiveNote(p.note);
    setFlash(true);
    refetch(); // also refresh the full order from server
    setTimeout(() => setFlash(false), 3000);
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );
  }

  if (!data?.order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Package className="text-forest/20 mx-auto mb-3" size={48} />
        <h2 className="font-display text-xl font-bold text-forest mb-2">Order not found</h2>
        <Link to="/orders" className="text-saffron hover:underline text-sm">
          Back to orders
        </Link>
      </div>
    );
  }

  const order = data.order;
  const currentStatus = liveStatus ?? order.status;
  const currentStep = STATUSES.indexOf(currentStatus as OrderStatus);

  return (
    <>
      <Helmet>
        <title>Order {order.orderNumber} — SOMA Market</title>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Live update flash */}
        {flash && liveStatus && (
          <div className="bg-saffron/15 border border-saffron/30 rounded-xl px-4 py-3 flex items-center gap-2 animate-pulse">
            <Zap size={16} className="text-saffron" />
            <span className="text-sm font-medium text-saffron-dark">
              Order updated: {STATUS_LABELS[liveStatus]}
              {liveNote ? ` — ${liveNote}` : ""}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              to="/orders"
              className="text-sm text-saffron hover:underline flex items-center gap-1 mb-3"
            >
              ← Back to orders
            </Link>
            <h1 className="font-display text-2xl font-bold text-forest">
              Order {order.orderNumber}
            </h1>
            <p className="text-sm text-slate/50 mt-1 flex items-center gap-1">
              <Clock size={13} /> {new Date(order.createdAt).toLocaleString("en-RW")}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-saffron text-xl">{formatRWF(order.total)}</div>
            <div
              className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-1 inline-block ${
                currentStatus === "delivered"
                  ? "bg-green-50 text-green-700"
                  : currentStatus === "cancelled"
                    ? "bg-vermillion/10 text-vermillion"
                    : "bg-saffron/15 text-saffron-dark"
              }`}
            >
              {STATUS_LABELS[currentStatus]}
            </div>
          </div>
        </div>

        {/* Tracker */}
        {currentStatus !== "cancelled" && (
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h2 className="font-display font-bold text-forest mb-5 flex items-center gap-2">
              Order tracking
              <span className="text-xs bg-forest/10 text-forest/60 px-2 py-0.5 rounded-full font-normal">
                Live
              </span>
            </h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-forest/10" />
              {STATUSES.map((status, i) => {
                const isCompleted = i <= currentStep;
                const isCurrent = i === currentStep;
                return (
                  <div key={status} className="relative flex items-start gap-4 pb-5 last:pb-0">
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isCompleted ? "bg-forest" : "bg-ivory border-2 border-forest/15"
                      } ${isCurrent && flash ? "ring-4 ring-saffron/30" : ""}`}
                    >
                      {isCompleted ? (
                        <CheckCircle size={16} className="text-saffron" />
                      ) : (
                        <Circle size={16} className="text-forest/20" />
                      )}
                    </div>
                    <div className={`pt-1 ${isCompleted ? "opacity-100" : "opacity-40"}`}>
                      <div
                        className={`text-sm font-semibold ${isCurrent ? "text-forest" : "text-slate/70"}`}
                      >
                        {STATUS_LABELS[status]}
                      </div>
                      {isCurrent && (
                        <div className="text-xs text-saffron font-medium mt-0.5">
                          {liveStatus === status && flash ? "Just updated!" : "Current status"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-display font-bold text-forest mb-4">Items ordered</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item._id} className="flex gap-4">
                <img
                  src={item.image ?? "/placeholder.png"}
                  alt={item.title}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate/10"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${item.productId}`}
                    className="text-sm font-semibold text-forest hover:text-saffron transition line-clamp-2"
                  >
                    {item.title}
                  </Link>
                  {item.variant && <p className="text-xs text-slate/50">{item.variant}</p>}
                  <p className="text-xs text-slate/50">Qty: {item.quantity}</p>
                </div>
                <span className="font-mono font-bold text-saffron text-sm shrink-0">
                  {formatRWF(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-forest" />
              <h3 className="font-display font-bold text-forest text-sm">Delivery address</h3>
            </div>
            <div className="text-sm text-slate/60 space-y-0.5">
              <p>{order.deliveryAddress.sector}</p>
              {order.deliveryAddress.district && <p>{order.deliveryAddress.district}</p>}
              {order.deliveryAddress.street && <p>{order.deliveryAddress.street}</p>}
              {order.deliveryAddress.phone && (
                <p className="font-mono">{order.deliveryAddress.phone}</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h3 className="font-display font-bold text-forest text-sm mb-3">Payment</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate/60">
                <span>Subtotal</span>
                <span className="font-mono">{formatRWF(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate/60">
                <span>Delivery</span>
                <span className="font-mono">{formatRWF(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-forest border-t border-forest/8 pt-1.5">
                <span>Total</span>
                <span className="font-mono text-saffron">{formatRWF(order.total)}</span>
              </div>
              <div className="text-xs text-slate/40 capitalize mt-1">
                {order.paymentMethod.replace("_", " ")} · {order.paymentStatus}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
