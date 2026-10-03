import { Router } from "express";
import { z } from "zod";
import { Coupon } from "../models/Coupon.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Product } from "../models/Product.js";
import { evaluateCoupon } from "../services/coupon.service.js";
import type { PricedLine } from "../services/finance.js";

export const couponRouter = Router();

const validateSchema = z.object({
  code: z.string().min(1),
  // Preferred: the cart lines, so seller-specific coupons are evaluated exactly as at checkout.
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive().max(99),
        variant: z.string().optional(),
      }),
    )
    .min(1)
    .optional(),
  // Legacy fallback for older clients.
  subtotal: z.number().positive().optional(),
});

// POST /api/coupons/validate — user must be logged in to prevent abuse
couponRouter.post(
  "/validate",
  requireAuth,
  validate(validateSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { code, items, subtotal } = req.body as z.infer<typeof validateSchema>;
      const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
      if (!coupon) throw new HttpError(404, "Coupon code not found or expired.");

      let lines: PricedLine[];
      if (items) {
        const ids = [...new Set(items.map((i) => i.productId))];
        const products = await Product.find({ _id: { $in: ids } }).lean();
        const byId = new Map(products.map((p) => [String(p._id), p]));
        lines = items.map((i) => {
          const p = byId.get(i.productId);
          if (!p) throw new HttpError(400, "Some items in your cart are no longer available.");
          const v = i.variant ? p.variants?.find((x) => x.name === i.variant) : undefined;
          return {
            productId: String(p._id),
            sellerId: String(p.sellerId),
            unitPrice: p.price + (v?.priceDelta ?? 0),
            quantity: i.quantity,
          };
        });
      } else if (subtotal) {
        lines = [{ productId: "cart", sellerId: "cart", unitPrice: subtotal, quantity: 1 }];
        if (coupon.sellerId)
          throw new HttpError(400, "Please refresh the page to apply this store coupon.");
      } else {
        throw new HttpError(400, "Cart items are required.");
      }

      const { discount, couponSellerId } = evaluateCoupon(coupon, lines, req.user!.id);
      res.json({
        valid: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discountAmount: discount,
          storeSpecific: Boolean(couponSellerId),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

export default couponRouter;
