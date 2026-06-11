import { Router } from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Transaction } from "../models/Transaction.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { initiateMobileMoneyPush } from "../services/payment.mock.js";
import { emitOrderUpdate } from "../socket/index.js";

export const paymentRouter = Router();

const mockSchema = z.object({
  orderId: z.string(),
  method: z.enum(["mtn_momo", "airtel_money", "cod"]),
  phone: z.string().default(""),
});

paymentRouter.post(
  "/mock",
  requireAuth,
  validate(mockSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { orderId, method, phone } = req.body as z.infer<typeof mockSchema>;
      const order = await Order.findById(orderId);
      if (!order) throw new HttpError(404, "Order not found.");
      if (String(order.buyerId) !== req.user!.id) throw new HttpError(403, "Not your order.");

      // Cash on delivery — immediately confirm
      if (method === "cod") {
        order.paymentMethod = "cod";
        order.paymentStatus = "pending"; // paid on delivery
        order.status = "payment_confirmed";
        order.statusHistory.push({
          status: "payment_confirmed",
          at: new Date(),
          note: "Cash on delivery — payment on arrival",
        });
        await order.save();
        emitOrderUpdate(String(order._id), { status: "payment_confirmed", at: new Date() });
        return res.json({
          mockRef: null,
          status: "succeeded",
          message: "Order placed! You'll pay cash when the order arrives.",
        });
      }

      const result = await initiateMobileMoneyPush({
        orderId: String(order._id),
        userId: req.user!.id,
        amount: order.total,
        method: method as "mtn_momo" | "airtel_money",
        phone,
      });

      res.json({
        ...result,
        message:
          method === "mtn_momo"
            ? "USSD push sent to your MTN number. Approve to complete payment."
            : "USSD push sent to your Airtel number. Approve to complete payment.",
      });
    } catch (e) {
      next(e);
    }
  },
);

// Payment status polling endpoint — client polls every 3s
paymentRouter.get("/status/:ref", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const tx = await Transaction.findOne({ mockRef: req.params.ref }).lean();
    if (!tx) throw new HttpError(404, "Transaction not found.");
    // Verify it belongs to the requesting user
    if (String(tx.userId) !== req.user!.id) throw new HttpError(403, "Not your transaction.");
    res.json({ status: tx.status, method: tx.method });
  } catch (e) {
    next(e);
  }
});
