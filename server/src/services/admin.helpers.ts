import type { AuthedRequest } from "../middleware/auth.js";
import { AdminAction } from "../models/AdminAction.js";
import { User } from "../models/User.js";

/** Escapes user input so it can be used inside a RegExp safely (no injection / ReDoS). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const ORDER_QUEUES = [
  "verify",
  "awaiting",
  "ready",
  "active",
  "delivered",
  "refund",
  "cancelled",
  "all",
] as const;
export type OrderQueue = (typeof ORDER_QUEUES)[number];

/**
 * The admin "inbox" views for orders. Each queue answers one question:
 *  verify    – a buyer sent a manual transfer; is the money really there?
 *  awaiting  – order placed, no payment yet
 *  ready     – paid (or cash on delivery) but nobody has started preparing it
 *  active    – being prepared / packed / on the road
 *  refund    – money has to go back to the buyer
 */
export function orderQueueFilter(queue: string | undefined): Record<string, unknown> {
  switch (queue) {
    case "verify":
      return { status: "placed", paymentStatus: "manual_review" };
    case "awaiting":
      return { status: "placed", paymentStatus: { $in: ["pending", "failed"] } };
    case "ready":
      return { status: "payment_confirmed" };
    case "active":
      return { status: { $in: ["preparing", "packed", "picked_up", "out_for_delivery"] } };
    case "delivered":
      return { status: "delivered" };
    case "refund":
      return { paymentStatus: "refund_pending" };
    case "cancelled":
      return { status: "cancelled" };
    default:
      return {};
  }
}

/** Records an admin action in the audit log. Never throws — auditing must not break the action. */
export async function logAdmin(
  req: AuthedRequest,
  action: string,
  target: { type: string; id?: unknown },
  summary: string,
  meta?: Record<string, unknown>,
) {
  try {
    const admin = await User.findById(req.user!.id).select("profile.name phone").lean();
    await AdminAction.create({
      adminId: req.user!.id,
      adminName: admin?.profile?.name ?? admin?.phone,
      action,
      targetType: target.type,
      targetId: target.id === undefined ? undefined : String(target.id),
      summary,
      meta,
    });
  } catch (e) {
    console.error("[admin-audit] failed to log", action, e);
  }
}

/** Quotes a value for CSV (RFC 4180) and neutralises spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
