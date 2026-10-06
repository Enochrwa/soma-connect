/**
 * Manual mobile-money transfer: the buyer sends money to a business number and
 * submits the transaction reference; an admin verifies it and confirms the order.
 * Pure helpers live here so the rules can be unit-tested without a database.
 */
import { env } from "../config/env.js";
import { Notification } from "../models/Notification.js";
import { Transaction } from "../models/Transaction.js";

export type ManualProvider = "mtn_momo" | "airtel_money";

export interface ManualAccount {
  provider: ManualProvider;
  label: string;
  number: string;
  accountName: string;
}

/** Business numbers buyers can pay to. Only providers with a configured number are offered. */
export function manualAccounts(): ManualAccount[] {
  const accounts: ManualAccount[] = [];
  if (env.MANUAL_PAY_MTN_NUMBER.trim()) {
    accounts.push({
      provider: "mtn_momo",
      label: "MTN MoMo",
      number: env.MANUAL_PAY_MTN_NUMBER.trim(),
      accountName: env.MANUAL_PAY_ACCOUNT_NAME,
    });
  }
  if (env.MANUAL_PAY_AIRTEL_NUMBER.trim()) {
    accounts.push({
      provider: "airtel_money",
      label: "Airtel Money",
      number: env.MANUAL_PAY_AIRTEL_NUMBER.trim(),
      accountName: env.MANUAL_PAY_ACCOUNT_NAME,
    });
  }
  return accounts;
}

export function pawapayConfigured(): boolean {
  return Boolean(env.PAWAPAY_API_TOKEN);
}

/** Transaction IDs from MoMo SMS look like "MP260105.1234.A12345" or "1234567890". */
export function normalizeReference(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const ref = raw.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9._-]{4,40}$/.test(ref) ? ref : null;
}

/** Normalises a Rwandan mobile number to +2507XXXXXXXX, or null if it isn't one. */
export function normalizeRwandaPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s()-]/g, "");
  const m = digits.match(/^(?:\+?250|0)?(7\d{8})$/);
  return m ? `+250${m[1]}` : null;
}

/** Marks the order's manual transaction record as confirmed / rejected. */
export async function settleManualTransaction(orderId: unknown, ok: boolean, reason?: string) {
  await Transaction.updateMany(
    { orderId, provider: "manual", status: { $in: ["initiated", "manual_review"] } },
    {
      $set: {
        status: ok ? "succeeded" : "failed",
        ...(reason ? { "rawMeta.rejectedReason": reason } : {}),
      },
    },
  );
}

/** In-app notification for the buyer about the outcome of their payment. */
export async function notifyBuyerPayment(
  order: { _id: unknown; buyerId: unknown; orderNumber: string },
  outcome: "confirmed" | "rejected",
  reason?: string,
) {
  await Notification.create({
    userId: order.buyerId,
    type: outcome === "confirmed" ? "payment_confirmed" : "system",
    title: outcome === "confirmed" ? "Payment confirmed ✅" : "We couldn't verify your payment",
    body:
      outcome === "confirmed"
        ? `Your payment for order ${order.orderNumber} was confirmed. The seller is preparing it.`
        : `We couldn't find your payment for order ${order.orderNumber}${reason ? ` (${reason})` : ""}. Please re-check the transaction ID and submit it again.`,
    link: `/orders/${String(order._id)}`,
    metadata: { orderId: String(order._id) },
  });
}
