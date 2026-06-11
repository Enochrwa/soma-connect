import { Router } from "express";
import { Notification } from "../models/Notification.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const notificationRouter = Router();

notificationRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unreadCount = await Notification.countDocuments({
      userId: req.user!.id,
      isRead: false,
    });
    res.json({ notifications, unreadCount });
  } catch (e) {
    next(e);
  }
});

notificationRouter.patch("/:id/read", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { isRead: true },
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

notificationRouter.patch("/read-all", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
