import { useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { clearCart, selectCartTotal } from "../features/cart/cartSlice";
import { useCreateOrderMutation, usePayMockMutation } from "../app/api";
import { formatRWF } from "../utils/format";
import { KIGALI_SECTORS } from "../constants";

export default function CheckoutPage() {
  const items = useAppSelector((s) => s.cart.items);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const [payMock] = usePayMockMutation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    sector: KIGALI_SECTORS[0],
    phone: "",
    deliverySpeed: "standard" as "standard" | "express" | "pickup",
    paymentMethod: "mtn_momo" as "mtn_momo" | "airtel_money" | "cod",
  });
  const [pushing, setPushing] = useState(false);
  const subtotal = selectCartTotal(items);

  async function placeOrder() {
    try {
      const res = await createOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, variant: i.variant })),
        deliveryAddress: { sector: form.sector, phone: form.phone },
        deliverySpeed: form.deliverySpeed,
        paymentMethod: form.paymentMethod,
      }).unwrap();
      if (form.paymentMethod !== "cod") {
        setPushing(true);
        await payMock({ orderId: res.order._id, method: form.paymentMethod, phone: form.phone });
        await new Promise((r) => setTimeout(r, 3200));
        setPushing(false);
      }
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      dispatch(clearCart());
      navigate(`/orders/${res.order._id}`);
    } catch (e) {
      alert("We couldn't place that order — please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="font-display text-3xl text-forest">Checkout</h1>
      <div className="card p-5 space-y-4">
        <div className="flex gap-2 text-xs">
          {["Delivery", "Payment", "Confirm"].map((label, i) => (
            <span key={i} className={`pill ${step === i + 1 ? "bg-forest text-ivory" : "bg-white border"}`}>{i+1}. {label}</span>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <label className="block text-sm">Sector
              <select className="block w-full mt-1 rounded-lg border p-2" value={form.sector} onChange={(e)=>setForm({...form, sector:e.target.value})}>
                {KIGALI_SECTORS.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-sm">Phone
              <input className="block w-full mt-1 rounded-lg border p-2 font-mono" placeholder="+250 7XX XXX XXX" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} />
            </label>
            <label className="block text-sm">Delivery speed
              <select className="block w-full mt-1 rounded-lg border p-2" value={form.deliverySpeed} onChange={(e)=>setForm({...form, deliverySpeed:e.target.value as any})}>
                <option value="standard">Standard (2–3 days, free over RWF 10,000)</option>
                <option value="express">Express (next day, RWF 2,000)</option>
                <option value="pickup">Pickup point (free)</option>
              </select>
            </label>
            <button className="btn-primary" onClick={()=>setStep(2)}>Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {[
              { v: "mtn_momo", label: "MTN Mobile Money", hint: "USSD push to your MTN number" },
              { v: "airtel_money", label: "Airtel Money", hint: "USSD push to your Airtel number" },
              { v: "cod", label: "Cash on Delivery", hint: "Pay the rider when your order arrives" },
            ].map((o) => (
              <label key={o.v} className={`block card p-4 cursor-pointer ${form.paymentMethod === o.v ? "ring-2 ring-saffron" : ""}`}>
                <input type="radio" className="mr-2" checked={form.paymentMethod===o.v} onChange={()=>setForm({...form, paymentMethod: o.v as any})} />
                <span className="font-medium">{o.label}</span>
                <div className="text-xs text-slate/60 ml-6">{o.hint}</div>
              </label>
            ))}
            <div className="flex gap-2"><button className="btn-ghost" onClick={()=>setStep(1)}>Back</button><button className="btn-primary" onClick={()=>setStep(3)}>Next</button></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm text-slate/70">{items.length} items · Deliver to {form.sector}</div>
            <div className="flex justify-between font-semibold"><span>Total</span><span className="price">{formatRWF(subtotal)}</span></div>
            <button className="btn-primary w-full" disabled={isLoading || pushing} onClick={placeOrder}>
              {pushing ? "Sending USSD push…" : isLoading ? "Placing order…" : "Place order"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}