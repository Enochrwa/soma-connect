import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";
import { Coupon } from "../models/Coupon.js";
import { LoyaltyEvent } from "../models/LoyaltyEvent.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { makeOrderNumber } from "../utils/order-number.js";
import { emitOrderUpdate } from "../socket/index.js";
import { orderLimiter } from "../middleware/rateLimiter.js";
import {
  sendOrderConfirmation,
  sendNewOrderAlertToSeller,
  sendOrderStatusUpdate,
} from "../services/email.service.js";

export const orderRouter = Router();

const POINTS_PER_RWF = 1 / 100; // 1 point per 100 RWF spent
const RWF_PER_POINT = 1; // 1 point = 1 RWF discount

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
  pointsToRedeem: z.number().int().nonnegative().optional(),
});

orderRouter.post(
  "/",
  requireAuth,
  orderLimiter,
  validate(createSchema),
  async (req: AuthedRequest, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const productIds = body.items.map((i) => i.productId);

      // ── 1. Fetch products within the transaction ──────────────────────────
      const products = await Product.find({ _id: { $in: productIds } }).session(session);
      if (products.length !== body.items.length) {
        throw new HttpError(400, "Some items in your cart are no longer available.");
      }

      // ── 2. Stock validation + seller holiday mode check ───────────────────
      for (const it of body.items) {
        const p = products.find((x) => String(x._id) === it.productId)!;
        if (!p.isActive) {
          throw new HttpError(400, `"${p.title}" is no longer available.`);
        }
        // Check seller holiday mode
        const seller = await Seller.findById(p.sellerId).session(session).lean();
        if (seller?.holidayMode) {
          throw new HttpError(
            400,
            `The store for "${p.title}" is temporarily closed (holiday mode).`,
          );
        }
        // Stock check
        if (p.stock < it.quantity) {
          throw new HttpError(
            400,
            `Only ${p.stock} unit(s) of "${p.title}" available, but you requested ${it.quantity}.`,
          );
        }
      }

      // ── 3. Build order items ──────────────────────────────────────────────
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

      // ── 4. Apply coupon ───────────────────────────────────────────────────
      let couponDiscount = 0;
      let appliedCouponCode: string | undefined;
      if (body.couponCode) {
        const coupon = await Coupon.findOne({
          code: body.couponCode.toUpperCase(),
          isActive: true,
        }).session(session);
        if (!coupon) throw new HttpError(400, "Invalid or expired coupon code.");
        if (new Date() > coupon.expiresAt) throw new HttpError(400, "This coupon has expired.");
        if (coupon.usedCount >= coupon.maxUses)
          throw new HttpError(400, "Coupon usage limit reached.");
        if (subtotal < coupon.minOrder) {
          throw new HttpError(
            400,
            `Minimum order of RWF ${coupon.minOrder.toLocaleString()} required.`,
          );
        }
        if (coupon.usedBy.map(String).includes(req.user!.id)) {
          throw new HttpError(400, "You have already used this coupon.");
        }
        couponDiscount =
          coupon.type === "percentage"
            ? Math.floor((subtotal * coupon.value) / 100)
            : Math.min(coupon.value, subtotal);
        // Decrement coupon usage
        await Coupon.findByIdAndUpdate(
          coupon._id,
          { $inc: { usedCount: 1 }, $push: { usedBy: req.user!.id } },
          { session },
        );
        appliedCouponCode = coupon.code;
      }

      // ── 5. Apply loyalty points ───────────────────────────────────────────
      let loyaltyDiscount = 0;
      let pointsRedeemed = 0;
      if (body.pointsToRedeem && body.pointsToRedeem > 0) {
        const buyer = await User.findById(req.user!.id).session(session);
        if (!buyer) throw new HttpError(404, "User not found.");
        if (buyer.loyaltyPoints < body.pointsToRedeem) {
          throw new HttpError(400, `You only have ${buyer.loyaltyPoints} loyalty points.`);
        }
        // Cap points redemption at 20% of order value
        const maxRedemption = Math.floor((subtotal * 0.2) / RWF_PER_POINT);
        pointsRedeemed = Math.min(body.pointsToRedeem, maxRedemption);
        loyaltyDiscount = pointsRedeemed * RWF_PER_POINT;
        // Deduct points
        await User.findByIdAndUpdate(
          req.user!.id,
          { $inc: { loyaltyPoints: -pointsRedeemed } },
          { session },
        );
        await LoyaltyEvent.create(
          [
            {
              userId: req.user!.id,
              points: -pointsRedeemed,
              type: "redeemed",
              description: `Redeemed ${pointsRedeemed} points for RWF ${loyaltyDiscount} discount`,
            },
          ],
          { session },
        );
      }

      const totalDiscount = couponDiscount + loyaltyDiscount;
      const total = Math.max(0, subtotal + deliveryFee - totalDiscount);

      // ── 6. Decrement stock (within transaction) ───────────────────────────
      for (const it of body.items) {
        const p = products.find((x) => String(x._id) === it.productId)!;
        if (it.variant) {
          // Decrement matching variant stock
          await Product.findOneAndUpdate(
            { _id: p._id, "variants.name": it.variant },
            { $inc: { "variants.$.stock": -it.quantity } },
            { session },
          );
        }
        // Always decrement top-level stock too
        await Product.findByIdAndUpdate(
          p._id,
          { $inc: { stock: -it.quantity, salesCount: it.quantity } },
          { session },
        );
      }

      // ── 7. Create order ───────────────────────────────────────────────────
      const pointsEarned = Math.floor(total * POINTS_PER_RWF);
      const [order] = await Order.create(
        [
          {
            orderNumber: makeOrderNumber(),
            buyerId: req.user!.id,
            items,
            sellerIds: [...new Set(items.map((i) => String(i.sellerId)))],
            deliveryAddress: body.deliveryAddress,
            deliverySpeed: body.deliverySpeed,
            deliveryFee,
            subtotal,
            discount: totalDiscount,
            loyaltyDiscount,
            total,
            paymentMethod: body.paymentMethod,
            paymentStatus: "pending",
            status: "placed",
            statusHistory: [{ status: "placed", at: new Date() }],
            couponCode: appliedCouponCode,
            pointsRedeemed,
            pointsEarned,
          },
        ],
        { session },
      );

      // ── 8. Credit loyalty points earned ──────────────────────────────────
      if (pointsEarned > 0) {
        await User.findByIdAndUpdate(
          req.user!.id,
          { $inc: { loyaltyPoints: pointsEarned } },
          { session },
        );
        await LoyaltyEvent.create(
          [
            {
              userId: req.user!.id,
              points: pointsEarned,
              type: "purchase",
              description: `Earned ${pointsEarned} points from order ${order.orderNumber}`,
              relatedId: order._id,
            },
          ],
          { session },
        );
      }

      await session.commitTransaction();
      session.endSession();

      // ── 9. Post-commit side effects ───────────────────────────────────────
      const user = await User.findById(req.user!.id).lean();
      if (user?.email) {
        sendOrderConfirmation(user.email, order.orderNumber, total).catch((e) =>
          console.error("[email] buyer confirmation failed", e),
        );
      }
      const sellerIds = [...new Set(items.map((i) => String(i.sellerId)))];
      for (const sid of sellerIds) {
        const seller = await Seller.findById(sid).populate<{
          userId: { email?: string; profile?: { name?: string } };
        }>("userId", "email profile");
        if (seller?.userId?.email) {
          const sellerItems = items.filter((i) => String(i.sellerId) === sid);
          sendNewOrderAlertToSeller(
            seller.userId.email,
            seller.storeName,
            order.orderNumber,
            sellerItems.map((i) => ({
              title: i.title ?? "",
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          ).catch((e) => console.error("[email] seller alert failed", e));
        }
      }

      res.status(201).json({ order });
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      next(e);
    }
  },
);

// ── Buyer cancel order ────────────────────────────────────────────────────────
orderRouter.patch("/:id/cancel", requireAuth, async (req: AuthedRequest, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) throw new HttpError(404, "Order not found.");
    if (String(order.buyerId) !== req.user!.id) throw new HttpError(403, "Not your order.");
    const cancellableStatuses = ["placed", "payment_confirmed"];
    if (!cancellableStatuses.includes(order.status)) {
      throw new HttpError(400, "Order cannot be cancelled — it is already being prepared.");
    }

    // Restore stock
    for (const item of order.items) {
      if (item.variant) {
        await Product.findOneAndUpdate(
          { _id: item.productId, "variants.name": item.variant },
          { $inc: { "variants.$.stock": item.quantity } },
          { session },
        );
      }
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.quantity, salesCount: -item.quantity } },
        { session },
      );
    }

    // Restore loyalty points if redeemed
    if (order.pointsRedeemed && order.pointsRedeemed > 0) {
      await User.findByIdAndUpdate(
        order.buyerId,
        { $inc: { loyaltyPoints: order.pointsRedeemed } },
        { session },
      );
      await LoyaltyEvent.create(
        [
          {
            userId: order.buyerId,
            points: order.pointsRedeemed,
            type: "admin_adjustment",
            description: `Points restored from cancelled order ${order.orderNumber}`,
            relatedId: order._id,
          },
        ],
        { session },
      );
    }

    // Deduct points earned from this order if still has them
    if (order.pointsEarned && order.pointsEarned > 0) {
      await User.findByIdAndUpdate(
        order.buyerId,
        { $inc: { loyaltyPoints: -order.pointsEarned } },
        { session },
      );
    }

    order.status = "cancelled" as unknown as typeof order.status;
    order.statusHistory.push({ status: "cancelled", at: new Date(), note: "Cancelled by buyer" });
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded" as unknown as typeof order.paymentStatus;
    }
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    emitOrderUpdate(String(order._id), { status: "cancelled", at: new Date() });

    const buyer = await User.findById(order.buyerId).lean();
    if (buyer?.email) {
      sendOrderStatusUpdate(
        buyer.email,
        order.orderNumber,
        "cancelled",
        "Cancelled by buyer",
      ).catch((e) => console.error("[email] cancel email failed", e));
    }

    res.json({ order, message: "Order cancelled successfully." });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    next(e);
  }
});

