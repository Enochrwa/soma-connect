import { Router } from "express";
import { z } from "zod";
import { Seller } from "../models/Seller.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { slugify } from "../utils/slug.js";

export const sellerRouter = Router();

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

const applySchema = z.object({
  storeName: z.string().min(2).max(80),
  description: z.string().max(800).optional(),
  accountType: z.enum(["individual", "business", "farm"]).default("individual"),
  sector: z.string().min(2),
  district: z.string().min(2).optional(),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
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
      });
      await User.findByIdAndUpdate(req.user!.id, { role: "seller" });
      res.status(201).json({ seller });
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
