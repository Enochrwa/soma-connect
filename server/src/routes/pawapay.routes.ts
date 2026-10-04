import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";
import { Order } from "../models/Order.js";
import { Transaction } from "../models/Transaction.js";
import { Payout } from "../models/Payout.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";
import { sendPayoutNotificationEmail } from "../services/email.service.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { emitOrderUpdate } from "../socket/index.js";
import { applyOrderPaid } from "../services/order.lifecycle.js";
import { markEarningsPaid, releaseEarnings } from "../services/earnings.service.js";
import {
  predictProvider,
  initiateDeposit,
  checkDepositStatus,
  getActiveConfig,
  PawaPayIndeterminateError,
  type PawaPayProvider,
  type PawaPayPaymentStatus,
} from "../services/pawapay.service.js";

export const pawapayRouter = Router();

/** Maps a pawaPay provider to the payment method values already used in our schemas. */
function providerToMethod(p: string): "mtn_momo" | "airtel_money" {
  return p === "AIRTEL_RWA" ? "airtel_money" : "mtn_momo";
}

/** Customer-facing copy for pawaPay failure codes. The raw failureMessage is for us, not them. */
function friendlyFailure(code?: string | null): string {
  switch (code) {
    case "PAYER_NOT_FOUND":
      return "That mobile money number couldn't be found. Check the number and try again.";
    case "INSUFFICIENT_BALANCE":
      return "There wasn't enough balance in the wallet. Top up and try again.";
    case "PAYMENT_NOT_APPROVED":
      return "The payment wasn't approved on your phone. You can try again.";
    case "PAYER_LIMIT_REACHED":
      return "This payment is over your mobile money limit. Try a smaller amount or contact your provider.";
    case "TRANSACTION_ALREADY_IN_PROCESS":
      return "You already have a payment in progress. Finish or cancel it, then try again.";
    case "PROVIDER_TEMPORARILY_UNAVAILABLE":
      return "That mobile money service is temporarily unavailable. Try the other network or again shortly.";
    default:
      return "The payment didn't go through. You can try again.";
  }
}

// ── Providers available for Rwanda (drives the checkout UI) ──────────────────
pawapayRouter.get("/providers", requireAuth, async (_req, res, next) => {
  try {
    res.json(await getActiveConfig("DEPOSIT"));
  } catch (e) {
    next(e);
  }
});

// ── Validate a phone number + predict its network ────────────────────────────
const predictSchema = z.object({ phone: z.string().min(9) });

pawapayRouter.post(
  "/predict",
  requireAuth,
  validate(predictSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { phone } = req.body as z.infer<typeof predictSchema>;
      res.json(await predictProvider(phone));
    } catch (e) {
      next(e);
    }
  },
);

// ── Initiate a deposit ───────────────────────────────────────────────────────
const initiateSchema = z.object({
  orderId: z.string(),
  phone: z.string().min(9),
  provider: z.enum(["MTN_MOMO_RWA", "AIRTEL_RWA"]).optional(),
});

