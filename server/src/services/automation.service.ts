/**
 * automation.service.ts
 *
 * All scheduled automations — cron jobs + Mongoose hooks.
 * Called once from index.ts: initAutomations()
 *
 * Jobs:
 *  1.  Low-stock email alerts          — daily 08:00
 *  2.  Seller payout auto-disbursement — weekly Monday 06:00
 *  3.  Order auto-cancel on timeout    — every 15 min
 *  4.  Loyalty tier auto-upgrade       — nightly 02:00
 *  6.  Stale product auto-deactivation — nightly 03:00
 *  7.  Seller onboarding drip emails   — daily 09:00
 *  8.  Coupon expiry notifications     — daily 10:00
 *  9.  Admin fraud signal detection    — nightly 04:00
 * 10.  Seller weekly analytics digest  — Monday 07:00
 */

import cron from "node-cron";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Seller } from "../models/Seller.js";
import { Payout } from "../models/Payout.js";
import { Coupon } from "../models/Coupon.js";
import { Notification } from "../models/Notification.js";
import { Review } from "../models/Review.js";
import { initiateMobileMoneyPush } from "./payment.mock.js";
import { sendMail, sendPayoutNotificationEmail } from "./email.service.js";
import { env } from "../config/env.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create in-app notification
// ─────────────────────────────────────────────────────────────────────────────
async function notify(userId: string, title: string, body: string, link?: string) {
  try {
    await Notification.create({ userId, type: "system", title, body, link });
  } catch (e) {
    console.error("[automation] notification create failed", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email templates for automation
// ─────────────────────────────────────────────────────────────────────────────
const btnStyle =
  "display:inline-block;background:#F5A623;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px";
const baseStyle =
  "font-family:DM Sans,Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF7F2;color:#1C1C1E;border-radius:12px;overflow:hidden";

function wrap(content: string) {
  return `<div style="${baseStyle}"><div style="background:#0A2E1F;padding:20px 24px"><h1 style="color:#F5A623;margin:0;font-size:22px">SOMA Market</h1></div><div style="padding:24px">${content}</div><div style="padding:16px 24px;background:#e8e0d4;font-size:11px;color:#888;text-align:center">© SOMA Market · Kigali, Rwanda</div></div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Low-stock email alerts
// ─────────────────────────────────────────────────────────────────────────────
async function runLowStockAlerts() {
  console.log("[automation] running low-stock alerts");
  const LOW_STOCK_THRESHOLD = 5;

  const sellers = await Seller.find({ isActive: true, approvalStatus: "approved" }).lean();

  for (const seller of sellers) {
    try {
      const lowStockProducts = await Product.find({
        sellerId: seller._id,
        isActive: true,
        stock: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 },
      })
        .select("title stock")
        .lean();

      const outOfStockProducts = await Product.find({
        sellerId: seller._id,
        isActive: true,
        stock: 0,
      })
        .select("title")
        .lean();

      if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) continue;

      const user = await User.findById(seller.userId).lean();
      if (!user?.email) continue;

      const lowRows = lowStockProducts
        .map(
          (p) =>
            `<tr><td style="padding:6px 8px">${p.title}</td><td style="padding:6px 8px;color:#F5A623;font-weight:600">${p.stock} left</td></tr>`,
        )
        .join("");

      const outRows = outOfStockProducts
        .map(
          (p) =>
            `<tr><td style="padding:6px 8px">${p.title}</td><td style="padding:6px 8px;color:#e55;font-weight:600">Out of stock</td></tr>`,
        )
        .join("");

      await sendMail({
        to: user.email,
        subject: `⚠️ Stock alert — ${lowStockProducts.length + outOfStockProducts.length} product(s) need restocking`,
        text: `You have ${lowStockProducts.length} low-stock and ${outOfStockProducts.length} out-of-stock products in your SOMA store.`,
        html: wrap(`
          <h2 style="color:#0A2E1F;margin:0 0 8px">Stock Alert 📦</h2>
          <p>Hi ${seller.storeName}, here are products that need your attention:</p>
          ${
            lowRows
              ? `<table style="width:100%;border-collapse:collapse;margin:12px 0">
              <thead><tr style="border-bottom:1px solid #ddd"><th style="text-align:left;padding:6px 8px">Product</th><th style="text-align:left;padding:6px 8px">Stock</th></tr></thead>
              <tbody>${lowRows}${outRows}</tbody></table>`
              : ""
          }
          <a href="${env.CLIENT_URL}/seller/products" style="${btnStyle}">Restock Products →</a>
        `),
      });
    } catch (e) {
      console.error("[automation] low-stock alert failed for seller", seller._id, e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Seller payout auto-disbursement (weekly)
// ─────────────────────────────────────────────────────────────────────────────
async function runPayoutDisbursement() {
  console.log("[automation] running payout disbursement");
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const pending = await Payout.find({
    status: "pending",
    createdAt: { $lte: sevenDaysAgo },
  }).lean();

  for (const payout of pending) {
    try {
      await Payout.findByIdAndUpdate(payout._id, { status: "processing" });

      // Simulate MoMo call for auto-disbursement
      const momoRef = `AUTO-${String(payout._id).slice(-8)}-${Date.now()}`;
      let momoSuccess = true;
      try {
        await initiateMobileMoneyPush({
          orderId: String(payout._id),
          userId: String(payout.sellerId),
          amount: payout.amount,
          method: "mtn_momo",
          phone: payout.momoPhone ?? "0780000000",
        });
      } catch {
        momoSuccess = false;
      }

      await Payout.findByIdAndUpdate(payout._id, {
        status: momoSuccess ? "sent" : "failed",
        momoRef,
      });

      if (momoSuccess) {
        const seller = await Seller.findById(payout.sellerId).lean();
        const user = seller ? await User.findById(seller.userId).lean() : null;
        if (user?.email && seller) {
          await sendPayoutNotificationEmail(user.email, seller.storeName, payout.amount, momoRef);
        }
      }
    } catch (e) {
      console.error("[automation] payout disbursement failed", payout._id, e);
    }
  }
  console.log(`[automation] disbursed ${pending.length} payouts`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Order auto-cancel on payment timeout (every 15 min)
// ─────────────────────────────────────────────────────────────────────────────
async function runOrderAutoCancelTimeout() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const staleOrders = await Order.find({
    status: "placed",
    paymentStatus: "pending",
    createdAt: { $lte: twoHoursAgo },
  }).lean();

  for (const order of staleOrders) {
    try {
      // Restore stock for each item
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity },
        });
      }

      await Order.findByIdAndUpdate(order._id, {
        status: "cancelled",
        $push: {
          statusHistory: {
            status: "cancelled",
            note: "Auto-cancelled: payment not received within 2 hours",
            at: new Date(),
          },
        },
      });

      console.log(`[automation] auto-cancelled order ${order.orderNumber}`);
    } catch (e) {
      console.error("[automation] auto-cancel failed for order", order._id, e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Loyalty tier auto-upgrade (nightly)
// ─────────────────────────────────────────────────────────────────────────────
async function runLoyaltyTierUpgrade() {
  console.log("[automation] running loyalty tier upgrades");

  const tiers: Array<{ min: number; tier: string; label: string }> = [
    { min: 10000, tier: "vip", label: "VIP" },
    { min: 2000, tier: "trusted", label: "Trusted" },
    { min: 500, tier: "regular", label: "Regular" },
  ];

  for (const { min, tier, label } of tiers) {
    const users = await User.find({
      loyaltyPoints: { $gte: min },
      tier: { $nin: [tier, "vip"] }, // Don't downgrade
    }).lean();

    for (const user of users) {
      const currentTierOrder = ["starter", "regular", "trusted", "vip"].indexOf(
        user.tier as string,
      );
      const newTierOrder = ["starter", "regular", "trusted", "vip"].indexOf(tier);
      if (newTierOrder <= currentTierOrder) continue; // Don't downgrade

      await User.findByIdAndUpdate(user._id, { tier });

      // Send congratulatory email
      if (user.email) {
        await sendMail({
          to: user.email,
          subject: `🎉 Congratulations! You've reached ${label} tier on SOMA Market`,
          text: `You've reached ${label} tier! You now have ${user.loyaltyPoints.toLocaleString()} loyalty points.`,
          html: wrap(`
            <h2 style="color:#0A2E1F">You've levelled up! 🎉</h2>
            <p>Congratulations! With <strong>${user.loyaltyPoints.toLocaleString()} loyalty points</strong>, you've reached the <strong style="color:#F5A623">${label}</strong> tier.</p>
            <p>Enjoy exclusive benefits including priority support and special discounts!</p>
            <a href="${env.CLIENT_URL}/profile/loyalty" style="${btnStyle}">View Your Rewards →</a>
          `),
        }).catch(() => {
          /* non-blocking */
        });
      }

      console.log(`[automation] upgraded user ${String(user._id)} to ${tier}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Stale product auto-deactivation (nightly)
// ─────────────────────────────────────────────────────────────────────────────
async function runStaleProductDeactivation() {
  console.log("[automation] running stale product deactivation");
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const staleProducts = await Product.find({
    isActive: true,
    stock: 0,
    updatedAt: { $lte: thirtyDaysAgo },
  }).lean();

  for (const product of staleProducts) {
    try {
      await Product.findByIdAndUpdate(product._id, { isActive: false });

      const seller = await Seller.findById(product.sellerId).lean();
      if (seller) {
        await notify(
          String(seller.userId),
          "Product paused — out of stock",
          `"${product.title}" has been paused after 30 days with zero stock. Restock to reactivate.`,
          `${env.CLIENT_URL}/seller/products/${String(product._id)}`,
        );

        const user = await User.findById(seller.userId).lean();
        if (user?.email) {
          await sendMail({
            to: user.email,
            subject: `🔴 Listing paused: "${product.title}"`,
            text: `Your product "${product.title}" has been paused after 30 days out of stock. Log in and restock to reactivate it.`,
            html: wrap(`
              <h2 style="color:#0A2E1F">Listing paused</h2>
              <p>Your product <strong>"${product.title}"</strong> has been automatically paused because it's been out of stock for 30+ days.</p>
              <p>Restock it to make it visible to buyers again.</p>
              <a href="${env.CLIENT_URL}/seller/products" style="${btnStyle}">Restock Now →</a>
            `),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("[automation] stale product deactivation failed", product._id, e);
    }
  }
  console.log(`[automation] deactivated ${staleProducts.length} stale products`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Seller onboarding drip emails
// ─────────────────────────────────────────────────────────────────────────────
async function runSellerOnboardingDrip() {
  const now = new Date();

  // Day 1 drip: approved yesterday
  const day1Start = new Date(now);
  day1Start.setDate(day1Start.getDate() - 1);
  day1Start.setHours(0, 0, 0, 0);
  const day1End = new Date(day1Start);
  day1End.setHours(23, 59, 59, 999);

  // Day 3 drip: approved 3 days ago
  const day3Start = new Date(now);
  day3Start.setDate(day3Start.getDate() - 3);
  day3Start.setHours(0, 0, 0, 0);
  const day3End = new Date(day3Start);
  day3End.setHours(23, 59, 59, 999);

  // Day 1: How to add products
  const day1Sellers = await Seller.find({
    approvalStatus: "approved",
    updatedAt: { $gte: day1Start, $lte: day1End },
  }).lean();

  for (const seller of day1Sellers) {
    const user = await User.findById(seller.userId).lean();
    if (!user?.email) continue;
    await sendMail({
      to: user.email,
      subject: `📦 Day 1 tip: Add your first product on SOMA Market`,
      text: `Welcome to SOMA! Here's how to list your first product and start selling.`,
      html: wrap(`
        <h2 style="color:#0A2E1F">Ready to make your first sale? 🛍️</h2>
        <p>Hi ${seller.storeName}! Your store is live. Here's how to get your first product listed:</p>
        <ol style="color:#444;line-height:1.8">
          <li>Go to your <strong>Seller Dashboard</strong></li>
          <li>Click <strong>Add Product</strong> or use <strong>Bulk Import</strong> for multiple items</li>
          <li>Fill in title, price, images and stock</li>
          <li>Let our AI auto-generate descriptions and tags for you!</li>
        </ol>
        <a href="${env.CLIENT_URL}/seller/products/new" style="${btnStyle}">Add First Product →</a>
      `),
    }).catch(() => {});
  }

  // Day 3: Tips for first sale
  const day3Sellers = await Seller.find({
    approvalStatus: "approved",
    updatedAt: { $gte: day3Start, $lte: day3End },
  }).lean();

  for (const seller of day3Sellers) {
    const productCount = await Product.countDocuments({ sellerId: seller._id, isActive: true });
    const user = await User.findById(seller.userId).lean();
    if (!user?.email) continue;
    await sendMail({
      to: user.email,
      subject: `💡 Tips for your first sale — ${seller.storeName}`,
      text: `Here are tips to help you get your first sale on SOMA Market.`,
      html: wrap(`
        <h2 style="color:#0A2E1F">Tips for your first sale 💡</h2>
        <p>Hi ${seller.storeName}! ${productCount > 0 ? `Great — you've already listed ${productCount} product(s)!` : "It looks like you haven't listed any products yet. Here's a nudge!"}</p>
        <ul style="color:#444;line-height:1.8">
          <li>✅ Use <strong>clear, bright photos</strong> — listings with 3+ images get 2x more views</li>
          <li>✅ Set a <strong>competitive price</strong> using the "Compare Price" field to show discounts</li>
          <li>✅ Share your store link on <strong>WhatsApp and social media</strong></li>
          <li>✅ Respond to orders within <strong>2 hours</strong> for higher ratings</li>
        </ul>
        <a href="${env.CLIENT_URL}/seller" style="${btnStyle}">Go to Dashboard →</a>
      `),
    }).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Coupon expiry notifications (daily)
// ─────────────────────────────────────────────────────────────────────────────
async function runCouponExpiryNotifications() {
  console.log("[automation] running coupon expiry notifications");
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const now = new Date();

  const expiringSoon = await Coupon.find({
    isActive: true,
    expiresAt: { $gte: now, $lte: in48h },
  }).lean();

  for (const coupon of expiringSoon) {
    const userIds = coupon.usedBy ?? [];
    for (const userId of userIds) {
      const user = await User.findById(userId).lean();
      if (!user?.email) continue;
      await sendMail({
        to: user.email,
        subject: `⏰ Your coupon ${coupon.code} expires in 48 hours!`,
        text: `Don't miss it! Your coupon code ${coupon.code} expires soon. Use it on your next SOMA Market order.`,
        html: wrap(`
          <h2 style="color:#0A2E1F">Your coupon expires soon! ⏰</h2>
          <p>Use coupon code <strong style="font-family:monospace;font-size:20px;color:#F5A623;background:#fff;padding:4px 8px;border-radius:4px">${coupon.code}</strong> before it expires.</p>
          <table style="width:100%;margin:12px 0"><tr><td style="color:#666">Discount</td><td style="font-weight:600">${coupon.type === "percentage" ? `${coupon.value}% off` : `RWF ${coupon.value.toLocaleString()} off`}</td></tr><tr><td style="color:#666">Expires</td><td style="font-weight:600;color:#e55">${coupon.expiresAt.toLocaleDateString("en-RW")}</td></tr></table>
          <a href="${env.CLIENT_URL}/shop" style="${btnStyle}">Shop Now →</a>
        `),
      }).catch(() => {});
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Admin fraud signal detection (nightly)
// ─────────────────────────────────────────────────────────────────────────────
async function runFraudSignalDetection() {
  console.log("[automation] running fraud signal detection");
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Rule 1: 3+ orders in 1 hour from same buyer
  const rapidOrders = await Order.aggregate([
    { $match: { createdAt: { $gte: oneHourAgo } } },
    { $group: { _id: "$buyerId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 3 } } },
  ]);

  for (const entry of rapidOrders) {
    await User.findByIdAndUpdate(entry._id, { flaggedForReview: true });
    console.log(`[fraud] flagged user ${String(entry._id)} — rapid orders`);
  }

  // Rule 2: 5+ disputes opened in 30 days
  const disputeHeavy = await (
    await import("../models/Dispute.js")
  ).Dispute.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: "$buyerId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 5 } } },
  ]);

  for (const entry of disputeHeavy) {
    await User.findByIdAndUpdate(entry._id, { flaggedForReview: true });
    console.log(`[fraud] flagged user ${String(entry._id)} — excessive disputes`);
  }

  // Rule 3: Loyalty points jumped > 10,000 in a day
  // We check users whose loyaltyPoints > 10,000 and were updated recently
  const pointsJumpers = await (
    await import("../models/LoyaltyEvent.js")
  ).LoyaltyEvent.aggregate([
    { $match: { createdAt: { $gte: oneDayAgo } } },
    { $group: { _id: "$userId", total: { $sum: "$points" } } },
    { $match: { total: { $gt: 10000 } } },
  ]);

  for (const entry of pointsJumpers) {
    await User.findByIdAndUpdate(entry._id, { flaggedForReview: true });
    console.log(`[fraud] flagged user ${String(entry._id)} — loyalty point spike`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Seller weekly analytics digest (Monday)
// ─────────────────────────────────────────────────────────────────────────────
async function runWeeklyAnalyticsDigest() {
  console.log("[automation] running weekly analytics digest");
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const sellers = await Seller.find({ isActive: true, approvalStatus: "approved" }).lean();

  for (const seller of sellers) {
    try {
      const user = await User.findById(seller.userId).lean();
      if (!user?.email) continue;

      // Aggregate last week's orders
      const weekOrders = await Order.find({
        sellerIds: seller._id,
        createdAt: { $gte: weekAgo },
        status: { $nin: ["cancelled"] },
      }).lean();

      if (weekOrders.length === 0) continue;

      const revenue = weekOrders.reduce((sum, o) => {
        const sellerItems = o.items.filter((i) => String(i.sellerId) === String(seller._id));
        return sum + sellerItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      }, 0);

      // Find best-selling product
      const productSales: Record<string, { title: string; qty: number }> = {};
      for (const order of weekOrders) {
        for (const item of order.items) {
          if (String(item.sellerId) !== String(seller._id)) continue;
          const pid = String(item.productId);
          if (!productSales[pid]) productSales[pid] = { title: item.title ?? "Unknown", qty: 0 };
          productSales[pid].qty += item.quantity;
        }
      }
      const bestSeller = Object.values(productSales).sort((a, b) => b.qty - a.qty)[0];

      // Active products + avg rating
      const activeProducts = await Product.countDocuments({
        sellerId: seller._id,
        isActive: true,
      });

      // Recent reviews
      const recentReviews = await Review.find({
        createdAt: { $gte: weekAgo },
      })
        .where("productId")
        .in(await Product.find({ sellerId: seller._id }).distinct("_id"))
        .select("rating")
        .lean();

      const avgRating =
        recentReviews.length > 0
          ? (recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1)
          : "No reviews";

      await sendMail({
        to: user.email,
        subject: `📊 Your SOMA week in review — ${seller.storeName}`,
        text: `Last week: ${weekOrders.length} orders, RWF ${revenue.toLocaleString()} revenue. Best seller: ${bestSeller?.title ?? "N/A"}.`,
        html: wrap(`
          <h2 style="color:#0A2E1F">Your Week in Review 📊</h2>
          <p>Hi ${seller.storeName}, here's how you did last week:</p>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;background:#fff;border-radius:8px">
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:12px;color:#666">Total orders</td>
              <td style="padding:12px;font-weight:700;font-size:18px;color:#0A2E1F">${weekOrders.length}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:12px;color:#666">Revenue</td>
              <td style="padding:12px;font-weight:700;font-size:18px;color:#F5A623">RWF ${revenue.toLocaleString()}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:12px;color:#666">Active listings</td>
              <td style="padding:12px;font-weight:700">${activeProducts}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:12px;color:#666">Avg rating (week)</td>
              <td style="padding:12px;font-weight:700">${avgRating} ⭐</td>
            </tr>
            ${bestSeller ? `<tr><td style="padding:12px;color:#666">Best seller</td><td style="padding:12px;font-weight:700">${bestSeller.title} (${bestSeller.qty} sold)</td></tr>` : ""}
          </table>
          <a href="${env.CLIENT_URL}/seller/analytics" style="${btnStyle}">View Full Analytics →</a>
        `),
      }).catch(() => {});
    } catch (e) {
      console.error("[automation] weekly digest failed for seller", seller._id, e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap — register all cron jobs
// ─────────────────────────────────────────────────────────────────────────────
export function initAutomations() {
  // 1. Low-stock alerts — daily at 08:00
  cron.schedule("0 8 * * *", runLowStockAlerts, { timezone: "Africa/Kigali" });

  // 2. Payout auto-disbursement — every Monday at 06:00
  cron.schedule("0 6 * * 1", runPayoutDisbursement, { timezone: "Africa/Kigali" });

  // 3. Order auto-cancel — every 15 minutes
  cron.schedule("*/15 * * * *", runOrderAutoCancelTimeout);

  // 4. Loyalty tier upgrades — nightly at 02:00
  cron.schedule("0 2 * * *", runLoyaltyTierUpgrade, { timezone: "Africa/Kigali" });

  // 6. Stale product deactivation — nightly at 03:00
  cron.schedule("0 3 * * *", runStaleProductDeactivation, { timezone: "Africa/Kigali" });

  // 7. Seller onboarding drip — daily at 09:00
  cron.schedule("0 9 * * *", runSellerOnboardingDrip, { timezone: "Africa/Kigali" });

  // 8. Coupon expiry notifications — daily at 10:00
  cron.schedule("0 10 * * *", runCouponExpiryNotifications, { timezone: "Africa/Kigali" });

  // 9. Fraud signal detection — nightly at 04:00
  cron.schedule("0 4 * * *", runFraudSignalDetection, { timezone: "Africa/Kigali" });

  // 10. Weekly analytics digest — every Monday at 07:00
  cron.schedule("0 7 * * 1", runWeeklyAnalyticsDigest, { timezone: "Africa/Kigali" });

  console.log("[automation] ✅ All cron jobs registered");
}

// Export individual runners for testing / manual trigger
export {
  runLowStockAlerts,
  runPayoutDisbursement,
  runOrderAutoCancelTimeout,
  runLoyaltyTierUpgrade,
  runStaleProductDeactivation,
  runSellerOnboardingDrip,
  runCouponExpiryNotifications,
  runFraudSignalDetection,
  runWeeklyAnalyticsDigest,
};
