import { Router } from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { initiateMobileMoneyPush } from "../services/payment.mock.js";

export const paymentRouter = Router();

const mockSchema = z.object({
  orderId: z.string(),
  method: z.enum(["mtn_momo", "airtel_money"]),
  phone: z.string().min(7),
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
      const result = await initiateMobileMoneyPush({
        orderId: String(order._id),
        userId: req.user!.id,
        amount: order.total,
        method,
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
  }
);