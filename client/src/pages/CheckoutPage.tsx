import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import {
  useCreateOrderMutation,
  useValidateCouponMutation,
  useGetLoyaltyQuery,
  useGetPaymentConfigQuery,
} from "../app/api";
import { clearCart } from "../features/cart/cartSlice";
import { PaymentModal } from "../components/payment/PaymentModal";
import type { RootState } from "../app/store";
import { formatRWF } from "../utils/format";
import { Loader2, MapPin, CreditCard, Truck, CheckCircle, Tag, Gift, X } from "lucide-react";

type PaymentMethod = "mtn_momo" | "airtel_money" | "manual_transfer" | "cod";
type DeliverySpeed = "standard" | "express" | "pickup";

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  emoji: string;
  desc: string;
}

const ALL_PAYMENT_OPTIONS: Record<PaymentMethod, PaymentOption> = {
  mtn_momo: {
    value: "mtn_momo",
    label: "MTN MoMo",
    emoji: "📱",
    desc: "Approve the payment on your phone — confirmed instantly",
  },
  airtel_money: {
    value: "airtel_money",
    label: "Airtel Money",
    emoji: "📲",
    desc: "Approve the payment on your phone — confirmed instantly",
  },
  manual_transfer: {
    value: "manual_transfer",
    label: "Manual mobile-money transfer",
    emoji: "🏦",
    desc: "Send to our MTN/Airtel number — an admin confirms within 1–2 hours",
  },
  cod: {
    value: "cod",
    label: "Cash on Delivery",
    emoji: "💵",
    desc: "Pay when your order arrives",
  },
};

// Keep in sync with server/src/config/business.ts
const FREE_STANDARD_DELIVERY_THRESHOLD = 10_000;
const MAX_POINTS_REDEMPTION_PCT = 0.2;
const POINTS_PER_RWF = 1 / 100;

const DELIVERY_OPTIONS = [
  { value: "standard" as DeliverySpeed, label: "Standard", fee: 1500, eta: "2–4 days" },
  { value: "express" as DeliverySpeed, label: "Express", fee: 2000, eta: "Same day" },
  { value: "pickup" as DeliverySpeed, label: "Pickup", fee: 0, eta: "Ready in 2 hrs" },
];

function deliveryFeeFor(speed: DeliverySpeed, subtotal: number) {
  if (speed === "pickup") return 0;
  if (speed === "express") return 2000;
  return subtotal >= FREE_STANDARD_DELIVERY_THRESHOLD ? 0 : 1500;
}

