import { Router } from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Transaction } from "../models/Transaction.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { applyOrderPaid } from "../services/order.lifecycle.js";
import { validate } from "../middleware/validate.js";
import { emitOrderUpdate } from "../socket/index.js";
import { nanoid } from "nanoid";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import {
  manualAccounts,
  normalizeReference,
  normalizeRwandaPhone,
  notifyBuyerPayment,
  pawapayConfigured,
  settleManualTransaction,
} from "../services/manual-payment.js";

export const paymentRouter = Router();

const initiateSchema = z.object({
  orderId: z.string(),
  method: z.enum(["mtn_momo", "airtel_money", "cod"]),
  phone: z.string().default(""),
});

// ── Which payment methods are available right now ─────────────────────────────
// The checkout page uses this so it never offers a method that can't work
// (e.g. instant MoMo when pawaPay isn't configured).
paymentRouter.get("/config", (_req, res) => {
  res.json({
    pawapay: pawapayConfigured(),
    manual: { enabled: manualAccounts().length > 0, accounts: manualAccounts() },
    cod: true,
  });
});

// ── Manual transfer: buyer submits proof of payment ──────────────────────────
const manualSchema = z.object({
  orderId: z.string(),
  provider: z.enum(["mtn_momo", "airtel_money"]),
  senderPhone: z.string().min(9).max(20),
  reference: z.string().min(4).max(60),
});

