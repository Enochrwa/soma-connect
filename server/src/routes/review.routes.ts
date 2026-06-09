import { Router } from "express";
import { z } from "zod";
import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

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

reviewRouter.post("/", requireAuth, validate(createSchema), async (req: AuthedRequest, res, next) => {
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
    // recompute aggregate
    const agg = await Review.aggregate([
      { $match: { productId: review.productId } },
      { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (agg[0]) {
      await Product.findByIdAndUpdate(review.productId, {
        avgRating: Math.round(agg[0].avg * 10) / 10,
        reviewCount: agg[0].count,
      });
    }
    res.status(201).json({ review });
  } catch (e) {
    next(e);
  }
});