import { Router } from "express";
import { z } from "zod";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { slugify } from "../utils/slug.js";

export const productRouter = Router();

productRouter.get("/", async (req, res, next) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      sort = "relevance",
      page = "1",
      limit = "20",
      condition,
      inStock,
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, any> = { isActive: true };
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (inStock === "true") filter.stock = { $gt: 0 };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) filter.$text = { $search: q };

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { avgRating: -1 },
      relevance: q ? { score: { $meta: "textScore" } as any } : { salesCount: -1, createdAt: -1 },
    };

    const pg = Math.max(1, Number(page));
    const lim = Math.min(60, Math.max(1, Number(limit)));

    const cursor = Product.find(filter, q ? { score: { $meta: "textScore" } } : undefined)
      .sort((sortMap[sort] as any) ?? sortMap.relevance)
      .skip((pg - 1) * lim)
      .limit(lim)
      .lean();

    const [items, total] = await Promise.all([cursor, Product.countDocuments(filter)]);
    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

productRouter.get("/flash-deals", async (_req, res, next) => {
  try {
    const items = await Product.find({
      isActive: true,
      "flashSale.isActive": true,
      "flashSale.endsAt": { $gt: new Date() },
    })
      .limit(8)
      .lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

productRouter.get("/trending", async (_req, res, next) => {
  try {
    const items = await Product.find({ isActive: true })
      .sort({ salesCount: -1, avgRating: -1 })
      .limit(8)
      .lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

productRouter.get("/new", async (_req, res, next) => {
  try {
    const items = await Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(12).lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

productRouter.get("/:id", async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id).populate("sellerId").lean();
    if (!p) throw new HttpError(404, "Product not found.");
    res.json({ product: p });
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(8000).default(""),
  category: z.string().min(2),
  price: z.number().int().positive(),
  comparePrice: z.number().int().positive().optional(),
  images: z.array(z.string().url()).min(1).max(8),
  stock: z.number().int().nonnegative().default(0),
  tags: z.array(z.string()).max(20).optional(),
  condition: z.enum(["new", "used"]).default("new"),
});

productRouter.post(
  "/",
  requireAuth,
  requireRole("seller", "admin"),
  validate(createSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const seller = await Seller.findOne({ userId: req.user!.id });
      if (!seller) throw new HttpError(403, "Complete seller onboarding first.");
      const body = req.body as z.infer<typeof createSchema>;
      const product = await Product.create({
        ...body,
        sellerId: seller._id,
        slug: `${slugify(body.title)}-${Date.now().toString(36)}`,
      });
      res.status(201).json({ product });
    } catch (e) {
      next(e);
    }
  }
);