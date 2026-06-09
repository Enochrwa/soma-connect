import { Router } from "express";
import { upload } from "../services/cloudinary.service.js";
import { requireAuth } from "../middleware/auth.js";

export const uploadRouter = Router();

uploadRouter.post("/", requireAuth, upload.array("files", 8), (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  res.json({
    urls: files.map((f) => (f as any).path as string),
  });
});