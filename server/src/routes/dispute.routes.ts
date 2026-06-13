import { Router } from "express";
import { z } from "zod";
import { Dispute } from "../models/Dispute.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendDisputeNotificationEmail } from "../services/email.service.js";
import { classifyDispute } from "../services/ai.service.js";

export const disputeRouter = Router();

const createSchema = z.object({
  orderId: z.string(),
  reason: z.enum(["wrong_item", "damaged", "not_delivered", "quality_issue", "other"]),
  description: z.string().min(20).max(2000),
  evidenceImages: z.array(z.string().url()).max(5).optional(),
});

// Buyer: open a dispute
disputeRouter.post(
  "/",
  requireAuth,
  validate(createSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const order = await Order.findById(body.orderId);
      if (!order) throw new HttpError(404, "Order not found.");
      if (String(order.buyerId) !== req.user!.id) throw new HttpError(403, "Not your order.");
      if (!["delivered", "out_for_delivery"].includes(order.status)) {
        throw new HttpError(400, "Disputes can only be opened for delivered orders.");
      }
      const existing = await Dispute.findOne({ orderId: body.orderId, buyerId: req.user!.id });
      if (existing) throw new HttpError(409, "A dispute already exists for this order.");

      // ── 8. AI: auto-classify dispute reason + severity ───────────────────
      let aiReason = body.reason;
      let aiSeverity: "high" | "medium" | "low" = "medium";
      let aiClassified = false;
      if (body.reason === "other" || !body.reason) {
        try {
          const classification = await classifyDispute(body.description);
          aiReason = classification.reason;
          aiSeverity = classification.severity;
          aiClassified = true;
        } catch {
          /* fallback to user-provided */
        }
      }

      const dispute = await Dispute.create({
        ...body,
        reason: aiReason,
        severity: aiSeverity,
        aiClassified,
        buyerId: req.user!.id,
      });
      res.status(201).json({ dispute, aiClassified, aiReason });
    } catch (e) {
      next(e);
    }
  },
);

// Buyer: view my disputes
disputeRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const disputes = await Dispute.find({ buyerId: req.user!.id })
      .sort({ severity: -1, createdAt: -1 })
      .populate("orderId", "orderNumber status")
      .lean();
    res.json({ disputes });
  } catch (e) {
    next(e);
  }
});

// Admin: list all disputes
disputeRouter.get("/admin", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.query as { status?: string };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("buyerId", "profile phone email")
      .populate("orderId", "orderNumber total status")
      .lean();
    res.json({ disputes, total: disputes.length });
  } catch (e) {
    next(e);
  }
});

const resolveSchema = z.object({
  status: z.enum(["resolved_refund", "resolved_no_action", "closed", "under_review"]),
  adminNote: z.string().max(1000).optional(),
});

// Admin: resolve a dispute
disputeRouter.patch(
  "/admin/:id/resolve",
  requireAuth,
  requireRole("admin"),
  validate(resolveSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const { status, adminNote } = req.body as z.infer<typeof resolveSchema>;
      const dispute = await Dispute.findById(req.params.id).populate<{
        orderId: { orderNumber: string; buyerId: string };
      }>("orderId", "orderNumber buyerId");
      if (!dispute) throw new HttpError(404, "Dispute not found.");

      dispute.status = status as typeof dispute.status;
      dispute.adminNote = adminNote;
      if (["resolved_refund", "resolved_no_action", "closed"].includes(status)) {
        dispute.resolvedAt = new Date();
        dispute.resolvedBy = req.user!.id as unknown as typeof dispute.resolvedBy;
      }
      await dispute.save();

      // Notify buyer
      const buyerUser = await User.findById(dispute.buyerId).lean();
      if (buyerUser?.email) {
        const statusLabel: Record<string, string> = {
          resolved_refund: "Resolved — refund approved",
          resolved_no_action: "Resolved — no action",
          under_review: "Under review",
          closed: "Closed",
        };
        sendDisputeNotificationEmail(
          buyerUser.email,
          (dispute.orderId as unknown as { orderNumber: string }).orderNumber ?? "your order",
          statusLabel[status] ?? status,
        ).catch((e) => console.error("[email] dispute notification failed", e));
      }

      res.json({ dispute });
    } catch (e) {
      next(e);
    }
  },
);
