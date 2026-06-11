import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";

export const userRouter = Router();

// ── Get my profile ────────────────────────────────────────────────────────────
userRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await User.findById(req.user!.id).select("-passwordHash -failedLogins").lean();
    if (!user) throw new HttpError(404, "User not found.");
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

// ── Update profile ────────────────────────────────────────────────────────────
const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  avatar: z.string().url().optional(),
  language: z.enum(["en", "rw", "fr"]).optional(),
  notificationPrefs: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional(),
});

userRouter.patch(
  "/me",
  requireAuth,
  validate(updateProfileSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { name, avatar, language, notificationPrefs } = req.body as z.infer<
        typeof updateProfileSchema
      >;
      const update: Record<string, unknown> = {};
      if (name) update["profile.name"] = name;
      if (avatar) update["profile.avatar"] = avatar;
      if (language) update["profile.language"] = language;
      if (notificationPrefs?.email !== undefined)
        update["notificationPrefs.email"] = notificationPrefs.email;
      if (notificationPrefs?.push !== undefined)
        update["notificationPrefs.push"] = notificationPrefs.push;

      const user = await User.findByIdAndUpdate(req.user!.id, { $set: update }, { new: true })
        .select("-passwordHash -failedLogins")
        .lean();
      res.json({ user });
    } catch (e) {
      next(e);
    }
  },
);

// ── Addresses ─────────────────────────────────────────────────────────────────
const addressSchema = z.object({
  label: z.string().max(40).optional(),
  sector: z.string().min(2),
  district: z.string().optional(),
  street: z.string().optional(),
  phone: z.string().min(7).optional(),
  isDefault: z.boolean().default(false),
});

userRouter.post(
  "/me/addresses",
  requireAuth,
  validate(addressSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) throw new HttpError(404, "User not found.");
      // Mongoose subdocument array — access as a plain array via type assertion to subdoc shape
      type AddressDoc = { _id: unknown; isDefault: boolean };
      const addrs = (user.addresses ?? []) as AddressDoc[];
      if (req.body.isDefault) {
        addrs.forEach((a) => {
          a.isDefault = false;
        });
      }
      addrs.push(req.body as AddressDoc);
      user.addresses = addrs as typeof user.addresses;
      await user.save();
      res.json({ addresses: user.addresses });
    } catch (e) {
      next(e);
    }
  },
);

userRouter.delete(
  "/me/addresses/:addressId",
  requireAuth,
  async (req: AuthedRequest, res, next) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) throw new HttpError(404, "User not found.");
      type AddressDoc = { _id: unknown; isDefault: boolean };
      const addrs = (user.addresses ?? []) as AddressDoc[];
      user.addresses = addrs.filter(
        (a) => String(a._id) !== req.params.addressId,
      ) as typeof user.addresses;
      await user.save();
      res.json({ addresses: user.addresses });
    } catch (e) {
      next(e);
    }
  },
);

// ── My orders ─────────────────────────────────────────────────────────────────
userRouter.get("/me/orders", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const orders = await Order.find({ buyerId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ orders });
  } catch (e) {
    next(e);
  }
});

// ── Wishlist (stored in client Redux for now, placeholder here) ───────────────
userRouter.get("/me/wishlist", requireAuth, (_req, res) => {
  res.json({ items: [] }); // Client manages wishlist in localStorage
});
