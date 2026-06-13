import { Router } from "express";
import { z } from "zod";
import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Seller } from "../models/Seller.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";
import {
  analyzeReviewSentiment,
  draftSellerReply,
  summarizeReviews,
} from "../services/ai.service.js";

export const reviewRouter = Router();

reviewRouter.get("/product/:productId", async (req, res, next) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ reviews });
  } catch (e) {
    next(e);
  }
});

// ── Summarise reviews for a product ──────────────────────────────────────────
reviewRouter.get("/product/:productId/summary", async (req, res, next) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .select("text rating")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    if (reviews.length === 0) return res.json({ summary: "" });
    const combined = reviews.map((r) => `[${r.rating}/5] ${r.text}`).join("\n\n");
    const summary = await summarizeReviews(combined);
    res.json({ summary });
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(20).max(2000),
  images: z.array(z.string().url()).max(5).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

reviewRouter.post(
  "/",
  requireAuth,
  validate(createSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const verifiedOrder = await Order.findOne({
        buyerId: req.user!.id,
        "items.productId": body.productId,
        status: "delivered",
      });
      const review = await Review.create({
        ...body,
        buyerId: req.user!.id,
        orderId: verifiedOrder?._id,
        isVerifiedPurchase: !!verifiedOrder,
      });

      // ── 4. Post-save: sentiment analysis + toxicity flagging ───────────────
      analyzeReviewSentiment(body.text)
        .then(async (result) => {
          await Review.findByIdAndUpdate(review._id, {
            sentiment: result.sentiment,
            sentimentScore: result.score,
            needsModeration: result.needsModeration,
          });
        })
        .catch(() => {
          /* non-blocking */
        });

      // Recompute product rating aggregate
      const productAgg = await Review.aggregate([
        { $match: { productId: review.productId } },
        { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]);
      if (productAgg[0]) {
        await Product.findByIdAndUpdate(review.productId, {
          avgRating: Math.round(productAgg[0].avg * 10) / 10,
          reviewCount: productAgg[0].count,
        });
      }

      // Recompute seller rating aggregate across all their products
      const product = await Product.findById(review.productId).lean();
      if (product?.sellerId) {
        const sellerProductIds = await Product.find({ sellerId: product.sellerId }).distinct("_id");
        const sellerAgg = await Review.aggregate([
          { $match: { productId: { $in: sellerProductIds } } },
          { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]);
        if (sellerAgg[0]) {
          await Seller.findByIdAndUpdate(product.sellerId, {
            rating: Math.round(sellerAgg[0].avg * 10) / 10,
            ratingCount: sellerAgg[0].count,
          });
        }
      }

      res.status(201).json({ review });
    } catch (e) {
      next(e);
    }
  },
);

// ── 6. Draft seller reply via AI ──────────────────────────────────────────────
reviewRouter.get(
  "/:id/draft-reply",
  requireAuth,
  requireRole("seller", "admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const review = await Review.findById(req.params.id).lean();
      if (!review) throw new HttpError(404, "Review not found.");
      const draft = await draftSellerReply(review.text);
      res.json({ draft });
    } catch (e) {
      next(e);
    }
  },
);

// ── Seller reply to review ────────────────────────────────────────────────────

const replySchema = z.object({
  text: z.string().min(5).max(1000),
});

reviewRouter.patch(
  "/:id/reply",
  requireAuth,
  requireRole("seller", "admin"),
  validate(replySchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { text } = req.body as { text: string };
      const review = await Review.findById(req.params.id).populate<{
        productId: { sellerId: string };
      }>("productId", "sellerId");
      if (!review) throw new HttpError(404, "Review not found.");

      if (req.user!.role !== "admin") {
        const seller = await Seller.findOne({ userId: req.user!.id });
        const productSellerId = (review.productId as unknown as { sellerId: string }).sellerId;
        if (!seller || String(seller._id) !== String(productSellerId)) {
          throw new HttpError(403, "You can only reply to reviews on your own products.");
        }
      }

      review.sellerReply = { text, at: new Date() };
      await review.save();
      res.json({ review });
    } catch (e) {
      next(e);
    }
  },
);

// ── Admin: reviews needing moderation ────────────────────────────────────────
reviewRouter.get(
  "/admin/moderation-queue",
  requireAuth,
  requireRole("admin"),
  async (_req, res, next) => {
    try {
      const reviews = await Review.find({ needsModeration: true })
        .sort({ createdAt: -1 })
        .populate("productId", "title")
        .populate("buyerId", "profile.name email")
        .lean();
      res.json({ reviews });
    } catch (e) {
      next(e);
    }
  },
);

// ── Admin: approve / dismiss moderation flag ──────────────────────────────────
reviewRouter.patch(
  "/:id/moderate",
  requireAuth,
  requireRole("admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const { action } = req.body as { action: "approve" | "remove" };
      if (action === "remove") {
        await Review.findByIdAndDelete(req.params.id);
        return res.json({ removed: true });
      }
      const review = await Review.findByIdAndUpdate(
        req.params.id,
        { needsModeration: false },
        { new: true },
      );
      res.json({ review });
    } catch (e) {
      next(e);
    }
  },
);
