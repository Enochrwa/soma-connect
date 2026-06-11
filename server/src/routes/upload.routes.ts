import { Router } from "express";
import { upload } from "../services/cloudinary.service.js";
import { requireAuth } from "../middleware/auth.js";

// Cloudinary multer-storage-cloudinary adds a `path` field (the secure URL)
// to each file. Extend the base Multer type to describe it.
interface CloudinaryFile extends Express.Multer.File {
  path: string; // secure_url from Cloudinary
}

export const uploadRouter = Router();

uploadRouter.post("/", requireAuth, upload.array("files", 8), (req, res) => {
  const files = (req.files as CloudinaryFile[]) ?? [];
  res.json({
    urls: files.map((f) => f.path),
  });
});
