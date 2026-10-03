/**
 * Referral programme.
 *
 *  - Every user has a unique `referralCode`.
 *  - A new user can sign up with someone's code → a `pending` Referral is created.
 *  - When that friend's first qualifying order is DELIVERED (not merely placed),
 *    both people get loyalty points — exactly once.
 *
 * Rewarding on delivery rather than sign-up is deliberate: fake accounts that
 * never buy anything earn nothing, and cancelled/refunded orders never pay out.
 */
import type { ClientSession } from "mongoose";
import { nanoid } from "nanoid";
import { BUSINESS } from "../config/business.js";
import { LoyaltyEvent } from "../models/LoyaltyEvent.js";
import { Notification } from "../models/Notification.js";
import { Referral } from "../models/Referral.js";
import { User } from "../models/User.js";

const CODE_SHAPE = /^[A-Z0-9_-]{4,20}$/;

export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return CODE_SHAPE.test(code) ? code : null;
}

export async function generateReferralCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = nanoid(8).toUpperCase();
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  return nanoid(12).toUpperCase();
}

export interface ReferrerLookup {
  id: string;
  firstName: string;
}

/** Finds who owns a code. Returns null for unknown / unusable codes. */
export async function findReferrerByCode(rawCode: unknown): Promise<ReferrerLookup | null> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;
  const referrer = await User.findOne({ referralCode: code, deletedAt: { $exists: false } })
    .select("profile.name flaggedForReview")
    .lean();
  if (!referrer || referrer.flaggedForReview) return null;
  const name = referrer.profile?.name?.trim() ?? "";
  return { id: String(referrer._id), firstName: name.split(/\s+/)[0] || "A friend" };
}

/**
 * Links a freshly-created user to the person who invited them.
 * Never throws — a bad code must not break sign-up. Returns whether it attached.
 */
export async function attachReferral(newUserId: string, rawCode: unknown): Promise<boolean> {
  try {
    const code = normalizeReferralCode(rawCode);
    if (!code) return false;
    const referrer = await findReferrerByCode(code);
    if (!referrer || referrer.id === newUserId) return false;

    await Referral.create({ referrerId: referrer.id, refereeId: newUserId, code });
    await User.updateOne(
      { _id: newUserId, referredBy: { $exists: false } },
      { $set: { referredBy: referrer.id } },
    );
    return true;
  } catch (e) {
    // Duplicate (already referred) or any other failure: sign-up proceeds without a referral.
    console.warn("[referral] could not attach referral", e);
    return false;
  }
}

/**
 * Called inside the delivery transaction. If this order is the friend's first
 * qualifying purchase, pays out both bonuses — at most once per referral.
 */
