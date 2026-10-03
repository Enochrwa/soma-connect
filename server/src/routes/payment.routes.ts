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

export const paymentRouter = Router();

const initiateSchema = z.object({
  orderId: z.string(),
  method: z.enum(["mtn_momo", "airtel_money", "cod"]),
  phone: z.string().default(""),
});

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
