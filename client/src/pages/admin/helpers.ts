import { createContext, useContext, useEffect, useState } from "react";

export type Tone = "green" | "red" | "amber" | "blue" | "slate" | "forest";

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Pulls a readable message out of an RTK Query / fetch error. */
export function errMsg(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = err as { data?: { error?: string; message?: string } };
  return e?.data?.error ?? e?.data?.message ?? fallback;
}

export const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-RW", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const fmtDay = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const ToastCtx = createContext<{ success: (t: string) => void; error: (t: string) => void }>(
  {
    success: () => {},
    error: () => {},
  },
);
export const useToast = () => useContext(ToastCtx);

export function orderStatusTone(status: string): Tone {
  if (status === "delivered") return "green";
  if (status === "cancelled") return "red";
  if (status === "placed") return "amber";
  return "blue";
}
export function paymentTone(status: string): Tone {
  if (status === "paid") return "green";
  if (status === "manual_review") return "blue";
  if (status === "failed") return "red";
  if (status === "refund_pending") return "amber";
  if (status === "refunded") return "slate";
  return "amber";
}
export const label = (s: string) => s.replace(/_/g, " ");
