import { Router } from "express";
import { z } from "zod";
import { Seller } from "../models/Seller.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { slugify } from "../utils/slug.js";

export const sellerRouter = Router();

const applySchema = z.object({
  storeName: z.string().min(2).max(80),
  description: z.string().max(800).optional(),
  accountType: z.enum(["individual", "business", "farm"]).default("individual"),
  sector: z.string().min(2),
  district: z.string().min(2).optional(),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  nidUrl: z.string().url().optional(),
  licenseUrl: z.string().url().optional(),
});

sellerRouter.post(
  "/apply",
  requireAuth,
  validate(applySchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = req.body as z.infer<typeof applySchema>;
      const existing = await Seller.findOne({ userId: req.user!.id });
      if (existing) throw new HttpError(409, "You already have a store.");
      const slug = `${slugify(body.storeName)}-${Date.now().toString(36).slice(-4)}`;
      const seller = await Seller.create({
        userId: req.user!.id,
        storeName: body.storeName,
        storeSlug: slug,
        description: body.description,
        accountType: body.accountType,
        location: { sector: body.sector, district: body.district },
        logo: body.logo,
        banner: body.banner,
        documents: {
          nidUrl: body.nidUrl,
          licenseUrl: body.licenseUrl,
        },
        // New sellers start pending — admin must approve
        approvalStatus: "pending",
        isActive: false,
      });
      res.status(201).json({
        seller,
        message:
          "Your store application has been submitted. You will be notified once an admin approves it.",
      });
    } catch (e) {
      next(e);
    }
  },
);

sellerRouter.get("/me/overview", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const seller = await Seller.findOne({ userId: req.user!.id });
    if (!seller) throw new HttpError(404, "No store yet.");
    const productCount = await Product.countDocuments({ sellerId: seller._id });
    res.json({ seller, productCount });
  } catch (e) {
    next(e);
  }
});

// ── Seller Orders ─────────────────────────────────────────────────────────────
// Sellers can see all orders containing their products

sellerRouter.get(
  "/me/orders",
  requireAuth,
  requireRole("seller", "admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const seller = await Seller.findOne({ userId: req.user!.id });
      if (!seller) throw new HttpError(404, "No store found.");

      const { status, page = "1", limit = "20" } = req.query as Record<string, string | undefined>;
      const filter: Record<string, unknown> = { sellerIds: String(seller._id) };
      if (status) filter.status = status;

      const pg = Math.max(1, Number(page));
      const lim = Math.min(50, Number(limit));

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip((pg - 1) * lim)
          .limit(lim)
          .populate("buyerId", "profile phone email")
          .lean(),
        Order.countDocuments(filter),
      ]);

      // Filter items to only this seller's items
      const sellerId = String(seller._id);
      const filteredOrders = orders.map((order) => ({
        ...order,
        items: order.items.filter((item) => String(item.sellerId) === sellerId),
      }));

      res.json({ orders: filteredOrders, total, page: pg, pages: Math.ceil(total / lim) });
    } catch (e) {
      next(e);
    }
  },
);

// Seller analytics overview
sellerRouter.get(
  "/me/analytics",
  requireAuth,
  requireRole("seller", "admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const seller = await Seller.findOne({ userId: req.user!.id });
      if (!seller) throw new HttpError(404, "No store found.");

      const sellerId = String(seller._id);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [totalOrders, pendingOrders, recentRevenue, totalProducts, activeProducts] =
        await Promise.all([
          Order.countDocuments({ sellerIds: sellerId }),
          Order.countDocuments({ sellerIds: sellerId, status: "placed" }),
          Order.aggregate([
            {
              $match: {
                sellerIds: sellerId,
                paymentStatus: "paid",
                createdAt: { $gte: thirtyDaysAgo },
              },
            },
            { $unwind: "$items" },
            { $match: { "items.sellerId": seller._id } },
            {
              $group: {
                _id: null,
                total: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
              },
            },
          ]),
          Product.countDocuments({ sellerId: seller._id }),
          Product.countDocuments({ sellerId: seller._id, isActive: true }),
        ]);

      res.json({
        totalOrders,
        pendingOrders,
        revenueThisMonth: recentRevenue[0]?.total ?? 0,
        totalProducts,
        activeProducts,
        rating: seller.rating,
        ratingCount: seller.ratingCount,
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── Holiday Mode Toggle ───────────────────────────────────────────────────────

sellerRouter.patch(
  "/me/holiday",
  requireAuth,
  requireRole("seller", "admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const seller = await Seller.findOne({ userId: req.user!.id });
      if (!seller) throw new HttpError(404, "No store found.");
      seller.holidayMode = !seller.holidayMode;
      await seller.save();
      res.json({
        holidayMode: seller.holidayMode,
        message: seller.holidayMode
          ? "Holiday mode enabled. Your store is now temporarily closed."
          : "Holiday mode disabled. Your store is open again.",
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── Low-stock alerts for seller analytics ────────────────────────────────────

sellerRouter.get(
  "/me/low-stock",
  requireAuth,
  requireRole("seller", "admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const seller = await Seller.findOne({ userId: req.user!.id });
      if (!seller) throw new HttpError(404, "No store found.");
      const threshold = Number((req.query as Record<string, string>).threshold ?? "5");
      const products = await Product.find({
        sellerId: seller._id,
        isActive: true,
        stock: { $lte: threshold },
      })
        .select("_id title stock images price")
        .lean();
      res.json({ products, threshold });
    } catch (e) {
      next(e);
    }
  },
);

// ── Public store page — MUST be last to avoid swallowing /apply, /me/* etc. ──
sellerRouter.get("/:slug", async (req, res, next) => {
  try {
    const seller = await Seller.findOne({ storeSlug: req.params.slug }).lean();
    if (!seller) throw new HttpError(404, "Store not found.");
    const products = await Product.find({ sellerId: seller._id, isActive: true }).limit(20).lean();
    res.json({ seller, products });
  } catch (e) {
    next(e);
  }
});
