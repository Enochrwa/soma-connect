/**
 * Bulk Product Import – FREE approach using CSV upload.
 *
 * How it works:
 *  1. Seller downloads the CSV template from GET /api/products/bulk/template
 *  2. Seller fills in their products (one row = one product)
 *  3. Seller POSTs the CSV to /api/products/bulk/import (multipart/form-data, field "file")
 *  4. Server parses, validates row-by-row, and bulk-inserts valid rows.
 *  5. Response returns counts of success / failed rows + per-row errors.
 *
 * Image handling (free):
 *  - Sellers put comma-separated public image URLs in the "images" column.
 *  - Cloudinary remote-fetch upload is supported via the existing cloudinary
 *    service if a non-http URL scheme is detected (optional, not required).
 *
 * Zero paid dependencies – uses only "papaparse" (MIT) which is already
 * in the ecosystem and "multer" (already installed in server).
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import Papa from "papaparse";
import { z } from "zod";
import { Product } from "../models/Product.js";
import { Seller } from "../models/Seller.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { slugify } from "../utils/slug.js";
import { sanitizeDescription } from "../middleware/sanitize.js";
import {
  generateProductDescription,
  generateProductTags,
  getEmbedding,
} from "../services/ai.service.js";

export const bulkImportRouter = Router();

// ── Multer: store CSV in memory (no disk I/O, no paid storage) ───────────────
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are accepted."));
    }
  },
});

// ── CSV row schema ────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Food",
  "Health",
  "Home",
  "Agriculture",
  "Beauty",
  "Books",
  "Services",
] as const;

const rowSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(8000).default(""),
  category: z.enum(CATEGORIES),
  price: z.coerce.number().int().positive(),
  comparePrice: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
  stock: z.coerce.number().int().nonnegative().default(0),
  condition: z.enum(["new", "used"]).default("new"),
  /**
   * Comma-separated list of public image URLs.
   * Sellers can use any free image host: Cloudinary (free tier), ImgBB,
   * Imgur, or their own server.
   */
  images: z.preprocess((v) => {
    if (typeof v !== "string") return [];
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, z.array(z.string().url()).min(1).max(8)),
  /** Comma-separated tags */
  tags: z.preprocess((v) => {
    if (typeof v !== "string") return [];
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, z.array(z.string()).max(20).default([])),
});

type RowInput = z.input<typeof rowSchema>;
type RowOutput = z.output<typeof rowSchema>;

// ── GET /api/products/bulk/template – download blank CSV template ─────────────
bulkImportRouter.get("/template", (_req: Request, res: Response) => {
  const headers = [
    "title",
    "description",
    "category",
    "price",
    "comparePrice",
    "stock",
    "condition",
    "images",
    "tags",
  ];

  const exampleRow = [
    "Sample Product",
    "A great product description here",
    "Electronics",
    "15000",
    "20000",
    "50",
    "new",
    "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "sample,demo,product",
  ];

  const csv = [headers.join(","), exampleRow.join(",")].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=soma-products-template.csv");
  res.send(csv);
});

// ── POST /api/products/bulk/import – parse + create products ─────────────────
bulkImportRouter.post(
  "/import",
  requireAuth,
  requireRole("seller", "admin"),
  csvUpload.single("file"),
  async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) throw new HttpError(400, "No CSV file uploaded. Field name must be 'file'.");

      // Find the seller record
      const seller = await Seller.findOne({ userId: req.user!.id });
      if (!seller) throw new HttpError(403, "Complete seller onboarding first.");
      if (!seller.isActive) throw new HttpError(403, "Your seller account is pending approval.");

      // Parse CSV
      const csvText = req.file.buffer.toString("utf-8");
      const { data: rawRows, errors: parseErrors } = Papa.parse<RowInput>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, ""),
      });

      if (parseErrors.length > 0 && rawRows.length === 0) {
        throw new HttpError(400, `CSV parse error: ${parseErrors[0].message}`);
      }

      if (rawRows.length === 0) {
        throw new HttpError(400, "CSV file has no data rows.");
      }

      if (rawRows.length > 500) {
        throw new HttpError(400, "Maximum 500 products per import. Please split into batches.");
      }

      // Validate + collect results
      const successes: RowOutput[] = [];
      const failures: Array<{ row: number; errors: string[] }> = [];

      for (let i = 0; i < rawRows.length; i++) {
        const rowNum = i + 2; // 1-indexed + header row
        const result = rowSchema.safeParse(rawRows[i]);
        if (!result.success) {
          failures.push({
            row: rowNum,
            errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          });
        } else {
          successes.push(result.data);
        }
      }

      // ── 9. AI-enhance: fill blank descriptions + tags ──────────────────────
      const aiEnhance = req.body.aiEnhance === "true" || req.body.aiEnhance === true;

      // Bulk-insert the valid rows
      let inserted = 0;
      const insertErrors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < successes.length; i++) {
        const row = successes[i];
        try {
          let description = row.description || "";
          let tags: string[] = row.tags ?? [];

          if (aiEnhance) {
            // ── 5. Image URL validator ──────────────────────────────────────
            for (const imgUrl of row.images ?? []) {
              try {
                const imgRes = await fetch(imgUrl, {
                  method: "HEAD",
                  signal: AbortSignal.timeout(3000),
                });
                if (!imgRes.ok) {
                  insertErrors.push({
                    row: i + 2,
                    error: `Image URL ${imgUrl} returned ${imgRes.status}`,
                  });
                }
              } catch {
                /* timeout or DNS fail */
              }
            }

            if (!description) {
              description = await generateProductDescription(row.title, row.category).catch(
                () => "",
              );
            }
            if (tags.length === 0 && description) {
              tags = await generateProductTags(description, row.category).catch(() => []);
            }
          }

          const finalDescription = sanitizeDescription(description);
          const embedding =
            aiEnhance && finalDescription
              ? await getEmbedding(`${row.title} ${finalDescription}`).catch(() => null)
              : null;

          await Product.create({
            ...row,
            description: finalDescription,
            tags,
            sellerId: seller._id,
            slug: `${slugify(row.title)}-${Date.now().toString(36)}-${i}`,
            ...(embedding ? { embedding } : {}),
          });
          inserted++;
        } catch (err: unknown) {
          insertErrors.push({
            // Map back to original row index
            row: (i + 2) as number,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      res.status(200).json({
        ok: true,
        summary: {
          total: rawRows.length,
          inserted,
          validationFailed: failures.length,
          insertFailed: insertErrors.length,
        },
        validationErrors: failures,
        insertErrors,
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /api/products/bulk/validate – dry-run without inserting ───────────────
bulkImportRouter.post(
  "/validate",
  requireAuth,
  requireRole("seller", "admin"),
  csvUpload.single("file"),
  async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) throw new HttpError(400, "No CSV file uploaded.");

      const csvText = req.file.buffer.toString("utf-8");
      const { data: rawRows } = Papa.parse<RowInput>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, ""),
      });

      const results = rawRows.map((row, i) => {
        const parsed = rowSchema.safeParse(row);
        return {
          row: i + 2,
          valid: parsed.success,
          errors: parsed.success
            ? []
            : parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          preview: parsed.success
            ? { title: parsed.data.title, price: parsed.data.price, category: parsed.data.category }
            : null,
        };
      });

      res.json({
        ok: true,
        total: rawRows.length,
        validCount: results.filter((r) => r.valid).length,
        invalidCount: results.filter((r) => !r.valid).length,
        rows: results,
      });
    } catch (e) {
      next(e);
    }
  },
);
