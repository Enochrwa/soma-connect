import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInitiatePaymentMutation } from "../../app/api";
import { CheckCircle, XCircle, Smartphone, Banknote, Info, Copy, Loader2 } from "lucide-react";
import { formatRWF } from "../../utils/format";

interface PaymentModalProps {
  orderId: string;
  orderNumber: string;
  total: number;
  method: "mtn_momo" | "airtel_money" | "cod";
  defaultPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentState = "idle" | "submitting" | "instructions" | "success" | "failed";

// SOMA Connect business payment details
const SOMA_MTN_NUMBER = "+250 788 000 000";
const SOMA_AIRTEL_NUMBER = "+250 732 000 000";

export function PaymentModal({
  orderId,
  orderNumber,
  total,
  method,
  defaultPhone = "",
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(defaultPhone);
  const [state, setState] = useState<PaymentState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [initiatePayment] = useInitiatePaymentMutation();

  const isMoMo = method !== "cod";
  const methodLabel =
    method === "mtn_momo"
      ? "MTN MoMo"
      : method === "airtel_money"
        ? "Airtel Money"
        : "Cash on Delivery";

  const headerColor =
    method === "mtn_momo"
      ? "bg-yellow-400"
      : method === "airtel_money"
        ? "bg-red-500"
        : "bg-green-600";

  const businessNumber = method === "mtn_momo" ? SOMA_MTN_NUMBER : SOMA_AIRTEL_NUMBER;

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function handlePay() {
    if (isMoMo && !phone.trim()) {
      setErrorMsg("Please enter your mobile money number.");
      return;
    }
    setErrorMsg("");
    setState("submitting");

    try {
      if (method === "cod") {
        await initiatePayment({ orderId, method, phone: "" }).unwrap();
        setState("success");
        setTimeout(() => {
          onSuccess();
          navigate(`/orders/${orderId}`);
        }, 1800);
        return;
      }

      // For MoMo: place order in pending_payment status and show instructions
      await initiatePayment({ orderId, method, phone: phone.trim() }).unwrap();
      setState("instructions");
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      setState("failed");
      setErrorMsg(e?.data?.error ?? "Failed to place order. Please try again.");
    }
  }

  function handleDone() {
    onSuccess();
    navigate(`/orders/${orderId}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className={`${headerColor} text-white p-5`}>
          <div className="flex items-center gap-3">
            {isMoMo ? <Smartphone size={22} /> : <Banknote size={22} />}
            <div>
              <h2 className="font-bold text-lg leading-none">{methodLabel}</h2>
              <p className="text-white/80 text-sm mt-0.5">Order {orderNumber}</p>
            </div>
          </div>
          <p className="font-mono font-bold text-2xl mt-3">{formatRWF(total)}</p>
        </div>

        <div className="p-5 space-y-4">
          {state === "idle" && (
            <>
              {isMoMo && (
                <div>
                  <label className="block text-sm font-semibold text-forest mb-1.5">
                    Your {method === "mtn_momo" ? "MTN" : "Airtel"} number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+250 7XX XXX XXX"
                    className="w-full border border-forest/20 rounded-xl px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
                  />
                  <div className="flex items-start gap-2 mt-2.5 bg-blue-50 rounded-lg p-2.5">
                    <Info size={13} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">
                      You'll receive payment instructions to send manually to our business number.
                      Your order will be confirmed once we verify the transfer.
                    </p>
                  </div>
                </div>
              )}
              {!isMoMo && (
                <p className="text-sm text-slate/70">
                  Your order will be placed now and you pay cash when it arrives. A confirmation
                  email will be sent.
                </p>
              )}
              {errorMsg && (
                <p className="text-vermillion text-xs flex items-center gap-1.5">
                  <XCircle size={13} /> {errorMsg}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handlePay}
                  className="flex-1 bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest/90 transition text-sm"
                >
                  {isMoMo ? "Continue to Payment" : "Place Order"}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 border border-forest/15 rounded-xl text-sm text-slate/60 hover:bg-forest/5 transition"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {state === "submitting" && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 className="animate-spin text-forest" size={32} />
              <p className="text-sm text-slate/70 font-medium">Placing your order…</p>
            </div>
          )}

          {state === "instructions" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-forest font-bold">
                <Smartphone size={18} />
                <span>Send payment manually</span>
              </div>
              <p className="text-xs text-slate/60">
                Open your {methodLabel} app and send the exact amount to our business number below.
                Use the order reference as your payment reason.
              </p>

              {/* Step 1 */}
              <div className="bg-saffron/10 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-slate/60 uppercase tracking-wide">
                  Step 1 — Send to this number
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-forest text-base">
                    {businessNumber}
                  </span>
                  <button
                    onClick={() => copyToClipboard(businessNumber, "phone")}
                    className="flex items-center gap-1 text-xs text-forest/60 hover:text-forest transition"
                  >
                    <Copy size={12} />
                    {copied === "phone" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-slate/50">SOMA Connect — {methodLabel}</p>
              </div>

              {/* Step 2 */}
              <div className="bg-forest/5 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-slate/60 uppercase tracking-wide">
                  Step 2 — Amount to send
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-forest text-base">
                    {formatRWF(total)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(String(total), "amount")}
                    className="flex items-center gap-1 text-xs text-forest/60 hover:text-forest transition"
                  >
                    <Copy size={12} />
                    {copied === "amount" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-forest/5 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-slate/60 uppercase tracking-wide">
                  Step 3 — Payment reason / reference
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-forest text-sm">{orderNumber}</span>
                  <button
                    onClick={() => copyToClipboard(orderNumber, "ref")}
                    className="flex items-center gap-1 text-xs text-forest/60 hover:text-forest transition"
                  >
                    <Copy size={12} />
                    {copied === "ref" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-2.5">
                <Info size={13} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  After sending, click "I've Paid" below. Our team will confirm your payment within
                  1–2 hours and your order will proceed.
                </p>
              </div>

              <button
                onClick={handleDone}
                className="w-full bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest/90 transition text-sm"
              >
                I've Paid — View My Order
              </button>
              <button
                onClick={onClose}
                className="w-full text-center text-xs text-slate/40 hover:text-slate/60 transition"
              >
                I'll pay later
              </button>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <CheckCircle size={44} className="text-green-500" />
              <div>
                <p className="font-bold text-forest text-lg">Order placed!</p>
                <p className="text-sm text-slate/60 mt-1">Redirecting to your order…</p>
              </div>
            </div>
          )}

          {state === "failed" && (
            <div className="flex flex-col items-center py-4 gap-3 text-center">
              <XCircle size={44} className="text-vermillion" />
              <div>
                <p className="font-bold text-forest">Something went wrong</p>
                <p className="text-sm text-slate/60 mt-1">{errorMsg}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setState("idle");
                    setErrorMsg("");
                  }}
                  className="flex-1 bg-forest text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  Try again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 border border-forest/15 rounded-xl py-2.5 text-sm text-slate/60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