paymentRouter.post(
  "/manual",
  requireAuth,
  validate(manualSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = req.body as z.infer<typeof manualSchema>;
      const account = manualAccounts().find((a) => a.provider === body.provider);
      if (!account) {
        throw new HttpError(400, "Manual transfer isn't available for that network right now.");
      }
      const reference = normalizeReference(body.reference);
      if (!reference) {
        throw new HttpError(
          400,
          "Enter the transaction ID from your MoMo confirmation SMS (letters and numbers, 4–40 characters).",
        );
      }
      const senderPhone = normalizeRwandaPhone(body.senderPhone);
      if (!senderPhone) throw new HttpError(400, "Enter the MTN/Airtel number you paid from.");

      const order = await Order.findById(body.orderId);
      if (!order) throw new HttpError(404, "Order not found.");
      if (String(order.buyerId) !== req.user!.id) throw new HttpError(403, "Not your order.");
      if (order.status === "cancelled") throw new HttpError(400, "This order was cancelled.");
      if (order.status !== "placed") {
        throw new HttpError(400, "This order has already moved past checkout.");
      }
      if (order.paymentStatus === "paid") throw new HttpError(400, "This order is already paid.");

      // One real payment must not be able to "pay" for several orders.
      const reused = await Order.exists({
        _id: { $ne: order._id },
        "manualPayment.reference": reference,
        paymentStatus: { $in: ["manual_review", "paid"] },
      });
      if (reused) {
        throw new HttpError(400, "That transaction ID was already used for another order.");
      }

      const wasResubmission = order.paymentStatus === "manual_review";
      order.paymentMethod = "manual_transfer";
      order.paymentStatus = "manual_review";
      order.paymentRef = reference;
      order.manualPayment = {
        provider: body.provider,
        senderPhone,
        reference,
        submittedAt: new Date(),
        rejectedReason: undefined,
      };
      order.statusHistory.push({
        status: "placed",
        at: new Date(),
        note: `${account.label} transfer submitted (ref ${reference}) — awaiting admin verification`,
      });
      await order.save();

      // Keep one transaction record per order for manual payments.
      await Transaction.findOneAndUpdate(
        { orderId: order._id, provider: "manual" },
        {
          $set: {
            userId: req.user!.id,
            amount: order.total,
            method: "manual_transfer",
            phone: senderPhone,
            mockRef: reference,
            status: "manual_review",
            rawMeta: { provider: body.provider, reference },
          },
        },
        { upsert: true },
      );

      // Tell the admins there's something to verify.
      const admins = await User.find({ role: "admin" }).select("_id").lean();
      if (admins.length > 0 && !wasResubmission) {
        await Notification.insertMany(
          admins.map((a) => ({
            userId: a._id,
            type: "system" as const,
            title: "Payment to verify",
            body: `Order ${order.orderNumber}: ${account.label} transfer of RWF ${order.total.toLocaleString()} (ref ${reference}).`,
            link: "/admin",
            metadata: { orderId: String(order._id) },
          })),
        );
      }

      emitOrderUpdate(String(order._id), { status: "placed", at: new Date() });
      res.json({
        status: "manual_review",
        message: "Payment details received. We'll confirm your payment within 1–2 hours.",
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── Initiate payment ──────────────────────────────────────────────────────────
paymentRouter.post(
  "/mock",
  requireAuth,
  validate(initiateSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { orderId, method, phone } = req.body as z.infer<typeof initiateSchema>;
      const order = await Order.findById(orderId);
      if (!order) throw new HttpError(404, "Order not found.");
      if (String(order.buyerId) !== req.user!.id) throw new HttpError(403, "Not your order.");
      if (order.status === "cancelled") throw new HttpError(400, "This order was cancelled.");
      if (order.paymentStatus === "paid") throw new HttpError(400, "This order is already paid.");
      if (order.status !== "placed") {
        throw new HttpError(400, "This order has already moved past checkout.");
      }

      // Cash on delivery — immediately confirm
      if (method === "cod") {
        order.paymentMethod = "cod";
        order.paymentStatus = "pending"; // cash is collected on delivery, then marked paid
        order.status = "payment_confirmed";
        order.statusHistory.push({
          status: "payment_confirmed",
          at: new Date(),
          note: "Cash on delivery — payment on arrival",
        });
        await order.save();
        emitOrderUpdate(String(order._id), { status: "payment_confirmed", at: new Date() });
        return res.json({
          status: "succeeded",
          message: "Order placed! You'll pay cash when the order arrives.",
        });
      }

      // Mobile money — manual transfer flow: set order to pending_payment
      // Admin will confirm payment once they receive the transfer
      const orderRef = `MOMO-${nanoid(10).toUpperCase()}`;
      await Transaction.create({
        orderId: order._id,
        userId: req.user!.id,
        amount: order.total,
        method,
        phone,
        mockRef: orderRef,
        status: "initiated",
      });

      order.paymentMethod = method;
      order.paymentStatus = "pending"; // awaiting manual transfer confirmation by admin
      order.paymentRef = orderRef;
      order.status = "placed"; // stays in placed until admin confirms payment
      order.statusHistory.push({
        status: "placed",
        at: new Date(),
        note: `Manual ${method === "mtn_momo" ? "MTN MoMo" : "Airtel Money"} transfer — awaiting admin payment confirmation`,
      });
      await order.save();
      emitOrderUpdate(String(order._id), { status: "placed", at: new Date() });

      res.json({
        orderRef,
        status: "pending_payment",
        message:
          method === "mtn_momo"
            ? "Order placed. Send payment to our MTN MoMo number and we'll confirm within 1–2 hours."
            : "Order placed. Send payment to our Airtel number and we'll confirm within 1–2 hours.",
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── Payment status polling ────────────────────────────────────────────────────
paymentRouter.get("/status/:ref", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const tx = await Transaction.findOne({ mockRef: req.params.ref }).lean();
    if (!tx) throw new HttpError(404, "Transaction not found.");
    if (String(tx.userId) !== req.user!.id) throw new HttpError(403, "Not your transaction.");
    res.json({ status: tx.status, method: tx.method });
  } catch (e) {
    next(e);
  }
});

// ── Admin: confirm manual payment ─────────────────────────────────────────────
// POST /api/payments/confirm/:orderId — ADMIN ONLY. (This used to be open to any
// signed-in user, which let anyone mark their own order as paid.)
paymentRouter.post(
  "/confirm/:orderId",
  requireAuth,
  requireRole("admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) throw new HttpError(404, "Order not found.");
      if (order.paymentStatus === "paid") throw new HttpError(400, "Already confirmed.");

      const outcome = await applyOrderPaid(
        order,
        `Payment manually confirmed by admin (${req.user!.id})`,
      );
      if (order.paymentRef) {
        await Transaction.updateOne({ mockRef: order.paymentRef }, { status: "succeeded" });
      }
      await settleManualTransaction(order._id, true);
      if (outcome === "paid") await notifyBuyerPayment(order, "confirmed");

      emitOrderUpdate(String(order._id), { status: order.status, at: new Date() });
      res.json({
        message:
          outcome === "cancelled_refund_pending"
            ? "The order had already been cancelled — it's now flagged for refund."
            : "Payment confirmed.",
        order,
      });
    } catch (e) {
      next(e);
    }
  },
);
