import { Router } from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { User } from "../models/User.js";
import { Coupon } from "../models/Coupon.js";
import { LoyaltyEvent } from "../models/LoyaltyEvent.js";
import { Types } from "mongoose";
import { BUSINESS } from "../config/business.js";
import {
  allocateDiscounts,
  deliveryFeeFor,
  pointsEarnedFor,
  redeemablePoints,
  sumLines,
  type PricedLine,
} from "../services/finance.js";
import { evaluateCoupon, redeemCoupon } from "../services/coupon.service.js";
import {
  cancelOrderWithRestore,
  settleDeliveredOrder,
  validateStatusChange,
  withTransaction,
} from "../services/order.lifecycle.js";
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
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const buyerId = req.user!.id;

      const order = await withTransaction(async (session) => {
        // ── 1. Products (distinct ids — the same product may appear with several variants)
        const productIds = [...new Set(body.items.map((i) => i.productId))];
        if (!productIds.every((id) => Types.ObjectId.isValid(id))) {
          throw new HttpError(400, "Some items in your cart are no longer available.");
        }
        const products = await Product.find({ _id: { $in: productIds } }).session(session);
        if (products.length !== productIds.length) {
          throw new HttpError(400, "Some items in your cart are no longer available.");
        }
        const byId = new Map(products.map((p) => [String(p._id), p]));

        // ── 2. Sellers must be approved, active and open; nobody buys from their own store
        const sellers = await Seller.find({
          _id: { $in: products.map((p) => p.sellerId) },
        }).session(session);
        const sellerById = new Map(sellers.map((s) => [String(s._id), s]));

        // Total requested per product (across variants) for the stock check
        const requestedByProduct = new Map<string, number>();
        for (const it of body.items) {
          requestedByProduct.set(
            it.productId,
            (requestedByProduct.get(it.productId) ?? 0) + it.quantity,
          );
        }

        // ── 3. Validate + price every line server-side (never trust client prices)
        const lines: Array<PricedLine & { title: string; image?: string; variant?: string }> = [];
        for (const it of body.items) {
          const p = byId.get(it.productId)!;
          const seller = sellerById.get(String(p.sellerId));
          if (!p.isActive) throw new HttpError(400, `"${p.title}" is no longer available.`);
          if (!seller || !seller.isActive || seller.approvalStatus !== "approved") {
            throw new HttpError(400, `"${p.title}" is not currently available from this store.`);
          }
          if (seller.holidayMode) {
            throw new HttpError(
              400,
              `The store for "${p.title}" is temporarily closed (holiday mode).`,
            );
          }
          if (String(seller.userId) === buyerId) {
            throw new HttpError(400, "You can't buy from your own store.");
          }
          if ((requestedByProduct.get(it.productId) ?? 0) > p.stock) {
            throw new HttpError(
              400,
              `Only ${p.stock} unit(s) of "${p.title}" available, but you requested ${requestedByProduct.get(it.productId)}.`,
            );
          }

          let unitPrice = p.price;
          if (it.variant) {
            const v = p.variants.find((x) => x.name === it.variant);
            if (!v)
              throw new HttpError(
                400,
                `Option "${it.variant}" is no longer available for "${p.title}".`,
              );
            if (v.stock < it.quantity) {
              throw new HttpError(
                400,
                `Only ${v.stock} unit(s) of "${p.title}" (${it.variant}) available, but you requested ${it.quantity}.`,
              );
            }
            unitPrice += v.priceDelta ?? 0;
          }
          lines.push({
            productId: String(p._id),
            sellerId: String(p.sellerId),
            unitPrice,
            quantity: it.quantity,
            title: p.title,
            image: p.images[0],
            variant: it.variant,
          });
        }

        const subtotal = sumLines(lines);
        const deliveryFee = deliveryFeeFor(body.deliverySpeed, subtotal);

        // ── 4. Coupon (validated and redeemed atomically)
        let couponDiscount = 0;
        let couponSellerId: string | undefined;
        let couponCode: string | undefined;
        let couponId: unknown;
        if (body.couponCode) {
          const coupon = await Coupon.findOne({
            code: body.couponCode.trim().toUpperCase(),
          }).session(session);
          if (!coupon) throw new HttpError(400, "Invalid or expired coupon code.");
          const evaluation = evaluateCoupon(coupon, lines, buyerId);
          await redeemCoupon(coupon._id, buyerId, session);
          couponDiscount = evaluation.discount;
          couponSellerId = evaluation.couponSellerId;
          couponCode = coupon.code;
          couponId = coupon._id;
        }

        // ── 5. Loyalty points (deducted atomically so a balance can't be spent twice)
        let pointsRedeemed = 0;
        if (body.pointsToRedeem && body.pointsToRedeem > 0) {
          const buyer = await User.findById(buyerId).session(session).select("loyaltyPoints");
          if (!buyer) throw new HttpError(404, "User not found.");
          pointsRedeemed = redeemablePoints({
            requested: body.pointsToRedeem,
            balance: buyer.loyaltyPoints,
            subtotal: subtotal - couponDiscount,
          });
          if (pointsRedeemed > 0) {
            const debited = await User.findOneAndUpdate(
              { _id: buyerId, loyaltyPoints: { $gte: pointsRedeemed } },
              { $inc: { loyaltyPoints: -pointsRedeemed } },
              { session },
            );
            if (!debited) throw new HttpError(400, "You don't have enough loyalty points.");
            await LoyaltyEvent.create(
              [
                {
                  userId: buyerId,
                  points: -pointsRedeemed,
                  type: "redeemed",
                  description: `Redeemed ${pointsRedeemed} points for RWF ${pointsRedeemed * BUSINESS.RWF_PER_POINT} discount`,
                },
              ],
              { session },
            );
          }
        }
        const loyaltyDiscount = pointsRedeemed * BUSINESS.RWF_PER_POINT;
        const totalDiscount = couponDiscount + loyaltyDiscount;
        const total = Math.max(0, subtotal + deliveryFee - totalDiscount);

        // ── 6. Reserve stock atomically: the condition is in the update, so
        //       concurrent buyers can't both take the last unit.
        for (const l of lines) {
          const inc: Record<string, number> = { stock: -l.quantity, salesCount: l.quantity };
          const filter: Record<string, unknown> = { _id: l.productId, stock: { $gte: l.quantity } };
          if (l.variant) {
            filter.variants = { $elemMatch: { name: l.variant, stock: { $gte: l.quantity } } };
            inc["variants.$.stock"] = -l.quantity;
          }
          const r = await Product.updateOne(filter, { $inc: inc }, { session });
          if (r.modifiedCount !== 1) {
            throw new HttpError(409, `"${l.title}" just sold out — please review your cart.`);
          }
        }

        // ── 7. Create the order with each line's discount share stored for exact earnings later
        const discounted = allocateDiscounts(lines, {
          couponDiscount,
          couponSellerId,
          loyaltyDiscount,
        });
        const items = discounted.map((d, i) => ({
          productId: d.productId,
          sellerId: d.sellerId,
          title: lines[i].title,
          image: lines[i].image,
          variant: lines[i].variant,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
          couponDiscount: d.couponDiscount,
          loyaltyDiscount: d.loyaltyDiscount,
        }));

        const [created] = await Order.create(
          [
            {
              orderNumber: makeOrderNumber(),
              buyerId,
              items,
              sellerIds: [...new Set(lines.map((l) => l.sellerId))],
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
              couponCode,
              couponId,
              couponSellerId,
              pointsRedeemed,
              // Points are only *credited* once the order is delivered — this is what they'll get.
              pointsEarned: pointsEarnedFor(subtotal - totalDiscount),
            },
          ],
          { session },
        );
        return created;
      });

      // ── Post-commit side effects (never fail the order)
      const user = await User.findById(buyerId).lean();
      if (user?.email) {
        sendOrderConfirmation(user.email, order.orderNumber, order.total).catch((e) =>
          console.error("[email] buyer confirmation failed", e),
        );
      }
      for (const sid of order.sellerIds.map(String)) {
        const seller = await Seller.findById(sid).populate<{
          userId: { email?: string; profile?: { name?: string } };
        }>("userId", "email profile");
        if (seller?.userId?.email) {
          const sellerItems = order.items.filter((i) => String(i.sellerId) === sid);
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
      next(e);
    }
  },
);