const DISTRICTS = [
  "Kigali",
  "Nyarugenge",
  "Gasabo",
  "Kicukiro",
  "Musanze",
  "Rubavu",
  "Rusizi",
  "Huye",
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s: RootState) => s.cart.items);
  const user = useAppSelector((s: RootState) => s.auth.user);
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const [validateCoupon, { isLoading: validatingCoupon }] = useValidateCouponMutation();
  const { data: loyaltyData } = useGetLoyaltyQuery();

  const [form, setForm] = useState({
    sector: "",
    district: "Kigali",
    street: "",
    phone: user?.phone ?? "",
  });
  const { data: payConfig, isLoading: payConfigLoading } = useGetPaymentConfigQuery();
  // Only offer what the server can actually process right now.
  const paymentOptions = useMemo<PaymentOption[]>(() => {
    if (!payConfig) return [ALL_PAYMENT_OPTIONS.cod];
    const opts: PaymentOption[] = [];
    if (payConfig.pawapay)
      opts.push(ALL_PAYMENT_OPTIONS.mtn_momo, ALL_PAYMENT_OPTIONS.airtel_money);
    if (payConfig.manual.enabled) opts.push(ALL_PAYMENT_OPTIONS.manual_transfer);
    if (payConfig.cod) opts.push(ALL_PAYMENT_OPTIONS.cod);
    return opts;
  }, [payConfig]);
  const [chosenMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  // Default to the first available option until the buyer picks one.
  const paymentMethod: PaymentMethod =
    chosenMethod && paymentOptions.some((o) => o.value === chosenMethod)
      ? chosenMethod
      : (paymentOptions[0]?.value ?? "cod");
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("standard");
  const [error, setError] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");

  // Loyalty points state
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [pendingOrder, setPendingOrder] = useState<{
    id: string;
    number: string;
    total: number;
  } | null>(null);

  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const deliveryFee = deliveryFeeFor(deliverySpeed, subtotal);
  const couponDiscount = couponApplied?.discountAmount ?? 0;

  // Points can cover at most 20% of what's left after the coupon (same rule as the server)
  const availablePoints = loyaltyData?.points ?? 0;
  const maxRedeemable = Math.max(
    0,
    Math.min(availablePoints, Math.floor((subtotal - couponDiscount) * MAX_POINTS_REDEMPTION_PCT)),
  );
  const appliedPoints = Math.min(pointsToRedeem, maxRedeemable); // 1 point = 1 RWF
  const loyaltyDiscount = appliedPoints;
  const total = Math.max(0, subtotal + deliveryFee - couponDiscount - loyaltyDiscount);
  const pointsToEarn = Math.floor(
    Math.max(0, subtotal - couponDiscount - loyaltyDiscount) * POINTS_PER_RWF,
  );

  if (!items.length) {
    navigate("/cart");
    return null;
  }

  async function handleValidateCoupon() {
    setCouponError("");
    if (!couponInput.trim()) return;
    try {
      const result = await validateCoupon({
        code: couponInput.trim(),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variant: i.variant,
        })),
      }).unwrap();
      setCouponApplied({ code: result.coupon.code, discountAmount: result.coupon.discountAmount });
      setCouponError("");
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } }).data?.error;
      setCouponError(msg ?? "Invalid coupon.");
      setCouponApplied(null);
    }
  }

  function removeCoupon() {
    setCouponApplied(null);
    setCouponInput("");
    setCouponError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.sector.trim()) {
      setError("Please enter your sector/neighbourhood.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    try {
      const result = await createOrder({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variant: i.variant,
        })),
        deliveryAddress: form,
        deliverySpeed,
        paymentMethod,
        couponCode: couponApplied?.code,
        pointsToRedeem: appliedPoints > 0 ? appliedPoints : undefined,
      }).unwrap();
      setPendingOrder({
        id: result.order._id,
        number: result.order.orderNumber,
        total: result.order.total,
      });
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } }).data?.error;
      setError(msg ?? "Order failed. Please try again.");
    }
  }

  return (
    <>
      <Helmet>
        <title>Checkout — OneAfricaShop</title>
        <meta name="description" content="Complete your OneAfricaShop order securely." />
      </Helmet>

      {pendingOrder && (
        <PaymentModal
          orderId={pendingOrder.id}
          orderNumber={pendingOrder.number}
          total={pendingOrder.total}
          method={paymentMethod}
          defaultPhone={form.phone}
          onClose={() => {
            dispatch(clearCart());
            navigate(`/orders/${pendingOrder.id}`);
          }}
          onSuccess={() => dispatch(clearCart())}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-forest mb-8">Checkout</h1>

        {error && (
          <div className="bg-vermillion/10 border border-vermillion/20 text-vermillion rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Delivery address */}
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={18} className="text-forest" />
                  <h2 className="font-display font-bold text-forest">Delivery address</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                      Sector / Neighbourhood <span className="text-vermillion">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.sector}
                      onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                      placeholder="e.g. Remera, Gisozi, Kimisagara"
                      className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                      District
                    </label>
                    <select
                      value={form.district}
                      onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                      className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-saffron/30"
                    >
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                      Phone <span className="text-vermillion">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+250 7XX XXX XXX"
                      className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-saffron/30"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                      Street / Landmark (optional)
                    </label>
                    <input
                      type="text"
                      value={form.street}
                      onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                      placeholder="Street name or nearby landmark"
                      className="w-full rounded-xl border border-forest/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery speed */}
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Truck size={18} className="text-forest" />
                  <h2 className="font-display font-bold text-forest">Delivery speed</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {DELIVERY_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setDeliverySpeed(opt.value)}
                      className={`border-2 rounded-xl p-3 text-left transition ${deliverySpeed === opt.value ? "border-forest bg-forest/5" : "border-forest/10 hover:border-forest/25"}`}
                    >
                      <div className="font-semibold text-sm text-forest">{opt.label}</div>
                      <div className="text-xs text-slate/50 mt-0.5">{opt.eta}</div>
                      <div
                        className={`font-mono text-sm font-bold mt-1 ${deliveryFeeFor(opt.value, subtotal) === 0 ? "text-green-600" : "text-saffron"}`}
                      >
                        {deliveryFeeFor(opt.value, subtotal) === 0
                          ? "Free"
                          : formatRWF(deliveryFeeFor(opt.value, subtotal))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coupon code */}
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={18} className="text-forest" />
                  <h2 className="font-display font-bold text-forest">Coupon code</h2>
                </div>
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-mono font-bold text-green-800 text-sm">
                        {couponApplied.code}
                      </p>
                      <p className="text-xs text-green-600">
                        Saves you {formatRWF(couponApplied.discountAmount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="p-1 hover:bg-green-100 rounded-lg"
                    >
                      <X size={16} className="text-green-700" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 rounded-xl border border-forest/15 px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-saffron/30"
                    />
                    <button
                      type="button"
                      onClick={handleValidateCoupon}
                      disabled={validatingCoupon || !couponInput.trim()}
                      className="px-4 py-2.5 bg-forest text-white rounded-xl text-sm font-medium hover:bg-forest/90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {validatingCoupon ? <Loader2 size={14} className="animate-spin" /> : null}
                      Apply
                    </button>
                  </div>
                )}
                {couponError && <p className="text-vermillion text-xs mt-2">{couponError}</p>}
              </div>

              {/* Loyalty points */}
              {availablePoints > 0 && (
                <div className="bg-white rounded-2xl shadow-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Gift size={18} className="text-forest" />
                    <h2 className="font-display font-bold text-forest">Loyalty points</h2>
                    <span className="text-xs bg-saffron/15 text-saffron-dark px-2 py-0.5 rounded-full ml-auto">
                      {availablePoints} pts available
                    </span>
                  </div>
                  <p className="text-xs text-slate/60 mb-3">
                    Redeem up to {maxRedeemable} points for {formatRWF(maxRedeemable)} off (max 20%
                    of order).
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={maxRedeemable}
                      value={appliedPoints}
                      onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                      className="flex-1 accent-forest"
                    />
                    <span className="font-mono text-sm text-forest font-bold w-24 text-right">
                      {appliedPoints} pts = {formatRWF(loyaltyDiscount)}
                    </span>
                  </div>
                  {pointsToRedeem > 0 && (
                    <button
                      type="button"
                      onClick={() => setPointsToRedeem(0)}
                      className="text-xs text-slate/50 hover:text-slate mt-2"
                    >
                      Remove points discount
                    </button>
                  )}
                </div>
              )}

              {/* Payment method */}
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={18} className="text-forest" />
                  <h2 className="font-display font-bold text-forest">Payment method</h2>
                </div>
                {payConfigLoading && (
                  <p className="text-xs text-slate/50 mb-2">Loading payment options…</p>
                )}
                <div className="space-y-2">
                  {paymentOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${paymentMethod === opt.value ? "border-forest bg-forest/5" : "border-forest/10 hover:border-forest/25"}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => setPaymentMethod(opt.value)}
                        className="sr-only"
                      />
                      <span className="text-2xl">{opt.emoji}</span>
                      <div>
                        <div className="font-semibold text-sm text-forest">{opt.label}</div>
                        <div className="text-xs text-slate/50">{opt.desc}</div>
                      </div>
                      {paymentMethod === opt.value && (
                        <CheckCircle size={18} className="text-forest ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-2xl shadow-card p-5 sticky top-24">
                <h2 className="font-display font-bold text-forest mb-4">Order summary</h2>
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3 text-sm">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-forest line-clamp-2">{item.title}</p>
                        <p className="text-xs text-slate/50">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-saffron shrink-0">
                        {formatRWF(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-forest/8 mt-4 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate/60">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatRWF(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate/60">
                    <span>Delivery</span>
                    <span
                      className={`font-mono ${deliveryFee === 0 ? "text-green-600 font-semibold" : ""}`}
                    >
                      {deliveryFee === 0 ? "FREE" : formatRWF(deliveryFee)}
                    </span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon ({couponApplied?.code})</span>
                      <span className="font-mono">−{formatRWF(couponDiscount)}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-saffron">
                      <span>Loyalty points ({appliedPoints} pts)</span>
                      <span className="font-mono">−{formatRWF(loyaltyDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-forest/8">
                    <span className="text-forest">Total</span>
                    <span className="font-mono text-saffron">{formatRWF(total)}</span>
                  </div>
                  {pointsToEarn > 0 && (
                    <p className="text-xs text-slate/50 pt-1">
                      You'll earn {pointsToEarn} loyalty points once this order is delivered.
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
