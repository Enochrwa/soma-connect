import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useInitiatePaymentMutation,
  usePawapayPredictMutation,
  usePawapayInitiateMutation,
  useLazyPawapayStatusQuery,
  useGetPaymentConfigQuery,
  useSubmitManualPaymentMutation,
} from "../../app/api";
import { CheckCircle, XCircle, Smartphone, Banknote, Info, Copy, Loader2 } from "lucide-react";
import { formatRWF } from "../../utils/format";

interface PaymentModalProps {
  orderId: string;
  orderNumber: string;
  total: number;
  method: "mtn_momo" | "airtel_money" | "manual_transfer" | "cod";
  defaultPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentState = "idle" | "submitting" | "waiting" | "submitted" | "success" | "failed";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000; // MoMo PIN entry can take a couple of minutes

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
  const [pawapayPredict] = usePawapayPredictMutation();
  const [pawapayInitiate] = usePawapayInitiateMutation();
  const [fetchPawapayStatus] = useLazyPawapayStatusQuery();
  const [submitManualPayment] = useSubmitManualPaymentMutation();
  const { data: payConfig, isLoading: configLoading } = useGetPaymentConfigQuery(undefined, {
    skip: method !== "manual_transfer",
  });
  const accounts = payConfig?.manual.accounts ?? [];
  const [provider, setProvider] = useState<"mtn_momo" | "airtel_money" | "">("");
  const [reference, setReference] = useState("");
  const activeProvider = provider || accounts[0]?.provider || "";
  const account = accounts.find((a) => a.provider === activeProvider);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef(0);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  const isManual = method === "manual_transfer";
  const isMoMo = method === "mtn_momo" || method === "airtel_money"; // instant, via pawaPay
  const methodLabel =
    method === "mtn_momo"
      ? "MTN MoMo"
      : method === "airtel_money"
        ? "Airtel Money"
        : isManual
          ? "Manual transfer"
          : "Cash on Delivery";

  const headerColor =
    method === "mtn_momo"
      ? "bg-yellow-400"
      : method === "airtel_money"
        ? "bg-red-500"
        : isManual
          ? "bg-forest"
          : "bg-green-600";

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function succeed() {
    stopPolling();
    setState("success");
    setTimeout(() => {
      onSuccess();
      navigate(`/orders/${orderId}`);
    }, 1800);
  }

  function pollDepositStatus(depositId: string) {
    deadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    pollRef.current = setInterval(async () => {
      try {
        const result = await fetchPawapayStatus(depositId).unwrap();
        if (result.status === "succeeded") {
          succeed();
        } else if (result.status === "failed") {
          stopPolling();
          setState("failed");
          setErrorMsg(result.message ?? "The payment wasn't approved. You can try again.");
        } else if (Date.now() > deadlineRef.current) {
          stopPolling();
          setState("failed");
          setErrorMsg(
            "We haven't had confirmation yet. If you approved the payment, your order will update automatically — otherwise please try again.",
          );
        }
      } catch {
        // Transient network error — keep polling until the deadline.
      }
    }, POLL_INTERVAL_MS);
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
        succeed();
        return;
      }

