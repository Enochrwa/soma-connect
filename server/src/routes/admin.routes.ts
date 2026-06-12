import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { Seller } from "../models/Seller.js";
import { Product } from "../models/Product.js";
import { sendSellerApprovalEmail } from "../services/email.service.js";
import { Order } from "../models/Order.js";
import { Transaction } from "../models/Transaction.js";
import { Review } from "../models/Review.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";

export const adminRouter = Router();

// All admin routes require auth + admin role
adminRouter.use(requireAuth, requireRole("admin"));

// ── Dashboard ────────────────────────────────────────────────────────────────

adminRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,
      pendingSellerApprovals,
      pendingOrders,
      paidTransactions,
    ] = await Promise.all([
      User.countDocuments(),
      Seller.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Seller.countDocuments({ approvalStatus: "pending" }),
      Order.countDocuments({ status: { $nin: ["delivered", "cancelled"] } }),
      Transaction.aggregate([
        { $match: { status: "succeeded" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("buyerId", "profile phone")
      .lean();

    const gmv = paidTransactions[0]?.total ?? 0;

    res.json({
      stats: {
        totalUsers,
        totalSellers,
        totalProducts,
        totalOrders,
        pendingSellerApprovals,
        pendingOrders,
        gmv,
        totalRevenue: gmv,
      },
      recentOrders,
    });
  } catch (e) {
    next(e);
  }
});

// ── Users ────────────────────────────────────────────────────────────────────

adminRouter.get("/users", async (req, res, next) => {
  try {
    const { q, role, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (q)
      filter.$or = [
        { phone: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { "profile.name": new RegExp(q, "i") },
      ];

    const pg = Math.max(1, Number(page));
    const lim = Math.min(100, Number(limit));
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean(),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

const banSchema = z.object({ banned: z.boolean(), reason: z.string().max(280).optional() });
adminRouter.patch("/users/:id/ban", validate(banSchema), async (req, res, next) => {
  try {
    const { banned } = req.body as z.infer<typeof banSchema>;
    await User.findByIdAndUpdate(req.params.id, {
      lockedUntil: banned ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) : undefined,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ── Sellers ──────────────────────────────────────────────────────────────────

// IMPORTANT: /sellers/pending must be registered BEFORE /sellers, otherwise
// Express matches /sellers first and /sellers/pending is never reached.
adminRouter.get("/sellers/pending", async (_req, res, next) => {
  try {
    const sellers = await Seller.find({ approvalStatus: "pending" })
      .populate("userId", "profile phone email")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ sellers, total: sellers.length });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/sellers", async (req, res, next) => {
  try {
    const { tier, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (tier) filter.verificationTier = tier;
    const pg = Math.max(1, Number(page));
    const lim = Math.min(100, Number(limit));
    const [sellers, total] = await Promise.all([
      Seller.find(filter)
        .populate("userId", "profile phone email")
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean(),
      Seller.countDocuments(filter),
    ]);
    res.json({ sellers, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

const tierSchema = z.object({
  tier: z.enum(["basic", "trusted", "verified", "top_seller"]),
});
adminRouter.patch("/sellers/:id/tier", validate(tierSchema), async (req, res, next) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { verificationTier: req.body.tier },
      { new: true },
    );
    res.json({ seller });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/sellers/:id/suspend", async (req, res, next) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    res.json({ seller });
  } catch (e) {
    next(e);
  }
});

// ── Products ─────────────────────────────────────────────────────────────────

adminRouter.get("/products", async (req, res, next) => {
  try {
    const { q, category, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };
    const pg = Math.max(1, Number(page));
    const lim = Math.min(100, Number(limit));
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("sellerId", "storeName")
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ products, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/products/:id/toggle", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    product.isActive = !product.isActive;
    await product.save();
    res.json({ product });
  } catch (e) {
    next(e);
  }
});

// ── Orders ───────────────────────────────────────────────────────────────────

adminRouter.get("/orders", async (req, res, next) => {
  try {
    const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const pg = Math.max(1, Number(page));
    const lim = Math.min(100, Number(limit));
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("buyerId", "profile phone")
        .sort({ createdAt: -1 })
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

// ── Reviews Moderation ───────────────────────────────────────────────────────

adminRouter.get("/reviews/flagged", async (_req, res, next) => {
  try {
    // In a real system you'd have a flagged field; for now return reviews with no helpful votes
    const reviews = await Review.find({ helpfulVotes: 0 })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("buyerId", "profile")
      .populate("productId", "title")
      .lean();
    res.json({ reviews });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/reviews/:id", async (req: AuthedRequest, res, next) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ── Analytics ────────────────────────────────────────────────────────────────

adminRouter.get("/analytics/revenue", async (req, res, next) => {
  try {
    const { days = "30" } = req.query as { days?: string };
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const data = await Transaction.aggregate([
      { $match: { status: "succeeded", createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ── Seller Approval Workflow ──────────────────────────────────────────────────

const approvalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional(),
});

adminRouter.patch(
  "/sellers/:id/approve",
  validate(approvalSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { status, note } = req.body as z.infer<typeof approvalSchema>;
      const seller = await Seller.findById(req.params.id).populate<{
        userId: { _id: string; role: string };
      }>("userId");
      if (!seller) throw new HttpError(404, "Seller not found.");

      seller.approvalStatus = status as "approved" | "rejected";
      seller.approvalNote = note;
      if (status === "approved") {
        seller.isActive = true;
        await User.findByIdAndUpdate(seller.userId, { role: "seller" });
      } else {
        seller.isActive = false;
      }
      await seller.save();

      // Email the seller about the decision
      const sellerUser = await User.findById(seller.userId).lean();
      if (sellerUser?.email) {
        sendSellerApprovalEmail(
          sellerUser.email,
          seller.storeName,
          status === "approved",
          note,
        ).catch((e) => console.error("[email] seller approval email failed", e));
      }

      res.json({ seller, message: `Seller ${status} successfully.` });
    } catch (e) {
      next(e);
    }
  },
);

// ── Coupon Management ────────────────────────────────────────────────────────
import { Coupon } from "../models/Coupon.js";

const couponCreateSchema = z.object({
  code: z.string().min(3).max(30).toUpperCase(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive(),
  minOrder: z.number().nonnegative().default(0),
  maxUses: z.number().int().positive().default(100),
  expiresAt: z.string().datetime(),
  sellerId: z.string().optional(),
});

adminRouter.get("/coupons", async (_req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ coupons, total: coupons.length });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/coupons", validate(couponCreateSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof couponCreateSchema>;
    const coupon = await Coupon.create({
      ...body,
      code: body.code.toUpperCase(),
      expiresAt: new Date(body.expiresAt),
    });
    res.status(201).json({ coupon });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/coupons/:id/toggle", async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new HttpError(404, "Coupon not found.");
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ coupon });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/coupons/:id", async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ── Dispute Management ───────────────────────────────────────────────────────
import { Dispute } from "../models/Dispute.js";

adminRouter.get("/disputes", async (req, res, next) => {
  try {
    const { status } = req.query as { status?: string };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("buyerId", "profile phone email")
      .populate("orderId", "orderNumber total status")
      .lean();
    res.json({ disputes, total: disputes.length });
  } catch (e) {
    next(e);
  }
});

// ── Payouts Management ────────────────────────────────────────────────────────
import { Payout } from "../models/Payout.js";

adminRouter.get("/payouts", async (_req, res, next) => {
  try {
    const payouts = await Payout.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sellerId", "storeName")
      .lean();
    res.json({ payouts, total: payouts.length });
  } catch (e) {
    next(e);
  }
});

// ── Payment Confirmation ──────────────────────────────────────────────────────
// Admin confirms a manual mobile money payment, moving order from pending_payment → payment_confirmed
adminRouter.post("/orders/:orderId/confirm-payment", async (req: AuthedRequest, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.paymentStatus === "paid") throw new HttpError(400, "Payment already confirmed.");

    order.paymentStatus = "paid";
    order.status = "payment_confirmed";
    order.statusHistory.push({
      status: "payment_confirmed",
      at: new Date(),
      note: `Manual payment confirmed by admin (${req.user!.id})`,
    });
    await order.save();

    if (order.paymentRef) {
      await (
        await import("../models/Transaction.js")
      ).Transaction.updateOne({ mockRef: order.paymentRef }, { status: "succeeded" });
    }

    const { emitOrderUpdate } = await import("../socket/index.js");
    emitOrderUpdate(String(order._id), { status: "payment_confirmed", at: new Date() });

    res.json({ message: "Payment confirmed.", order });
  } catch (e) {
    next(e);
  }
});
