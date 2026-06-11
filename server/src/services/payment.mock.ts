import { nanoid } from "nanoid";
import { Transaction } from "../models/Transaction.js";
import { Order } from "../models/Order.js";

/**
 * Mock MTN/Airtel MoMo USSD push.
 * Returns immediately with an `initiated` tx; resolves to `succeeded` after 3s
 * (or `manual_review` for amounts over 500k RWF as a placeholder rule).
 * Swap this with the real provider call when budget allows.
 */
export async function initiateMobileMoneyPush(opts: {
  orderId: string;
  userId: string;
  amount: number;
  method: "mtn_momo" | "airtel_money";
  phone: string;
}) {
  const mockRef = `MOMO-${nanoid(10).toUpperCase()}`;
  const tx = await Transaction.create({
    orderId: opts.orderId,
    userId: opts.userId,
    amount: opts.amount,
    method: opts.method,
    phone: opts.phone,
    mockRef,
    status: "initiated",
  });

  // Fire-and-forget simulated USSD confirmation
  setTimeout(async () => {
    try {
      const finalStatus = opts.amount > 500_000 ? "manual_review" : "succeeded";
      tx.status = finalStatus;
      await tx.save();
      const order = await Order.findById(opts.orderId);
      if (order) {
        order.paymentStatus = finalStatus === "succeeded" ? "paid" : "manual_review";
        order.paymentRef = mockRef;
        if (finalStatus === "succeeded") {
          order.status = "payment_confirmed";
          order.statusHistory.push({
            status: "payment_confirmed",
            at: new Date(),
            note: "Mock MoMo confirmed",
          });
        }
        await order.save();
      }
    } catch (err) {
      console.error("[payment.mock] confirmation failed", err);
    }
  }, 3000);

  return { mockRef, status: "initiated" as const };
}
