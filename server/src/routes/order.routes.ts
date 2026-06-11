import { Router } from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { makeOrderNumber } from "../utils/order-number.js";
import { emitOrderUpdate } from "../socket/index.js";
import { sendOrderConfirmation } from "../services/email.service.js";
import { User } from "../models/User.js";

export const orderRouter = Router();

const createSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive().max(99),
        variant: z.string().optional(),
      }),
    )
    .min(1),
  deliveryAddress: z.object({
    sector: z.string().min(2),
    district: z.string().optional(),
    street: z.string().optional(),
    phone: z.string().min(7),
  }),
  deliverySpeed: z.enum(["standard", "express", "pickup"]).default("standard"),
  paymentMethod: z.enum(["mtn_momo", "airtel_money", "cod"]),
  couponCode: z.string().optional(),
});

orderRouter.post(
  "/",
  requireAuth,
  validate(createSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const productIds = body.items.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } });
      if (products.length !== body.items.length) {
        throw new HttpError(400, "Some items in your cart are no longer available.");
      }
      const items = body.items.map((it) => {
        const p = products.find((x) => String(x._id) === it.productId)!;
        return {
          productId: p._id,
          sellerId: p.sellerId,
          title: p.title,
          image: p.images[0],
          variant: it.variant,
          quantity: it.quantity,
          unitPrice: p.price,
        };
      });
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const deliveryFee =
        body.deliverySpeed === "express"
          ? 2000
          : body.deliverySpeed === "pickup"
            ? 0
            : subtotal >= 10_000
              ? 0
              : 1500;
      const total = subtotal + deliveryFee;
      const order = await Order.create({
        orderNumber: makeOrderNumber(),
        buyerId: req.user!.id,
        items,
        sellerIds: [...new Set(items.map((i) => String(i.sellerId)))],
        deliveryAddress: body.deliveryAddress,
        deliverySpeed: body.deliverySpeed,
        deliveryFee,
        subtotal,
        total,
        paymentMethod: body.paymentMethod,
        paymentStatus: body.paymentMethod === "cod" ? "pending" : "pending",
        status: "placed",
        statusHistory: [{ status: "placed", at: new Date() }],
        couponCode: body.couponCode,
        pointsEarned: Math.floor(total / 100),
      });

      const user = await User.findById(req.user!.id);
      if (user?.email) sendOrderConfirmation(user.email, order.orderNumber, total).catch(() => {});

      res.status(201).json({ order });
    } catch (e) {
      next(e);
    }
  },
);

orderRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const orders = await Order.find({ buyerId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ orders });
  } catch (e) {
    next(e);
  }
});

orderRouter.get("/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw new HttpError(404, "Order not found.");
    if (String(order.buyerId) !== req.user!.id && req.user!.role !== "admin") {
      throw new HttpError(403, "Not your order.");
    }
    res.json({ order });
  } catch (e) {
    next(e);
  }
});

const statusSchema = z.object({
  status: z.enum([
    "payment_confirmed",
    "preparing",
    "packed",
    "picked_up",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  note: z.string().max(280).optional(),
});

orderRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("seller", "admin"),
  validate(statusSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { status, note } = req.body as z.infer<typeof statusSchema>;
      const order = await Order.findById(req.params.id);
      if (!order) throw new HttpError(404, "Order not found.");
      order.status = status as unknown as typeof order.status;
      order.statusHistory.push({ status, at: new Date(), note });
      await order.save();
      emitOrderUpdate(String(order._id), { status, at: new Date(), note });
      res.json({ order });
    } catch (e) {
      next(e);
    }
  },
);