pawapayRouter.post(
  "/initiate",
  requireAuth,
  validate(initiateSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { orderId, phone, provider } = req.body as z.infer<typeof initiateSchema>;

      const order = await Order.findById(orderId);
      if (!order) throw new HttpError(404, "Order not found.");
      if (String(order.buyerId) !== req.user!.id) throw new HttpError(403, "Not your order.");
      if (order.paymentStatus === "paid") throw new HttpError(400, "This order is already paid.");
      if (order.status === "cancelled") throw new HttpError(400, "This order was cancelled.");
      if (order.paymentMethod === "cod" && order.status !== "placed") {
        throw new HttpError(400, "This order is set to cash on delivery.");
      }

      // Let pawaPay validate/sanitise the number and tell us the network.
      // The customer's explicit choice wins if they overrode the prediction.
      const prediction = await predictProvider(phone);
      const chosen = (provider ?? prediction.provider) as PawaPayProvider;
      const msisdn = prediction.phoneNumber;

      // Generate and PERSIST the depositId *before* calling pawaPay, so we can
      // always reconcile even if the call never returns.
      const depositId = randomUUID();
      const method = providerToMethod(chosen);

      const tx = await Transaction.create({
        orderId: order._id,
        userId: req.user!.id,
        amount: order.total,
        method,
        phone: msisdn,
        provider: "pawapay",
        pawapayDepositId: depositId,
        pawapayProvider: chosen,
        status: "initiated",
      });

      order.paymentMethod = method;
      order.paymentStatus = "pending";
      order.paymentRef = depositId;
      order.statusHistory.push({
        status: "placed",
        at: new Date(),
        note: `pawaPay ${chosen} payment request sent — awaiting customer approval`,
      });
      await order.save();

      try {
        const result = await initiateDeposit({
          depositId,
          amount: order.total,
          phoneNumber: msisdn,
          provider: chosen,
          customerMessage: `Soma ${order.orderNumber}`,
          orderId: String(order._id),
          clientReferenceId: order.orderNumber,
        });

        if (result.status === "REJECTED") {
          tx.status = "failed";
          tx.pawapayStatus = "FAILED";
          tx.pawapayFailureCode = result.failureReason?.failureCode;
          tx.pawapayFailureMessage = result.failureReason?.failureMessage;
          await tx.save();
          order.paymentStatus = "failed";
          await order.save();
          throw new HttpError(400, friendlyFailure(result.failureReason?.failureCode), {
            failureCode: result.failureReason?.failureCode,
          });
        }

        tx.pawapayStatus = result.status === "DUPLICATE_IGNORED" ? "SUBMITTED" : result.status;
        await tx.save();
      } catch (err) {
        if (err instanceof PawaPayIndeterminateError) {
          // We do NOT know if this succeeded. Leave it pending for the
          // reconciliation job rather than wrongly failing a real payment.
          tx.needsReconciliation = true;
          await tx.save();
          return res.status(202).json({
            depositId,
            status: "PENDING",
            message:
              "We're confirming your payment. This can take a moment — your order will update automatically.",
          });
        }
        throw err;
      }

      res.json({
        depositId,
        status: "SUBMITTED",
        provider: chosen,
        message: "Check your phone and enter your Mobile Money PIN to approve the payment.",
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── Status poll (fallback when the callback is slow) ─────────────────────────
pawapayRouter.get("/status/:depositId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const tx = await Transaction.findOne({ pawapayDepositId: req.params.depositId });
    if (!tx) throw new HttpError(404, "Transaction not found.");
    if (String(tx.userId) !== req.user!.id) throw new HttpError(403, "Not your transaction.");

    if (tx.status === "succeeded" || tx.status === "failed") {
      return res.json({
        status: tx.status,
        pawapayStatus: tx.pawapayStatus,
        message: tx.status === "failed" ? friendlyFailure(tx.pawapayFailureCode) : undefined,
      });
    }

    const remote = await checkDepositStatus(req.params.depositId);
    if (remote.status === "FOUND" && remote.data) {
      await applyDepositResult(
        req.params.depositId,
        remote.data.status as PawaPayPaymentStatus,
        remote.data as Record<string, unknown>,
      );
    }
    const updated = await Transaction.findOne({ pawapayDepositId: req.params.depositId });
    res.json({
      status: updated?.status,
      pawapayStatus: updated?.pawapayStatus,
      message:
        updated?.status === "failed" ? friendlyFailure(updated.pawapayFailureCode) : undefined,
    });
  } catch (e) {
    next(e);
  }
});

/** Rejects callbacks that don't carry our shared secret, when one is configured. */
function callbackAuthorised(req: { query: Record<string, unknown> }): boolean {
  if (!env.PAWAPAY_CALLBACK_SECRET) {
    // Without a secret anyone who guesses the URL could POST a fake COMPLETED and
    // get free goods. Only tolerate that on a developer machine, never in production.
    return env.NODE_ENV !== "production";
  }
  return req.query.token === env.PAWAPAY_CALLBACK_SECRET;
}

// ── Deposit callback ─────────────────────────────────────────────────────────
// Unauthenticated by design (pawaPay can't send our JWT). Correlated by the
// depositId we generated, and gated by an optional shared secret in the query.
pawapayRouter.post("/callback", async (req, res, next) => {
  try {
    if (!callbackAuthorised(req)) throw new HttpError(401, "Unauthorised callback.");
    const body = req.body as {
      depositId?: string;
      status?: PawaPayPaymentStatus;
      failureReason?: { failureCode?: string; failureMessage?: string };
    };
    if (!body.depositId || !body.status) throw new HttpError(400, "Malformed callback payload.");

    await applyDepositResult(body.depositId, body.status, body as Record<string, unknown>);
    // Always 200 quickly so pawaPay doesn't retry a callback we've handled.
    res.status(200).json({ received: true });
  } catch (e) {
    next(e);
  }
});

// ── Payout callback ──────────────────────────────────────────────────────────
pawapayRouter.post("/payouts/callback", async (req, res, next) => {
  try {
    if (!callbackAuthorised(req)) throw new HttpError(401, "Unauthorised callback.");
    const body = req.body as {
      payoutId?: string;
      status?: PawaPayPaymentStatus;
      failureReason?: { failureCode?: string; failureMessage?: string };
    };
    if (!body.payoutId || !body.status) throw new HttpError(400, "Malformed callback payload.");

    await applyPayoutResult(body.payoutId, body.status, body.failureReason);
    res.status(200).json({ received: true });
  } catch (e) {
    next(e);
  }
});

/**
 * Applies a deposit's status to our Transaction + Order. Idempotent: a repeated
 * or out-of-order callback can never double-apply or reopen a settled payment.
 * Exported so the reconciliation job can reuse it.
 */
export async function applyDepositResult(
  depositId: string,
  status: PawaPayPaymentStatus,
  payload: Record<string, unknown> = {},
) {
  const tx = await Transaction.findOne({ pawapayDepositId: depositId });
  if (!tx) return;
  if (tx.status === "succeeded" || tx.status === "failed") return; // already settled

  const failureReason = payload.failureReason as
    { failureCode?: string; failureMessage?: string } | undefined;

  tx.pawapayStatus = status;
  tx.lastStatusCheckAt = new Date();
  if (typeof payload.providerTransactionId === "string") {
    tx.providerTransactionId = payload.providerTransactionId;
  }

  const order = await Order.findById(tx.orderId);

  if (status === "COMPLETED") {
    tx.status = "succeeded";
    tx.needsReconciliation = false;
    if (order) {
      const outcome = await applyOrderPaid(order, "Payment confirmed by pawaPay");
      emitOrderUpdate(String(order._id), {
        status: order.status,
        at: new Date(),
        ...(outcome === "cancelled_refund_pending"
          ? { paymentFailed: false, refundPending: true }
          : {}),
      });
    }
  } else if (status === "FAILED") {
    tx.status = "failed";
    tx.needsReconciliation = false;
    tx.pawapayFailureCode = failureReason?.failureCode;
    tx.pawapayFailureMessage = failureReason?.failureMessage;
    if (order) {
      order.paymentStatus = "failed";
      order.statusHistory.push({
        status: order.status,
        at: new Date(),
        note: `Payment failed (${failureReason?.failureCode ?? "unknown"}) — customer can retry`,
      });
      await order.save();
      emitOrderUpdate(String(order._id), { status: order.status, paymentFailed: true });
    }
  } else if (status === "IN_RECONCILIATION") {
    // pawaPay is determining the true final status. Leave pending, keep watching.
    tx.needsReconciliation = true;
  }
  // ACCEPTED / ENQUEUED / SUBMITTED / PROCESSING are transient — stay pending.

  await tx.save();
}

/** Same idempotent treatment for seller payouts. */
export async function applyPayoutResult(
  payoutId: string,
  status: PawaPayPaymentStatus,
  failureReason?: { failureCode?: string; failureMessage?: string },
) {
  const payout = await Payout.findOne({ pawapayPayoutId: payoutId });
  if (!payout) return;
  if (payout.status === "sent" || payout.status === "failed") return;

  payout.pawapayStatus = status;
  payout.lastStatusCheckAt = new Date();

  if (status === "COMPLETED") {
    payout.status = "sent";
    payout.needsReconciliation = false;
    await markEarningsPaid(String(payout._id));
    // Notify the seller only now — the money has actually moved.
    try {
      const seller = await Seller.findById(payout.sellerId).lean();
      const user = seller ? await User.findById(seller.userId).lean() : null;
      if (user?.email && seller) {
        sendPayoutNotificationEmail(user.email, seller.storeName, payout.amount, payoutId).catch(
          (e) => console.error("[pawapay] payout email failed", e),
        );
      }
    } catch (e) {
      console.error("[pawapay] payout email lookup failed", e);
    }
  } else if (status === "FAILED") {
    payout.status = "failed";
    payout.needsReconciliation = false;
    payout.pawapayFailureCode = failureReason?.failureCode;
    payout.pawapayFailureMessage = failureReason?.failureMessage;
    // Nothing was paid — give the seller's earnings back so they can request again.
    await releaseEarnings(String(payout._id));
  } else if (status === "IN_RECONCILIATION") {
    payout.needsReconciliation = true;
  }

  await payout.save();
}
