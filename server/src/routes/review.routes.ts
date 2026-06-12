import { Router } from "express";
import { z } from "zod";
import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Seller } from "../models/Seller.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";

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
