import { Router, type Request, type Response, type NextFunction } from "express";
import { upload } from "../services/cloudinary.service.js";
import { requireAuth } from "../middleware/auth.js";

// Cloudinary multer-storage-cloudinary adds a `path` field (the secure URL)
// to each file. Extend the base Multer type to describe it.
interface CloudinaryFile extends Express.Multer.File {
  path: string; // secure_url from Cloudinary
}

export const uploadRouter = Router();

uploadRouter.post(
  "/",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    upload.array("files", 8)(req, res, (err) => {
      if (err) {
        // Surface Cloudinary / multer errors clearly instead of a generic 500
        const message = (err as { message?: string }).message ?? "Upload failed. Please try again.";
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    const files = (req.files as CloudinaryFile[]) ?? [];
    if (files.length === 0) {
      res.status(400).json({ error: "No files received. Please select at least one image." });
      return;
    }
    res.json({ urls: files.map((f) => f.path) });
  },
);