// ── Seller: add tracking number ───────────────────────────────────────────────
const trackingSchema = z.object({
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional(),
});

orderRouter.patch(
  "/:id/tracking",
  requireAuth,
  requireRole("seller", "admin"),
  validate(trackingSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { trackingNumber, trackingUrl } = req.body as z.infer<typeof trackingSchema>;
      const order = await Order.findById(req.params.id);
      if (!order) throw new HttpError(404, "Order not found.");
      if (req.user!.role === "seller") {
        const seller = await Seller.findOne({ userId: req.user!.id });
        if (!seller || !order.sellerIds.map(String).includes(String(seller._id))) {
          throw new HttpError(403, "Not your order.");
        }
      }
      if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
      if (trackingUrl !== undefined) order.trackingUrl = trackingUrl;
      await order.save();
      res.json({ order });
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
    const isBuyer = String(order.buyerId) === req.user!.id;
    const isAdmin = req.user!.role === "admin";
    let isSeller = false;
    if (!isBuyer && !isAdmin && req.user!.role === "seller") {
      const seller = await Seller.findOne({ userId: req.user!.id }).lean();
      isSeller = seller ? order.sellerIds.map(String).includes(String(seller._id)) : false;
    }
    if (!isBuyer && !isAdmin && !isSeller)
      throw new HttpError(403, "Not authorized to view this order.");
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
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { status, note } = req.body as z.infer<typeof statusSchema>;
      const order = await Order.findById(req.params.id).session(session);
      if (!order) throw new HttpError(404, "Order not found.");
      if (req.user!.role === "seller") {
        const seller = await Seller.findOne({ userId: req.user!.id });
        if (!seller || !order.sellerIds.map(String).includes(String(seller._id))) {
          throw new HttpError(403, "Not your order.");
        }
      }

      // If cancelling from seller side, restore stock
      if (status === "cancelled" && order.status !== "cancelled") {
        for (const item of order.items) {
          if (item.variant) {
            await Product.findOneAndUpdate(
              { _id: item.productId, "variants.name": item.variant },
              { $inc: { "variants.$.stock": item.quantity } },
              { session },
            );
          }
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: item.quantity, salesCount: -item.quantity } },
            { session },
          );
        }
      }

      order.status = status as unknown as typeof order.status;
      order.statusHistory.push({ status, at: new Date(), note });
      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      emitOrderUpdate(String(order._id), { status, at: new Date(), note });

      const notifyStatuses = ["preparing", "packed", "out_for_delivery", "delivered", "cancelled"];
      if (notifyStatuses.includes(status)) {
        const buyer = await User.findById(order.buyerId).lean();
        if (buyer?.email) {
          sendOrderStatusUpdate(buyer.email, order.orderNumber, status, note).catch((e) =>
            console.error("[email] status update email failed", e),
          );
        }
      }

      res.json({ order: await Order.findById(order._id).lean() });
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      next(e);
    }
  },
);
