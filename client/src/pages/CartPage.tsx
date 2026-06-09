import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { removeItem, updateQty, selectCartTotal } from "../features/cart/cartSlice";
import { formatRWF } from "../utils/format";
import { Trash2 } from "lucide-react";

export default function CartPage() {
  const items = useAppSelector((s) => s.cart.items);
  const dispatch = useAppDispatch();
  const subtotal = selectCartTotal(items);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-forest">Your cart is empty</h1>
        <p className="text-slate/60 mt-2">Browse the marketplace and add something you love.</p>
        <Link to="/catalog" className="btn-primary mt-6">Shop now</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-3">
        {items.map((i) => (
          <div key={i.productId + (i.variant ?? "")} className="card p-3 flex gap-3">
            <img src={i.image} alt={i.title} className="w-24 h-24 rounded-lg object-cover" />
            <div className="flex-1">
              <div className="font-medium">{i.title}</div>
              <div className="price text-sm mt-1">{formatRWF(i.unitPrice)}</div>
              <div className="flex items-center gap-2 mt-2">
                <button className="btn-ghost px-2 py-1" onClick={() => dispatch(updateQty({ productId: i.productId, variant: i.variant, quantity: i.quantity - 1 }))}>-</button>
                <span className="font-mono w-8 text-center">{i.quantity}</span>
                <button className="btn-ghost px-2 py-1" onClick={() => dispatch(updateQty({ productId: i.productId, variant: i.variant, quantity: i.quantity + 1 }))}>+</button>
              </div>
            </div>
            <button className="text-vermillion p-2" onClick={() => dispatch(removeItem({ productId: i.productId, variant: i.variant }))}><Trash2 size={18}/></button>
          </div>
        ))}
      </div>
      <div className="card p-4 h-fit">
        <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-mono">{formatRWF(subtotal)}</span></div>
        <div className="flex justify-between text-sm mt-2 text-slate/60"><span>Delivery</span><span>calculated next</span></div>
        <div className="border-t mt-3 pt-3 flex justify-between font-semibold"><span>Total</span><span className="price">{formatRWF(subtotal)}</span></div>
        <Link to="/checkout" className="btn-primary w-full mt-4">Checkout</Link>
      </div>
    </div>
  );
}