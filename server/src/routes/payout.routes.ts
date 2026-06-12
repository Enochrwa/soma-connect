import { Router } from "express";
import { z } from "zod";
import { Payout } from "../models/Payout.js";
import { Seller } from "../models/Seller.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendPayoutNotificationEmail } from "../services/email.service.js";
import mongoose from "mongoose";

export const payoutRouter = Router();

const COMMISSION_RATE = 0.1; // 10% platform commission

// ── Seller: view payout history ───────────────────────────────────────────────
payoutRouter.get(
  "/me",
  requireAuth,
  requireRole("seller", "admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const seller = await Seller.findOne({ userId: req.user!.id });
      if (!seller) throw new HttpError(404, "No store found.");
      const payouts = await Payout.find({ sellerId: seller._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.json({ payouts });
    } catch (e) {
      next(e);
    }
  },
);

// ── Seller: request on-demand payout ─────────────────────────────────────────
const requestSchema = z.object({
  momoPhone: z.string().min(10, "Enter a valid MoMo phone number"),
});

payoutRouter.post(
  "/me/request",
  requireAuth,
  requireRole("seller", "admin"),
  validate(requestSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { momoPhone } = req.body as z.infer<typeof requestSchema>;
      const seller = await Seller.findOne({ userId: req.user!.id });
      if (!seller) throw new HttpError(404, "No store found.");

      // Calculate unpaid earnings from delivered, paid orders
      const lastPayout = await Payout.findOne({ sellerId: seller._id, status: "sent" })
        .sort({ createdAt: -1 })
        .lean();

      const sincDate = lastPayout?.createdAt ?? new Date(0);

      const earningsAgg = await Order.aggregate([
        {
          $match: {
            sellerIds: seller._id,
            paymentStatus: "paid",
            status: "delivered",
            createdAt: { $gt: sincDate },
          },
        },
        { $unwind: "$items" },
        { $match: { "items.sellerId": new mongoose.Types.ObjectId(String(seller._id)) } },
        {
          $group: {
            _id: null,
            gross: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          },
        },
      ]);

      const grossAmount = earningsAgg[0]?.gross ?? 0;
      if (grossAmount < 1000) {
        throw new HttpError(400, "Minimum payout is RWF 1,000. Keep selling!");
      }

      const commission = Math.floor(grossAmount * COMMISSION_RATE);
      const netAmount = grossAmount - commission;

      const payout = await Payout.create({
        sellerId: seller._id,
        amount: netAmount,
        grossAmount,
        commission,
        commissionRate: COMMISSION_RATE,
        status: "pending",
        momoPhone,
        periodStart: sincDate,
        periodEnd: new Date(),
      });

      res.status(201).json({
        payout,
        message: "Payout request submitted. Admin will process within 1 business day.",
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── Admin: list all payouts ───────────────────────────────────────────────────
payoutRouter.get("/admin", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const payouts = await Payout.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sellerId", "storeName")
      .lean();
    res.json({ payouts });
  } catch (e) {
    next(e);
  }
});

// ── Admin: trigger payout disbursement ───────────────────────────────────────
const disburseSchema = z.object({
  momoRef: z.string().min(1, "MoMo reference required"),
  note: z.string().max(500).optional(),
});

payoutRouter.patch(
  "/admin/:id/disburse",
  requireAuth,
  requireRole("admin"),
  validate(disburseSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { momoRef, note } = req.body as z.infer<typeof disburseSchema>;
      const payout = await Payout.findById(req.params.id).populate<{
        sellerId: { _id: string; storeName: string; userId: { email?: string } };
      }>("sellerId");
      if (!payout) throw new HttpError(404, "Payout not found.");
      if (payout.status === "sent") throw new HttpError(400, "Already disbursed.");

      payout.status = "sent";
      payout.momoRef = momoRef;
      payout.note = note;
      payout.initiatedBy = new mongoose.Types.ObjectId(
        req.user!.id,
      ) as unknown as typeof payout.initiatedBy;
      await payout.save();

      // Notify seller via email
      const sellerDoc = await Seller.findById(String((payout.sellerId as { _id: string })._id));
      if (sellerDoc) {
        const sellerUser = await User.findById(sellerDoc.userId).lean();
        if (sellerUser?.email) {
          sendPayoutNotificationEmail(
            sellerUser.email,
            (payout.sellerId as { storeName: string }).storeName ?? "your store",
            payout.amount,
            momoRef,
          ).catch((e) => console.error("[email] payout notification failed", e));
        }
      }

      res.json({
        payout: await Payout.findById(payout._id).populate("sellerId", "storeName").lean(),
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── Admin: reject / fail a payout ────────────────────────────────────────────
payoutRouter.patch(
  "/admin/:id/fail",
  requireAuth,
  requireRole("admin"),
  async (req: AuthedRequest, res, next) => {
    try {
      const { note } = req.body as { note?: string };
      const payout = await Payout.findByIdAndUpdate(
        req.params.id,
        { status: "failed", note },
        { new: true },
      );
      if (!payout) throw new HttpError(404, "Payout not found.");
      res.json({ payout });
    } catch (e) {
      next(e);
    }
  },
);
