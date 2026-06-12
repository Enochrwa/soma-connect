import { Link, useNavigate } from "react-router-dom";
import { Breadcrumb } from "../components/ui/Breadcrumb";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { updateQty, removeItem, clearCart } from "../features/cart/cartSlice";
import type { RootState } from "../app/store";
import { formatRWF } from "../utils/format";
import { Trash2, ShoppingBag, ChevronRight, Plus, Minus, Tag } from "lucide-react";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const items = useAppSelector((s: RootState) => s.cart.items);
  const user = useAppSelector((s: RootState) => s.auth.user);

  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const deliveryFee = subtotal > 50000 ? 0 : 2000;
  const total = subtotal + deliveryFee;

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="text-forest/20 mx-auto mb-5" size={64} />
        <h2 className="font-display text-2xl font-bold text-forest mb-2">Your cart is empty</h2>
        <p className="text-slate/50 mb-8">
          Browse products and add them to your cart to get started.
        </p>
        <Link
          to="/search"
          className="bg-forest text-white font-bold px-8 py-3 rounded-xl hover:bg-forest-light transition inline-flex items-center gap-2"
        >
          <ShoppingBag size={17} /> Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb className="mb-4" items={[{ label: "Cart" }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-forest">
          Cart{" "}
          <span className="text-slate/40 font-normal text-lg">
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        </h1>
        <button
          onClick={() => dispatch(clearCart())}
          className="text-sm text-vermillion hover:underline flex items-center gap-1"
        >
          <Trash2 size={14} /> Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.variant}`}
              className="bg-white rounded-2xl shadow-card p-4 flex gap-4"
            >
              <Link to={`/products/${item.productId}`} className="shrink-0">
                <img
                  src={item.image || "/placeholder.png"}
                  alt={item.title}
                  className="w-20 h-20 rounded-xl object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${item.productId}`}
                  className="font-semibold text-sm text-forest hover:text-saffron transition line-clamp-2"
                >
                  {item.title}
                </Link>
                {item.variant && (
                  <span className="text-xs text-slate/50 mt-0.5 block">{item.variant}</span>
                )}
                {item.sellerName && (
                  <span className="text-xs text-slate/40 block">by {item.sellerName}</span>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-forest/15 rounded-xl overflow-hidden">
                    <button
                      onClick={() => {
                        if (item.quantity === 1) {
                          dispatch(
                            removeItem({ productId: item.productId, variant: item.variant }),
                          );
                        } else {
                          dispatch(
                            updateQty({
                              productId: item.productId,
                              variant: item.variant,
                              quantity: item.quantity - 1,
                            }),
                          );
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center hover:bg-forest/5 transition text-slate"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-mono text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        dispatch(
                          updateQty({
                            productId: item.productId,
                            variant: item.variant,
                            quantity: item.quantity + 1,
                          }),
                        )
                      }
                      disabled={item.quantity >= item.stock}
                      className="w-8 h-8 flex items-center justify-center hover:bg-forest/5 transition text-slate disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-forest">
                      {formatRWF(item.unitPrice * item.quantity)}
                    </div>
                    <div className="text-xs text-slate/40 font-mono">
                      {formatRWF(item.unitPrice)} each
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  dispatch(removeItem({ productId: item.productId, variant: item.variant }))
                }
                className="text-slate/30 hover:text-vermillion transition shrink-0 self-start"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-forest">Order summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate/70">
                <span>Subtotal ({items.reduce((a, i) => a + i.quantity, 0)} items)</span>
                <span className="font-mono">{formatRWF(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate/70">
                <span>Delivery</span>
                <span
                  className={`font-mono ${deliveryFee === 0 ? "text-green-600 font-semibold" : ""}`}
                >
                  {deliveryFee === 0 ? "FREE" : formatRWF(deliveryFee)}
                </span>
              </div>
              {deliveryFee > 0 && (
                <p className="text-xs text-slate/40 italic">
                  Free delivery on orders over {formatRWF(50000)}
                </p>
              )}
            </div>

            <div className="border-t border-forest/8 pt-3 flex justify-between font-bold">
              <span className="text-forest">Total</span>
              <span className="font-mono text-xl text-saffron">{formatRWF(total)}</span>
            </div>

            <button
              onClick={() => {
                if (!user) {
                  navigate("/login", { state: { from: "/checkout" } });
                } else {
                  navigate("/checkout");
                }
              }}
              className="w-full bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest-light transition flex items-center justify-center gap-2"
            >
              Proceed to checkout <ChevronRight size={17} />
            </button>

            <Link to="/search" className="block text-center text-sm text-saffron hover:underline">
              Continue shopping
            </Link>
          </div>

          {/* Coupon */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-forest" />
              <span className="font-semibold text-sm text-forest">Have a coupon?</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code"
                className="flex-1 rounded-xl border border-forest/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
              />
              <button className="bg-forest text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-forest-light transition">
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
