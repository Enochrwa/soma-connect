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

// ── Wishlist (server-side persistence) ────────────────────────────────────────

userRouter.get("/me/wishlist", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await User.findById(req.user!.id)
      .populate("wishedProducts", "_id title images price comparePrice avgRating slug isActive")
      .lean();
    res.json({ items: user?.wishedProducts ?? [] });
  } catch (e) {
    next(e);
  }
});

userRouter.post("/me/wishlist/:productId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $addToSet: { wishedProducts: req.params.productId } },
      { new: true },
    )
      .populate("wishedProducts", "_id title images price comparePrice avgRating slug isActive")
      .lean();
    res.json({ items: user?.wishedProducts ?? [] });
  } catch (e) {
    next(e);
  }
});

userRouter.delete("/me/wishlist/:productId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $pull: { wishedProducts: req.params.productId } },
      { new: true },
    )
      .populate("wishedProducts", "_id title images price comparePrice avgRating slug isActive")
      .lean();
    res.json({ items: user?.wishedProducts ?? [] });
  } catch (e) {
    next(e);
  }
});

// ── Data Export (Rwanda Data Protection Law No. 058/2021) ─────────────────────

userRouter.get("/me/export", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { Order } = await import("../models/Order.js");
    const { Review } = await import("../models/Review.js");
    const { LoyaltyEvent } = await import("../models/LoyaltyEvent.js");

    const [user, orders, reviews, loyaltyEvents] = await Promise.all([
      User.findById(req.user!.id).select("-passwordHash -failedLogins -googleId").lean(),
      Order.find({ buyerId: req.user!.id }).lean(),
      Review.find({ buyerId: req.user!.id }).lean(),
      LoyaltyEvent.find({ userId: req.user!.id }).lean(),
    ]);

    res.setHeader("Content-Disposition", "attachment; filename=soma-my-data.json");
    res.setHeader("Content-Type", "application/json");
    res.json({
      exportedAt: new Date().toISOString(),
      notice: "Exported under Rwanda Data Protection Law No. 058/2021",
      profile: user,
      orders,
      reviews,
      loyaltyEvents,
    });
  } catch (e) {
    next(e);
  }
});

// ── Account Deletion (soft-delete, anonymises personal data) ─────────────────

userRouter.delete("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { Seller } = await import("../models/Seller.js");
    const seller = await Seller.findOne({ userId: req.user!.id });
    if (seller?.isActive) {
      throw new HttpError(400, "Please deactivate your store before deleting your account.");
    }
    // Anonymise PII, keep orders for financial records
    await User.findByIdAndUpdate(req.user!.id, {
      phone: `deleted_${req.user!.id}`,
      email: null,
      passwordHash: null,
      googleId: null,
      "profile.name": "Deleted User",
      "profile.avatar": null,
      addresses: [],
      wishedProducts: [],
      deletedAt: new Date(),
    });
    res.json({ ok: true, message: "Your account has been deleted and personal data anonymised." });
  } catch (e) {
    next(e);
  }
});

// ── Push Subscription (Web Push) ─────────────────────────────────────────────

userRouter.post("/me/push-subscription", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { subscription } = req.body as { subscription: unknown };
    await User.findByIdAndUpdate(req.user!.id, { pushSubscription: subscription });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