      // pawaPay validates the number and tells us which network it's on.
      const prediction = await pawapayPredict({ phone: phone.trim() }).unwrap();
      const { depositId } = await pawapayInitiate({
        orderId,
        phone: prediction.phoneNumber,
        provider: prediction.provider,
      }).unwrap();
      setState("waiting");
      pollDepositStatus(depositId);
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      setState("failed");
      setErrorMsg(e?.data?.error ?? "Failed to place order. Please try again.");
    }
  }

  async function handleManualSubmit() {
    if (!activeProvider) {
      setErrorMsg("Choose the network you paid with.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Enter the number you paid from.");
      return;
    }
    if (reference.trim().length < 4) {
      setErrorMsg("Enter the transaction ID from your MoMo confirmation SMS.");
      return;
    }
    setErrorMsg("");
    setState("submitting");
    try {
      await submitManualPayment({
        orderId,
        provider: activeProvider,
        senderPhone: phone.trim(),
        reference: reference.trim(),
      }).unwrap();
      onSuccess();
      setState("submitted");
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      setState("idle");
      setErrorMsg(e?.data?.error ?? "Couldn't submit your payment details. Please try again.");
    }
  }

  function retry() {
    stopPolling();
    setErrorMsg("");
    setState("idle");
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
                      You'll get a prompt on your phone to approve the payment with your PIN. Your
                      order is confirmed automatically.
                    </p>
                  </div>
                </div>
              )}
              {isManual && (
                <div className="space-y-3">
                  {configLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="animate-spin text-forest" size={24} />
                    </div>
                  ) : !account ? (
                    <p className="text-sm text-vermillion">
                      Manual transfer isn't available right now. Please choose another payment
                      method.
                    </p>
                  ) : (
                    <>
                      {accounts.length > 1 && (
                        <div className="flex gap-2">
                          {accounts.map((a) => (
                            <button
                              key={a.provider}
                              type="button"
                              onClick={() => setProvider(a.provider)}
                              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${activeProvider === a.provider ? "border-forest bg-forest/5 text-forest" : "border-forest/10 text-slate/60"}`}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="bg-saffron/10 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-semibold text-slate/60 uppercase tracking-wide">
                          1 · Send {formatRWF(total)} to
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-forest text-base">
                            {account.number}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(account.number, "phone")}
                            className="flex items-center gap-1 text-xs text-forest/60 hover:text-forest transition"
                          >
                            <Copy size={12} /> {copied === "phone" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <p className="text-xs text-slate/50">
                          {account.label} · {account.accountName}
                        </p>
                      </div>

                      <div className="bg-forest/5 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-semibold text-slate/60 uppercase tracking-wide">
                          2 · Use this as the payment reason
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-forest text-sm">
                            {orderNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(orderNumber, "ref")}
                            className="flex items-center gap-1 text-xs text-forest/60 hover:text-forest transition"
                          >
                            <Copy size={12} /> {copied === "ref" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-slate/60 uppercase tracking-wide pt-1">
                        3 · After paying, tell us how
                      </p>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Number you paid from, e.g. 0788 123 456"
                        className="w-full border border-forest/20 rounded-xl px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
                      />
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Transaction ID from the MoMo SMS"
                        className="w-full border border-forest/20 rounded-xl px-4 py-2.5 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-saffron/30"
                      />
                      <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-2.5">
                        <Info size={13} className="text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700">
                          Our team checks the transfer and confirms your order, usually within 1–2
                          hours. You'll get a notification.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
              {method === "cod" && (
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
                  onClick={isManual ? handleManualSubmit : handlePay}
                  disabled={isManual && !account}
                  className="flex-1 bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest/90 transition text-sm disabled:opacity-50"
                >
                  {isManual
                    ? "Submit payment details"
                    : isMoMo
                      ? "Continue to Payment"
                      : "Place Order"}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 border border-forest/15 rounded-xl text-sm text-slate/60 hover:bg-forest/5 transition"
                >
                  {isManual ? "I'll pay later" : "Cancel"}
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

          {state === "waiting" && (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="relative">
                <Smartphone size={40} className="text-forest" />
                <Loader2
                  className="animate-spin text-yellow-500 absolute -right-2 -bottom-2"
                  size={18}
                />
              </div>
              <div>
                <p className="font-bold text-forest">Check your phone</p>
                <p className="text-sm text-slate/60 mt-1">
                  We sent a payment request to{" "}
                  <span className="font-mono font-semibold text-forest">{phone}</span>. Enter your{" "}
                  {methodLabel} PIN to approve {formatRWF(total)}.
                </p>
              </div>
              <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-2.5 text-left w-full">
                <Info size={13} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  This can take up to a minute. Your order updates automatically — no need to
                  refresh or pay again.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full text-center text-xs text-slate/40 hover:text-slate/60 transition"
              >
                Close and check later
              </button>
            </div>
          )}

          {state === "submitted" && (
            <div className="flex flex-col items-center py-4 gap-3 text-center">
              <CheckCircle size={44} className="text-green-500" />
              <div>
                <p className="font-bold text-forest text-lg">Payment details received</p>
                <p className="text-sm text-slate/60 mt-1">
                  We'll verify your transfer of {formatRWF(total)} and confirm order {orderNumber} —
                  usually within 1–2 hours. Track it from your order page.
                </p>
              </div>
              <button
                onClick={handleDone}
                className="w-full bg-forest text-white font-bold py-3 rounded-xl hover:bg-forest/90 transition text-sm"
              >
                View my order
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
                    retry();
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
