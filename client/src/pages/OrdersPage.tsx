import { Link } from "react-router-dom";
import { Breadcrumb } from "../components/ui/Breadcrumb";
import { useGetMyOrdersQuery } from "../app/api";
import { formatRWF } from "../utils/format";
import { Package, Loader2, ChevronRight, Clock } from "lucide-react";
import type { OrderStatus } from "../types";

const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: "bg-saffron/15 text-saffron-dark",
  payment_confirmed: "bg-blue-50 text-blue-700",
  preparing: "bg-blue-50 text-blue-700",
  packed: "bg-purple-50 text-purple-700",
  picked_up: "bg-indigo-50 text-indigo-700",
  out_for_delivery: "bg-orange-50 text-orange-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-vermillion/10 text-vermillion",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Order placed",
  payment_confirmed: "Payment confirmed",
  preparing: "Preparing",
  packed: "Packed",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const { data, isLoading } = useGetMyOrdersQuery();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );
  }

  if (!data?.orders?.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package className="text-forest/20 mx-auto mb-5" size={64} />
        <h2 className="font-display text-2xl font-bold text-forest mb-2">No orders yet</h2>
        <p className="text-slate/50 mb-8">When you place an order, it will show up here.</p>
        <Link
          to="/search"
          className="bg-forest text-white font-bold px-8 py-3 rounded-xl hover:bg-forest-light transition"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumb className="mb-4" items={[{ label: "My Orders" }]} />
      <h1 className="font-display text-2xl font-bold text-forest mb-6">My Orders</h1>
      <div className="space-y-4">
        {data.orders.map((order) => (
          <Link
            key={order._id}
            to={`/orders/${order._id}`}
            className="block bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all p-5 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate/50 font-semibold">
                    {order.orderNumber}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  {order.items.slice(0, 3).map((item) => (
                    <img
                      key={item._id}
                      src={item.image ?? "/placeholder.png"}
                      alt={item.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-forest/5 flex items-center justify-center text-xs font-semibold text-forest/50">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-saffron">{formatRWF(order.total)}</div>
                <div className="text-xs text-slate/40 mt-1 flex items-center gap-1 justify-end">
                  <Clock size={10} /> {new Date(order.createdAt).toLocaleDateString("en-RW")}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-forest/8">
              <span className="text-xs text-slate/50">
                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-saffron font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
                View details <ChevronRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