// ── Buyer cancel order ────────────────────────────────────────────────────────
orderRouter.patch("/:id/cancel", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const cancelled = await withTransaction(async (session) => {
      const order = await Order.findById(req.params.id).session(session);
      if (!order) throw new HttpError(404, "Order not found.");
      if (String(order.buyerId) !== req.user!.id) throw new HttpError(403, "Not your order.");
      if (order.status === "cancelled")
        throw new HttpError(400, "This order is already cancelled.");
      if (!["placed", "payment_confirmed"].includes(order.status)) {
        throw new HttpError(400, "Order cannot be cancelled — it is already being prepared.");
      }
      // Restores stock, the coupon use and any redeemed points; flags a refund if it was paid.
      await cancelOrderWithRestore(order, session, "Cancelled by buyer");
      return order;
    });

    emitOrderUpdate(String(cancelled._id), { status: "cancelled", at: new Date() });

    const buyer = await User.findById(cancelled.buyerId).lean();
    if (buyer?.email) {
      sendOrderStatusUpdate(
        buyer.email,
        cancelled.orderNumber,
        "cancelled",
        "Cancelled by buyer",
      ).catch((e) => console.error("[email] cancel email failed", e));
    }

    res.json({
      order: cancelled,
      message:
        cancelled.paymentStatus === "refund_pending"
          ? "Order cancelled. Your payment will be refunded."
          : "Order cancelled successfully.",
    });
  } catch (e) {
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
  // `payment_confirmed` is deliberately absent: it can only be set by the payment
  // gateway or an admin's confirm-payment action, never by a seller.
  status: z.enum([
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
      const actor = req.user!.role === "admin" ? "admin" : "seller";

      const order = await withTransaction(async (session) => {
        const doc = await Order.findById(req.params.id).session(session);
        if (!doc) throw new HttpError(404, "Order not found.");

        if (actor === "seller") {
          const seller = await Seller.findOne({ userId: req.user!.id }).session(session);
          if (!seller || !doc.sellerIds.map(String).includes(String(seller._id))) {
            throw new HttpError(403, "Not your order.");
          }
        }

        const problem = validateStatusChange({
          actor,
          from: doc.status,
          to: status,
          sellerCount: doc.sellerIds.length,
          order: doc,
        });
        if (problem) throw new HttpError(400, problem);

        if (status === "cancelled") {
          await cancelOrderWithRestore(doc, session, note ?? `Cancelled by ${actor}`);
          return doc;
        }

        doc.status = status as unknown as typeof doc.status;
        doc.statusHistory.push({ status, at: new Date(), note });
        if (status === "delivered") {
          // Cash collected (COD), commission deducted into each seller's ledger,
          // loyalty points credited and any referral reward evaluated.
          await settleDeliveredOrder(doc, session);
        }
        await doc.save({ session });
        return doc;
      });

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
      next(e);
    }
  },
);
