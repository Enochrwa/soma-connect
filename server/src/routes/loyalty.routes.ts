import { Router } from "express";
import { LoyaltyEvent } from "../models/LoyaltyEvent.js";
import { User } from "../models/User.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const loyaltyRouter = Router();

loyaltyRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const [user, events] = await Promise.all([
      User.findById(req.user!.id).lean(),
      LoyaltyEvent.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    res.json({
      points: user?.loyaltyPoints ?? 0,
      tier: user?.tier ?? "starter",
      events,
    });
  } catch (e) {
    next(e);
  }
});

loyaltyRouter.post("/daily-login", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await LoyaltyEvent.findOne({
      userId: req.user!.id,
      type: "daily_login",
      createdAt: { $gte: today },
    });
    if (existing) return res.json({ awarded: 0, message: "Already claimed today." });
    await LoyaltyEvent.create({
      userId: req.user!.id,
      points: 5,
      type: "daily_login",
      description: "Daily login streak",
    });
    await User.findByIdAndUpdate(req.user!.id, { $inc: { loyaltyPoints: 5 } });
    res.json({ awarded: 5 });
  } catch (e) {
    next(e);
  }
});