export async function rewardReferralOnDelivery(
  order: { _id: unknown; orderNumber: string; buyerId: unknown },
  merchandisePaid: number,
  session: ClientSession,
): Promise<{ rewarded: boolean; reason?: string }> {
  const referral = await Referral.findOne({ refereeId: order.buyerId, status: "pending" }).session(
    session,
  );
  if (!referral) return { rewarded: false, reason: "no_pending_referral" };

  const cfg = BUSINESS.REFERRAL;
  if (merchandisePaid < cfg.MIN_QUALIFYING_ORDER_RWF) {
    return { rewarded: false, reason: "below_minimum_order" };
  }

  const referrer = await User.findById(referral.referrerId)
    .session(session)
    .select("flaggedForReview deletedAt");
  if (!referrer || referrer.flaggedForReview || referrer.deletedAt) {
    referral.status = "rejected";
    referral.rejectReason = "referrer_unavailable";
    await referral.save({ session });
    return { rewarded: false, reason: "referrer_unavailable" };
  }

  const alreadyRewarded = await Referral.countDocuments({
    referrerId: referral.referrerId,
    status: "rewarded",
  }).session(session);
  if (alreadyRewarded >= cfg.MAX_REWARDED_PER_REFERRER) {
    referral.status = "rejected";
    referral.rejectReason = "referrer_cap_reached";
    await referral.save({ session });
    return { rewarded: false, reason: "referrer_cap_reached" };
  }

  // Atomic pending → rewarded flip: if two deliveries race, only one wins.
  const claimed = await Referral.findOneAndUpdate(
    { _id: referral._id, status: "pending" },
    {
      $set: {
        status: "rewarded",
        qualifyingOrderId: order._id,
        referrerPoints: cfg.REFERRER_BONUS_POINTS,
        refereePoints: cfg.REFEREE_BONUS_POINTS,
        rewardedAt: new Date(),
      },
    },
    { session, new: true },
  );
  if (!claimed) return { rewarded: false, reason: "already_rewarded" };

  const grants: Array<{
    userId: unknown;
    points: number;
    description: string;
    title: string;
    body: string;
  }> = [
    {
      userId: referral.referrerId,
      points: cfg.REFERRER_BONUS_POINTS,
      description: `Referral bonus — your friend's first order ${order.orderNumber} was delivered`,
      title: "Referral reward earned 🎉",
      body: `Your friend's first order was delivered — you earned ${cfg.REFERRER_BONUS_POINTS} loyalty points.`,
    },
    {
      userId: referral.refereeId,
      points: cfg.REFEREE_BONUS_POINTS,
      description: "Welcome bonus for joining with a friend's referral code",
      title: "Welcome bonus unlocked 🎁",
      body: `Thanks for joining with a friend's code — you earned ${cfg.REFEREE_BONUS_POINTS} loyalty points.`,
    },
  ];

  for (const g of grants) {
    if (g.points <= 0) continue;
    await User.updateOne({ _id: g.userId }, { $inc: { loyaltyPoints: g.points } }, { session });
    await LoyaltyEvent.create(
      [
        {
          userId: g.userId,
          points: g.points,
          type: "referral",
          description: g.description,
          relatedId: order._id,
        },
      ],
      { session },
    );
    await Notification.create(
      [
        {
          userId: g.userId,
          type: "referral_reward",
          title: g.title,
          body: g.body,
          link: "/loyalty",
          metadata: { orderId: String(order._id), points: g.points },
        },
      ],
      { session },
    );
  }

  return { rewarded: true };
}

export async function getReferralSummary(userId: string) {
  const [referrals, rewardedCount] = await Promise.all([
    Referral.find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate<{ refereeId: { profile?: { name?: string } } }>("refereeId", "profile.name")
      .lean(),
    Referral.countDocuments({ referrerId: userId, status: "rewarded" }),
  ]);

  const pointsEarned = referrals.reduce(
    (s, r) => s + (r.status === "rewarded" ? r.referrerPoints : 0),
    0,
  );
  return {
    stats: {
      invited: referrals.length,
      rewarded: rewardedCount,
      pending: referrals.filter((r) => r.status === "pending").length,
      pointsEarned,
    },
    rules: {
      referrerBonusPoints: BUSINESS.REFERRAL.REFERRER_BONUS_POINTS,
      refereeBonusPoints: BUSINESS.REFERRAL.REFEREE_BONUS_POINTS,
      minQualifyingOrder: BUSINESS.REFERRAL.MIN_QUALIFYING_ORDER_RWF,
      maxRewards: BUSINESS.REFERRAL.MAX_REWARDED_PER_REFERRER,
    },
    referrals: referrals.map((r) => {
      const name = r.refereeId?.profile?.name?.trim() ?? "";
      // Privacy: only show a first name + initial of the friend.
      const parts = name.split(/\s+/).filter(Boolean);
      const display = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || "New member";
      return {
        id: String(r._id),
        friend: display,
        status: r.status,
        joinedAt: r.createdAt,
        rewardedAt: r.rewardedAt,
        pointsEarned: r.status === "rewarded" ? r.referrerPoints : 0,
      };
    }),
  };
}
