import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInitiatePaymentMutation, useGetPaymentStatusQuery } from "../../app/api";
import { Loader2, CheckCircle, XCircle, Smartphone, Banknote, Info } from "lucide-react";
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

type PaymentState = "idle" | "initiating" | "awaiting_confirmation" | "success" | "failed";

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
  const [txRef, setTxRef] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [initiatePayment] = useInitiatePaymentMutation();

  // Poll payment status every 3s while awaiting USSD confirmation
  const { data: statusData } = useGetPaymentStatusQuery(txRef ?? "", {
    skip: !txRef || state !== "awaiting_confirmation",
    pollingInterval: 3000,
  });

  useEffect(() => {
    if (!statusData) return;
    if (statusData.status === "succeeded") {
      setState("success");
      setTimeout(() => {
        onSuccess();
        navigate(`/orders/${orderId}`);
      }, 1800);
    } else if (statusData.status === "failed") {
      setState("failed");
      setErrorMsg("Payment was declined or timed out. Please try again.");
    }
  }, [statusData, orderId, navigate, onSuccess]);

  async function handlePay() {
    if (method !== "cod" && !phone.trim()) {
      setErrorMsg("Please enter your mobile money number.");
      return;
    }
    setErrorMsg("");
    setState("initiating");

    try {
      const result = await initiatePayment({ orderId, method, phone: phone.trim() }).unwrap();

      if (method === "cod") {
        setState("success");
        setTimeout(() => { onSuccess(); navigate(`/orders/${orderId}`); }, 1500);
        return;
      }

      // For MoMo: poll via txRef / mockRef
      setTxRef((result as { mockRef?: string; txRef?: string }).mockRef ?? (result as { mockRef?: string; txRef?: string }).txRef ?? null);
      setState("awaiting_confirmation");
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      setState("failed");
      setErrorMsg(e?.data?.error ?? "Payment initiation failed. Please try again.");
    }
  }

  const isMoMo = method !== "cod";
  const methodLabel =
    method === "mtn_momo" ? "MTN MoMo" : method === "airtel_money" ? "Airtel Money" : "Cash on Delivery";
  const headerColor =
    method === "mtn_momo" ? "bg-yellow-400" : method === "airtel_money" ? "bg-red-500" : "bg-green-600";

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
                    {method === "mtn_momo" ? "MTN" : "Airtel"} number
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
                      A USSD push will be sent to this number — approve it on your phone to confirm.
                      {import.meta.env.DEV && (
                        <span className="block mt-0.5 font-medium text-blue-500">
                          Demo mode: auto-confirms in ~3 seconds.
                        </span>
                      )}
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
                  {isMoMo ? "Send USSD Push" : "Place Order"}
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

          {state === "initiating" && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 className="animate-spin text-forest" size={32} />
              <p className="text-sm text-slate/70 font-medium">Sending payment request…</p>
            </div>
          )}

          {state === "awaiting_confirmation" && (
            <div className="flex flex-col items-center py-4 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-saffron/15 flex items-center justify-center">
                <Smartphone size={26} className="text-saffron" />
              </div>
              <div>
                <p className="font-bold text-forest">Check your phone</p>
                <p className="text-sm text-slate/60 mt-1">
                  USSD prompt sent to{" "}
                  <span className="font-mono font-semibold">{phone}</span>.
                  <br />Approve to complete payment.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate/40 mt-1">
                <Loader2 size={12} className="animate-spin" />
                Waiting for confirmation…
              </div>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <CheckCircle size={44} className="text-green-500" />
              <div>
                <p className="font-bold text-forest text-lg">Payment confirmed!</p>
                <p className="text-sm text-slate/60 mt-1">Redirecting to your order…</p>
              </div>
            </div>
          )}

          {state === "failed" && (
            <div className="flex flex-col items-center py-4 gap-3 text-center">
              <XCircle size={44} className="text-vermillion" />
              <div>
                <p className="font-bold text-forest">Payment failed</p>
                <p className="text-sm text-slate/60 mt-1">{errorMsg}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => { setState("idle"); setErrorMsg(""); }}
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
