/**
 * pawaPay reconciliation cycle.
 *
 * Callbacks can be missed — network issues, deploys, config mistakes. pawaPay's
 * integration guide explicitly recommends a status recheck cycle so customers
 * aren't left waiting and our records never drift from theirs.
 *
 * Rule we follow (from their guide): only mark a payment FAILED when there is a
 * clear indication of failure. NOT_FOUND means it never reached pawaPay, so it
 * is safe to fail. Anything ambiguous is left pending for the next cycle.
 */
import { Transaction } from "../models/Transaction.js";
import { Payout } from "../models/Payout.js";
import { Order } from "../models/Order.js";
import {
  checkDepositStatus,
  checkPayoutStatus,
  type PawaPayPaymentStatus,
} from "./pawapay.service.js";
import { applyDepositResult, applyPayoutResult } from "../routes/pawapay.routes.js";

const STALE_AFTER_MS = 15 * 60 * 1000; // only touch payments pending >15 min

export async function reconcilePawaPayDeposits() {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const stuck = await Transaction.find({
    provider: "pawapay",
    status: "initiated",
    createdAt: { $lte: cutoff },
  }).limit(100);

  for (const tx of stuck) {
    if (!tx.pawapayDepositId) continue;
    try {
      const result = await checkDepositStatus(tx.pawapayDepositId);

      if (result.status === "FOUND" && result.data) {
        await applyDepositResult(
          tx.pawapayDepositId,
          result.data.status as PawaPayPaymentStatus,
          result.data as Record<string, unknown>,
        );
      } else if (result.status === "NOT_FOUND") {
        // Never reached pawaPay — safe to fail.
        tx.status = "failed";
        tx.pawapayStatus = "FAILED";
        tx.pawapayFailureCode = "NOT_FOUND";
        tx.needsReconciliation = false;
        tx.lastStatusCheckAt = new Date();
        await tx.save();
        const order = await Order.findById(tx.orderId);
        if (order && order.paymentStatus === "pending") {
          order.paymentStatus = "failed";
          await order.save();
        }
      } else {
        tx.lastStatusCheckAt = new Date();
        await tx.save();
      }
    } catch (err) {
      // Leave it for the next cycle rather than guessing.
      console.error("[pawapay.reconcile] deposit check failed", tx.pawapayDepositId, err);
    }
  }
  if (stuck.length) console.log(`[pawapay.reconcile] checked ${stuck.length} deposit(s)`);
}

export async function reconcilePawaPayPayouts() {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const stuck = await Payout.find({
    disbursementProvider: "pawapay",
    status: "processing",
    updatedAt: { $lte: cutoff },
  }).limit(100);

  for (const payout of stuck) {
    if (!payout.pawapayPayoutId) continue;
    try {
      const result = await checkPayoutStatus(payout.pawapayPayoutId);
      if (result.status === "FOUND" && result.data) {
        await applyPayoutResult(
          payout.pawapayPayoutId,
          result.data.status as PawaPayPaymentStatus,
          result.data.failureReason as { failureCode?: string; failureMessage?: string } | undefined,
        );
      } else if (result.status === "NOT_FOUND") {
        payout.status = "failed";
        payout.pawapayStatus = "FAILED";
        payout.pawapayFailureCode = "NOT_FOUND";
        payout.needsReconciliation = false;
        await payout.save();
      } else {
        payout.lastStatusCheckAt = new Date();
        await payout.save();
      }
    } catch (err) {
      console.error("[pawapay.reconcile] payout check failed", payout.pawapayPayoutId, err);
    }
  }
  if (stuck.length) console.log(`[pawapay.reconcile] checked ${stuck.length} payout(s)`);
}

export async function runPawaPayReconciliation() {
  await reconcilePawaPayDeposits();
  await reconcilePawaPayPayouts();
}
