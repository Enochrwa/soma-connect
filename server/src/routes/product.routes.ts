import { Router } from "express";
import { z } from "zod";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { slugify } from "../utils/slug.js";
import { sanitizeDescription } from "../middleware/sanitize.js";

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

    const filter: Record<string, unknown> = { isActive: true };
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (inStock === "true") filter.stock = { $gt: 0 };
    if (minPrice || maxPrice) {
      const priceRange: Record<string, number> = {};
      if (minPrice) priceRange.$gte = Number(minPrice);
      if (maxPrice) priceRange.$lte = Number(maxPrice);
      filter.price = priceRange;
    }

    // Use regex fallback if no text index exists (avoids silent empty results)
    if (q) {
      try {
        filter.$text = { $search: q };
      } catch {
        filter.$or = [
          { title: new RegExp(q, "i") },
          { description: new RegExp(q, "i") },
          { tags: new RegExp(q, "i") },
        ];
      }
    }

    type SortSpec = Record<string, 1 | -1>;
    const textScore = { score: { $meta: "textScore" } } as unknown as SortSpec;
    const sortMap: Record<string, SortSpec> = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { avgRating: -1 },
      relevance: q ? textScore : { salesCount: -1, createdAt: -1 },
    };

    const pg = Math.max(1, Number(page));
    const lim = Math.min(60, Math.max(1, Number(limit)));

    const projection = q ? ({ score: { $meta: "textScore" } } as unknown as SortSpec) : undefined;

    let items: unknown[] = [];
    let total = 0;

    try {
      const cursor = Product.find(filter, projection)
        .sort(sortMap[sort] ?? sortMap.relevance)
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean();
      [items, total] = await Promise.all([cursor, Product.countDocuments(filter)]);
    } catch {
      // Text index not built — fall back to regex search
      if (q) {
        delete filter.$text;
        filter.$or = [
          { title: new RegExp(q, "i") },
          { description: new RegExp(q, "i") },
          { tags: new RegExp(q, "i") },
        ];
        const cursor = Product.find(filter)
          .sort({ salesCount: -1, createdAt: -1 })
          .skip((pg - 1) * lim)
          .limit(lim)
          .lean();
        [items, total] = await Promise.all([cursor, Product.countDocuments(filter)]);
      }
    }

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
      if (!seller.isActive) throw new HttpError(403, "Your seller account is pending approval.");
      const body = req.body as z.infer<typeof createSchema>;
      // Sanitize description to prevent XSS
      body.description = sanitizeDescription(body.description);
      const product = await Product.create({
        ...body,
        sellerId: seller._id,
        slug: `${slugify(body.title)}-${Date.now().toString(36)}`,
      });
      res.status(201).json({ product });
    } catch (e) {
      next(e);
    }
  },
);

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

productRouter.put(
  "/:id",
  requireAuth,
  requireRole("seller", "admin"),
  validate(updateSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) throw new HttpError(404, "Product not found.");

      if (req.user!.role !== "admin") {
        const seller = await Seller.findOne({ userId: req.user!.id });
        if (!seller || String(product.sellerId) !== String(seller._id)) {
          throw new HttpError(403, "You can only edit your own products.");
        }
      }

      const body = req.body as z.infer<typeof updateSchema>;
      // Sanitize description
      if (body.description) body.description = sanitizeDescription(body.description);
      if (body.title) {
        (body as Record<string, unknown>).slug =
          `${slugify(body.title)}-${Date.now().toString(36)}`;
      }
      Object.assign(product, body);
      await product.save();
      res.json({ product });
    } catch (e) {
      next(e);
    }
  },
);

productRouter.delete(
  "/:id",
  requireAuth,
  requireRole("seller", "admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) throw new HttpError(404, "Product not found.");

      if (req.user!.role !== "admin") {
        const seller = await Seller.findOne({ userId: req.user!.id });
        if (!seller || String(product.sellerId) !== String(seller._id)) {
          throw new HttpError(403, "You can only delete your own products.");
        }
      }

      product.isActive = false;
      await product.save();
      res.json({ ok: true, message: "Product removed from store." });
    } catch (e) {
      next(e);
    }
  },
);

productRouter.delete(
  "/:id/hard",
  requireAuth,
  requireRole("admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) throw new HttpError(404, "Product not found.");
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);
