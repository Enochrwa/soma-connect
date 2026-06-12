import { Router } from "express";
import { z } from "zod";
import { Coupon } from "../models/Coupon.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const couponRouter = Router();

const validateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
});

// POST /api/coupons/validate — public, but user must be logged in to prevent abuse
couponRouter.post(
  "/validate",
  requireAuth,
  validate(validateSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { code, subtotal } = req.body as z.infer<typeof validateSchema>;
      const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
      if (!coupon) throw new HttpError(404, "Coupon code not found or expired.");
      if (new Date() > coupon.expiresAt) throw new HttpError(400, "This coupon has expired.");
      if (coupon.usedCount >= coupon.maxUses)
        throw new HttpError(400, "This coupon has reached its usage limit.");
      if (subtotal < coupon.minOrder) {
        throw new HttpError(
          400,
          `Minimum order of RWF ${coupon.minOrder.toLocaleString()} required for this coupon.`,
        );
      }
      const alreadyUsed = coupon.usedBy.map(String).includes(req.user!.id);
      if (alreadyUsed) throw new HttpError(400, "You have already used this coupon.");

      const discountAmount =
        coupon.type === "percentage"
          ? Math.floor((subtotal * coupon.value) / 100)
          : Math.min(coupon.value, subtotal);

      res.json({
        valid: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discountAmount,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

export default couponRouter;
