/**
 * Admin console endpoints: order command centre, user/seller tools, earnings,
 * referrals, audit log and read-only settings. Mounted by admin.routes.ts, which
 * already requires an authenticated admin for everything registered here.
 */
import type { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { BUSINESS } from "../config/business.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AdminAction } from "../models/AdminAction.js";
import { Dispute } from "../models/Dispute.js";
import { LoyaltyEvent } from "../models/LoyaltyEvent.js";
import { Order } from "../models/Order.js";
import { Payout } from "../models/Payout.js";
import { Product } from "../models/Product.js";
import { Referral } from "../models/Referral.js";
import { Seller } from "../models/Seller.js";
import { SellerEarning } from "../models/SellerEarning.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { emitOrderUpdate } from "../socket/index.js";
import {
  ORDER_QUEUES,
  csvCell,
  escapeRegex,
  logAdmin,
  orderQueueFilter,
} from "../services/admin.helpers.js";
import {
  manualAccounts,
  notifyBuyerPayment,
  pawapayConfigured,
  settleManualTransaction,
} from "../services/manual-payment.js";
import { applyOrderPaid } from "../services/order.lifecycle.js";

export function registerAdminConsoleRoutes(adminRouter: Router) {
  // ── Orders: queue counts (badges) ──────────────────────────────────────────
  adminRouter.get("/orders/counts", async (_req, res, next) => {
    try {
      const entries = await Promise.all(
        ORDER_QUEUES.map(
          async (q) => [q, await Order.countDocuments(orderQueueFilter(q))] as const,
        ),
      );
      res.json({ counts: Object.fromEntries(entries) });
    } catch (e) {
      next(e);
    }
  });

  // ── Orders: CSV export ─────────────────────────────────────────────────────
  adminRouter.get("/orders/export", async (req, res, next) => {
    try {
      const { queue } = req.query as Record<string, string>;
      const orders = await Order.find(orderQueueFilter(queue))
        .populate<{
          buyerId: { profile?: { name?: string }; phone?: string; email?: string };
        }>("buyerId", "profile phone email")
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean();
      const header = [
        "Order",
        "Date",
        "Buyer",
        "Buyer phone",
        "Items",
        "Subtotal",
        "Delivery",
        "Discount",
        "Total",
        "Payment method",
        "Payment status",
        "Payment reference",
        "Order status",
      ];
      const rows = orders.map((o) =>
        [
          o.orderNumber,
          o.createdAt.toISOString(),
          o.buyerId?.profile?.name ?? "",
          o.buyerId?.phone ?? o.deliveryAddress?.phone ?? "",
          o.items.map((i) => `${i.quantity}× ${i.title}`).join("; "),
          o.subtotal,
          o.deliveryFee,
          o.discount ?? 0,
          o.total,
          o.paymentMethod,
          o.paymentStatus,
          o.manualPayment?.reference ?? o.paymentRef ?? "",
          o.status,
        ]
          .map(csvCell)
          .join(","),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="orders-${queue || "all"}-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send([header.join(","), ...rows].join("\n"));
    } catch (e) {
      next(e);
    }
  });

  // ── Orders: bulk confirm payments ──────────────────────────────────────────
  const bulkSchema = z.object({ orderIds: z.array(z.string()).min(1).max(50) });
  adminRouter.post(
    "/orders/bulk-confirm",
    validate(bulkSchema),
    async (req: AuthedRequest, res, next) => {
      try {
        const { orderIds } = req.body as z.infer<typeof bulkSchema>;
        const confirmed: string[] = [];
        const skipped: Array<{ orderNumber: string; reason: string }> = [];
        for (const id of orderIds) {
          if (!mongoose.isValidObjectId(id)) continue;
          const order = await Order.findById(id);
          if (!order) continue;
          if (
            order.status !== "placed" ||
            !["pending", "manual_review"].includes(order.paymentStatus)
          ) {
            skipped.push({ orderNumber: order.orderNumber, reason: "Not waiting for payment" });
            continue;
          }
          const outcome = await applyOrderPaid(
            order,
            `Payment confirmed by admin (${req.user!.id})`,
          );
          await settleManualTransaction(order._id, true);
          if (outcome === "paid") await notifyBuyerPayment(order, "confirmed");
          emitOrderUpdate(String(order._id), { status: order.status, at: new Date() });
          confirmed.push(order.orderNumber);
        }
        if (confirmed.length) {
          await logAdmin(
            req,
            "order.bulk_confirm",
            { type: "order" },
            `Confirmed ${confirmed.length} payment(s): ${confirmed.join(", ")}`,
          );
        }
        res.json({ confirmed: confirmed.length, skipped });
      } catch (e) {
        next(e);
      }
    },
  );

  // ── Orders: full detail (items, buyer, payment proof, timeline, commission) ─
  adminRouter.get("/orders/:id", async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Order not found.");
      const order = await Order.findById(req.params.id)
        .populate("buyerId", "profile phone email loyaltyPoints createdAt")
        .lean();
      if (!order) throw new HttpError(404, "Order not found.");
      const [sellers, earnings, transactions] = await Promise.all([
        Seller.find({ _id: { $in: order.sellerIds } })
          .select("storeName payoutPhone userId")
          .populate("userId", "phone email")
          .lean(),
        SellerEarning.find({ orderId: order._id }).lean(),
        Transaction.find({ orderId: order._id }).sort({ createdAt: -1 }).lean(),
      ]);
      res.json({ order, sellers, earnings, transactions });
    } catch (e) {
      next(e);
    }
  });

  // ── Orders: internal note (shows in the timeline) ──────────────────────────
  const noteSchema = z.object({ note: z.string().min(1).max(280) });
  adminRouter.post(
    "/orders/:id/note",
    validate(noteSchema),
    async (req: AuthedRequest, res, next) => {
      try {
        const order = await Order.findById(req.params.id);
        if (!order) throw new HttpError(404, "Order not found.");
        order.statusHistory.push({
          status: order.status,
          at: new Date(),
          note: `Admin note: ${req.body.note}`,
        });
        await order.save();
        await logAdmin(
          req,
          "order.note",
          { type: "order", id: order._id },
          `Note on ${order.orderNumber}: ${req.body.note}`,
        );
        res.json({ order });
      } catch (e) {
        next(e);
      }
    },
  );

  // ── Users: detail ──────────────────────────────────────────────────────────
  adminRouter.get("/users/:id", async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "User not found.");
      const user = await User.findById(req.params.id).select("-passwordHash").lean();
      if (!user) throw new HttpError(404, "User not found.");
      const [spent, recentOrders, seller, invited, rewarded, referredBy] = await Promise.all([
        Order.aggregate([
          { $match: { buyerId: user._id, paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
        ]),
        Order.find({ buyerId: user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("orderNumber total status paymentStatus createdAt")
          .lean(),
        Seller.findOne({ userId: user._id }).select("storeName approvalStatus isActive").lean(),
        Referral.countDocuments({ referrerId: user._id }),
        Referral.countDocuments({ referrerId: user._id, status: "rewarded" }),
        user.referredBy ? User.findById(user.referredBy).select("profile.name phone").lean() : null,
      ]);
      res.json({
        user,
        stats: { paidOrders: spent[0]?.count ?? 0, totalSpent: spent[0]?.total ?? 0 },
        recentOrders,
        seller,
        referrals: { invited, rewarded },
        referredBy,
      });
    } catch (e) {
      next(e);
    }
  });

  const roleSchema = z.object({ role: z.enum(["buyer", "seller", "admin"]) });
  adminRouter.patch(
    "/users/:id/role",
    validate(roleSchema),
    async (req: AuthedRequest, res, next) => {
      try {
        if (req.params.id === req.user!.id)
          throw new HttpError(400, "You can't change your own role.");
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { role: req.body.role },
          { new: true },
        );
        if (!user) throw new HttpError(404, "User not found.");
        await logAdmin(
          req,
          "user.role",
          { type: "user", id: user._id },
          `Changed ${user.profile?.name ?? user.phone} to ${req.body.role}`,
        );
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  const pointsSchema = z.object({
    points: z
      .number()
      .int()
      .refine((n) => n !== 0 && Math.abs(n) <= 100_000, "Enter a non-zero amount up to 100,000"),
    reason: z.string().min(3).max(200),
  });
  adminRouter.post(
    "/users/:id/points",
    validate(pointsSchema),
    async (req: AuthedRequest, res, next) => {
      try {
        const { points, reason } = req.body as z.infer<typeof pointsSchema>;
        const filter: Record<string, unknown> = { _id: req.params.id };
        if (points < 0) filter.loyaltyPoints = { $gte: -points }; // never below zero
        const user = await User.findOneAndUpdate(
          filter,
          { $inc: { loyaltyPoints: points } },
          { new: true },
        );
        if (!user)
          throw new HttpError(400, "User not found, or they don't have enough points to remove.");
        await LoyaltyEvent.create({
          userId: user._id,
          points,
          type: "admin_adjustment",
          description: `Adjusted by admin: ${reason}`,
        });
        await logAdmin(
          req,
          "user.points",
          { type: "user", id: user._id },
          `${points > 0 ? "+" : ""}${points} points for ${user.profile?.name ?? user.phone} — ${reason}`,
        );
        res.json({ loyaltyPoints: user.loyaltyPoints });
      } catch (e) {
        next(e);
      }
    },
  );

  // ── Sellers: reactivate a suspended store ──────────────────────────────────
  adminRouter.patch("/sellers/:id/reactivate", async (req: AuthedRequest, res, next) => {
    try {
      const seller = await Seller.findOneAndUpdate(
        { _id: req.params.id, approvalStatus: "approved" },
        { isActive: true },
        { new: true },
      );
      if (!seller) throw new HttpError(404, "Approved seller not found.");
      await logAdmin(
        req,
        "seller.reactivate",
        { type: "seller", id: seller._id },
        `Reactivated ${seller.storeName}`,
      );
      res.json({ seller });
    } catch (e) {
      next(e);
    }
  });

  // ── Earnings & commission summary ──────────────────────────────────────────
  adminRouter.get("/earnings/summary", async (req, res, next) => {
    try {
      const days = Math.min(
        365,
        Math.max(0, Number((req.query as Record<string, string>).days ?? 30)),
      );
      const now = new Date();
      const live = { status: { $ne: "reversed" }, clawbackRequired: { $ne: true } };
      const since =
        days > 0 ? { createdAt: { $gte: new Date(Date.now() - days * 86_400_000) } } : {};

      const bucket = (cond: unknown) => ({ $sum: { $cond: [cond, "$net", 0] } });
      const ready = {
        $and: [
          { $eq: ["$status", "available"] },
          { $lte: ["$availableAt", now] },
          { $ne: ["$onHold", true] },
        ],
      };
      const clearing = {
        $and: [
          { $eq: ["$status", "available"] },
          { $or: [{ $gt: ["$availableAt", now] }, { $eq: ["$onHold", true] }] },
        ],
      };

      const [period, owed, perSeller, recent, clawbacks] = await Promise.all([
        SellerEarning.aggregate([
          { $match: { ...live, ...since } },
          {
            $group: {
              _id: null,
              sales: { $sum: "$commissionBase" },
              commission: { $sum: "$commission" },
              net: { $sum: "$net" },
              orders: { $sum: 1 },
            },
          },
        ]),
        // What the platform owes sellers right now (all time, not just the period)
        SellerEarning.aggregate([
          { $match: live },
          {
            $group: {
              _id: null,
              available: bucket(ready),
              clearing: bucket(clearing),
              requested: bucket({ $eq: ["$status", "requested"] }),
              paid: bucket({ $eq: ["$status", "paid"] }),
            },
          },
        ]),
        SellerEarning.aggregate([
          { $match: { ...live, ...since } },
          {
            $group: {
              _id: "$sellerId",
              orders: { $sum: 1 },
              sales: { $sum: "$commissionBase" },
              commission: { $sum: "$commission" },
              net: { $sum: "$net" },
              available: bucket(ready),
              clearing: bucket(clearing),
              requested: bucket({ $eq: ["$status", "requested"] }),
              paid: bucket({ $eq: ["$status", "paid"] }),
            },
          },
          { $sort: { sales: -1 } },
          { $limit: 100 },
        ]),
        SellerEarning.find({ ...since })
          .sort({ createdAt: -1 })
          .limit(30)
          .populate("sellerId", "storeName")
          .lean(),
        SellerEarning.aggregate([
          { $match: { clawbackRequired: true } },
          { $group: { _id: null, amount: { $sum: "$net" }, count: { $sum: 1 } } },
        ]),
      ]);

      const stores = await Seller.find({ _id: { $in: perSeller.map((p) => p._id) } })
        .select("storeName commissionRate")
        .lean();
      const byId = new Map(stores.map((s) => [String(s._id), s]));
      res.json({
        days,
        totals: period[0] ?? { sales: 0, commission: 0, net: 0, orders: 0 },
        owed: owed[0] ?? { available: 0, clearing: 0, requested: 0, paid: 0 },
        clawbacks: clawbacks[0] ?? { amount: 0, count: 0 },
        defaultRate: BUSINESS.COMMISSION_RATE,
        sellers: perSeller.map((p) => ({
          sellerId: String(p._id),
          storeName: byId.get(String(p._id))?.storeName ?? "(deleted store)",
          commissionRate: byId.get(String(p._id))?.commissionRate ?? null,
          orders: p.orders,
          sales: p.sales,
          commission: p.commission,
          net: p.net,
          available: p.available,
          clearing: p.clearing,
          requested: p.requested,
          paid: p.paid,
        })),
        recent,
      });
    } catch (e) {
      next(e);
    }
  });

  // ── Referrals overview ─────────────────────────────────────────────────────
  adminRouter.get("/referrals", async (_req, res, next) => {
    try {
      const [byStatus, pointsAgg, top, recent] = await Promise.all([
        Referral.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
        Referral.aggregate([
          { $match: { status: "rewarded" } },
          {
            $group: {
              _id: null,
              referrer: { $sum: "$referrerPoints" },
              referee: { $sum: "$refereePoints" },
            },
          },
        ]),
        Referral.aggregate([
          { $match: { status: "rewarded" } },
          {
            $group: {
              _id: "$referrerId",
              rewarded: { $sum: 1 },
              points: { $sum: "$referrerPoints" },
            },
          },
          { $sort: { rewarded: -1 } },
          { $limit: 10 },
        ]),
        Referral.find()
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("referrerId", "profile.name phone")
          .populate("refereeId", "profile.name phone")
          .populate("qualifyingOrderId", "orderNumber total")
          .lean(),
      ]);
      const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
      const topUsers = await User.find({ _id: { $in: top.map((t) => t._id) } })
        .select("profile.name phone")
        .lean();
      const nameById = new Map(topUsers.map((u) => [String(u._id), u.profile?.name ?? u.phone]));
      res.json({
        stats: {
          invited: (counts.pending ?? 0) + (counts.rewarded ?? 0) + (counts.rejected ?? 0),
          pending: counts.pending ?? 0,
          rewarded: counts.rewarded ?? 0,
          rejected: counts.rejected ?? 0,
          pointsPaid: (pointsAgg[0]?.referrer ?? 0) + (pointsAgg[0]?.referee ?? 0),
        },
        rules: {
          referrerBonusPoints: BUSINESS.REFERRAL.REFERRER_BONUS_POINTS,
          refereeBonusPoints: BUSINESS.REFERRAL.REFEREE_BONUS_POINTS,
          minQualifyingOrder: BUSINESS.REFERRAL.MIN_QUALIFYING_ORDER_RWF,
          maxRewards: BUSINESS.REFERRAL.MAX_REWARDED_PER_REFERRER,
        },
        topReferrers: top.map((t) => ({
          userId: String(t._id),
          name: nameById.get(String(t._id)) ?? "Unknown",
          rewarded: t.rewarded,
          points: t.points,
        })),
        recent,
      });
    } catch (e) {
      next(e);
    }
  });

  const rejectRefSchema = z.object({ reason: z.string().min(2).max(200) });
  adminRouter.patch(
    "/referrals/:id/reject",
    validate(rejectRefSchema),
    async (req: AuthedRequest, res, next) => {
      try {
        const referral = await Referral.findOneAndUpdate(
          { _id: req.params.id, status: "pending" },
          { status: "rejected", rejectReason: req.body.reason },
          { new: true },
        );
        if (!referral) throw new HttpError(400, "Only pending referrals can be rejected.");
        await logAdmin(
          req,
          "referral.reject",
          { type: "referral", id: referral._id },
          `Rejected referral — ${req.body.reason}`,
        );
        res.json({ referral });
      } catch (e) {
        next(e);
      }
    },
  );

  // ── Overview extras: attention queue + leaders ─────────────────────────────
  adminRouter.get("/overview", async (_req, res, next) => {
    try {
      const since = new Date(Date.now() - 30 * 86_400_000);
      const [
        verify,
        awaiting,
        ready,
        refunds,
        pendingSellers,
        openDisputes,
        pendingPayouts,
        clawbacks,
        lowStock,
        topSellers,
        topProducts,
        daily,
      ] = await Promise.all([
        Order.countDocuments(orderQueueFilter("verify")),
        Order.countDocuments(orderQueueFilter("awaiting")),
        Order.countDocuments(orderQueueFilter("ready")),
        Order.countDocuments(orderQueueFilter("refund")),
        Seller.countDocuments({ approvalStatus: "pending" }),
        Dispute.countDocuments({ status: { $in: ["open", "under_review"] } }),
        Payout.countDocuments({ status: "pending" }),
        SellerEarning.countDocuments({ clawbackRequired: true }),
        Product.countDocuments({ isActive: true, stock: { $lte: 5 } }),
        SellerEarning.aggregate([
          {
            $match: {
              status: { $ne: "reversed" },
              clawbackRequired: { $ne: true },
              createdAt: { $gte: since },
            },
          },
          {
            $group: {
              _id: "$sellerId",
              sales: { $sum: "$commissionBase" },
              commission: { $sum: "$commission" },
            },
          },
          { $sort: { sales: -1 } },
          { $limit: 5 },
        ]),
        Product.find({ isActive: true })
          .sort({ salesCount: -1 })
          .limit(5)
          .select("title salesCount price images")
          .lean(),
        Order.aggregate([
          { $match: { paymentStatus: "paid", paidAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
              revenue: { $sum: "$total" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);
      const stores = await Seller.find({ _id: { $in: topSellers.map((t) => t._id) } })
        .select("storeName")
        .lean();
      const nameById = new Map(stores.map((s) => [String(s._id), s.storeName]));
      res.json({
        attention: {
          verify,
          awaiting,
          ready,
          refunds,
          pendingSellers,
          openDisputes,
          pendingPayouts,
          clawbacks,
          lowStock,
        },
        topSellers: topSellers.map((t) => ({
          sellerId: String(t._id),
          storeName: nameById.get(String(t._id)) ?? "(deleted store)",
          sales: t.sales,
          commission: t.commission,
        })),
        topProducts,
        daily,
      });
    } catch (e) {
      next(e);
    }
  });

  // ── Audit log ──────────────────────────────────────────────────────────────
  adminRouter.get("/activity", async (req, res, next) => {
    try {
      const { q, type, page = "1", limit = "30" } = req.query as Record<string, string>;
      const filter: Record<string, unknown> = {};
      if (type) filter.targetType = type;
      if (q?.trim()) {
        const re = new RegExp(escapeRegex(q.trim()), "i");
        filter.$or = [{ summary: re }, { action: re }, { adminName: re }];
      }
      const pg = Math.max(1, Number(page));
      const lim = Math.min(100, Math.max(1, Number(limit)));
      const [actions, total] = await Promise.all([
        AdminAction.find(filter)
          .sort({ createdAt: -1 })
          .skip((pg - 1) * lim)
          .limit(lim)
          .lean(),
        AdminAction.countDocuments(filter),
      ]);
      res.json({ actions, total, page: pg, pages: Math.ceil(total / lim) });
    } catch (e) {
      next(e);
    }
  });

  // ── Settings (read-only: shows how the platform is currently configured) ───
  adminRouter.get("/settings", (_req, res) => {
    res.json({
      commission: {
        defaultRate: BUSINESS.COMMISSION_RATE,
        holdDays: BUSINESS.EARNINGS_HOLD_DAYS,
        minPayout: BUSINESS.MIN_PAYOUT_RWF,
      },
      referral: BUSINESS.REFERRAL,
      loyalty: {
        pointsPerRwf: BUSINESS.POINTS_PER_RWF,
        rwfPerPoint: BUSINESS.RWF_PER_POINT,
        maxRedemptionPct: BUSINESS.MAX_POINTS_REDEMPTION_PCT,
      },
      delivery: {
        fees: BUSINESS.DELIVERY_FEES,
        freeStandardOver: BUSINESS.FREE_STANDARD_DELIVERY_THRESHOLD,
      },
      payments: {
        pawapay: pawapayConfigured(),
        pawapayEnv: env.PAWAPAY_ENV,
        manualAccounts: manualAccounts(),
      },
      services: {
        email: Boolean(env.BREVO_API_KEY),
        images: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY),
        redis: Boolean(env.UPSTASH_REDIS_REST_URL),
        googleSignIn: Boolean(env.GOOGLE_CLIENT_ID),
        ai: Boolean(env.HF_API_TOKEN),
      },
      environment: env.NODE_ENV,
      clientUrl: env.CLIENT_URL,
      supportEmail: env.SUPPORT_EMAIL,
    });
  });
}
