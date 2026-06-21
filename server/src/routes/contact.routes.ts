/**
 * contact.routes.ts
 *
 * Public endpoint — no auth required.
 * POST /api/contact  →  sends an email to the SOMA support inbox
 *                        and an auto-reply to the sender.
 *
 * Rate-limited at the app level (rateLimiter middleware).
 */

import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { sendMail } from "../services/email.service.js";
import { env } from "../config/env.js";

export const contactRouter = Router();

// ── Validation schema ────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(80, "Name is too long."),
  email: z.string().email("Please enter a valid email address."),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters.")
    .max(120, "Subject is too long."),
  category: z.enum(
    ["general", "order_support", "seller_support", "technical", "partnership", "press"],
    { errorMap: () => ({ message: "Please select a valid category." }) },
  ),
  message: z
    .string()
    .min(20, "Please describe your issue in at least 20 characters.")
    .max(3000, "Message is too long (max 3000 characters)."),
  orderId: z.string().max(60).optional(),
});

type ContactPayload = z.infer<typeof contactSchema>;

// ── Email helpers ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ContactPayload["category"], string> = {
  general: "General Enquiry",
  order_support: "Order Support",
  seller_support: "Seller Support",
  technical: "Technical Issue",
  partnership: "Partnership",
  press: "Press & Media",
};

const SUPPORT_INBOX = env.SUPPORT_EMAIL;

/** Email sent to the SOMA support inbox */
function buildSupportEmail(p: ContactPayload) {
  const categoryLabel = CATEGORY_LABELS[p.category];
  const orderRow = p.orderId
    ? `<tr><td style="padding:6px 0;color:#666;width:140px">Order ID</td><td style="padding:6px 0;font-family:monospace">${p.orderId}</td></tr>`
    : "";

  return {
    to: SUPPORT_INBOX,
    subject: `[Contact: ${categoryLabel}] ${p.subject}`,
    text: `From: ${p.name} <${p.email}>\nCategory: ${categoryLabel}\n${p.orderId ? `Order ID: ${p.orderId}\n` : ""}Subject: ${p.subject}\n\n${p.message}`,
    html: `
<div style="font-family:DM Sans,Arial,sans-serif;max-width:640px;margin:0 auto;background:#FAF7F2;color:#1C1C1E;border-radius:12px;overflow:hidden">
  <div style="background:#0A2E1F;padding:20px 24px">
    <h1 style="color:#F5A623;margin:0;font-size:20px">SOMA Market — New Contact Submission</h1>
    <p style="color:#a8c5b5;margin:4px 0 0;font-size:13px">Received ${new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali" })} (Kigali)</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#fff;border-radius:8px;padding:16px;display:table">
      <tr><td style="padding:6px 0;color:#666;width:140px">Name</td><td style="padding:6px 0;font-weight:600">${p.name}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${p.email}" style="color:#0A2E1F">${p.email}</a></td></tr>
      <tr><td style="padding:6px 0;color:#666">Category</td><td style="padding:6px 0"><span style="background:#E8F5EE;color:#0A2E1F;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">${categoryLabel}</span></td></tr>
      <tr><td style="padding:6px 0;color:#666">Subject</td><td style="padding:6px 0;font-weight:600">${p.subject}</td></tr>
      ${orderRow}
    </table>
    <div style="background:#fff;border-radius:8px;padding:16px;border-left:4px solid #F5A623">
      <p style="margin:0 0 6px;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:.5px">Message</p>
      <p style="margin:0;white-space:pre-wrap;line-height:1.7">${p.message}</p>
    </div>
    <p style="margin-top:20px;font-size:12px;color:#999">
      Reply directly to this email to respond to the customer — your reply will go to <strong>${p.email}</strong>.
    </p>
  </div>
  <div style="padding:12px 24px;background:#e8e0d4;font-size:11px;color:#888;text-align:center">
    © SOMA Market · Kigali, Rwanda
  </div>
</div>`,
  };
}

/** Auto-reply to the person who submitted the form */
function buildAutoReply(p: ContactPayload) {
  const categoryLabel = CATEGORY_LABELS[p.category];
  const slaMap: Record<ContactPayload["category"], string> = {
    general: "2 business days",
    order_support: "24 hours",
    seller_support: "24 hours",
    technical: "1 business day",
    partnership: "3 business days",
    press: "3 business days",
  };
  const sla = slaMap[p.category];

  return {
    to: p.email,
    subject: `We received your message — SOMA Market`,
    text: `Hi ${p.name},\n\nThank you for reaching out! We've received your message about "${p.subject}" and will respond within ${sla}.\n\nYour reference category: ${categoryLabel}\n\nIf this is urgent, you can also call us at +250 792 696 038 (Mon–Fri, 8am–6pm Kigali time).\n\nMurakoze,\nThe SOMA Market Team`,
    html: `
<div style="font-family:DM Sans,Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF7F2;color:#1C1C1E;border-radius:12px;overflow:hidden">
  <div style="background:#0A2E1F;padding:20px 24px">
    <h1 style="color:#F5A623;margin:0;font-size:22px">SOMA Market</h1>
    <p style="color:#a8c5b5;margin:4px 0 0;font-size:13px">Rwanda's marketplace</p>
  </div>
  <div style="padding:24px">
    <h2 style="color:#0A2E1F;margin:0 0 12px">We've received your message! 🙏</h2>
    <p>Hi <strong>${p.name}</strong>,</p>
    <p>Thank you for contacting SOMA Market. We've received your message and a member of our team will respond within <strong>${sla}</strong>.</p>
    <div style="background:#fff;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #e5e5e5">
      <p style="margin:0 0 8px;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:.5px">Your message summary</p>
      <p style="margin:0 0 4px"><strong>Subject:</strong> ${p.subject}</p>
      <p style="margin:0"><strong>Category:</strong> <span style="background:#E8F5EE;color:#0A2E1F;padding:2px 8px;border-radius:20px;font-size:12px">${categoryLabel}</span></p>
    </div>
    <p>In the meantime, you may find answers in our <a href="${env.CLIENT_URL}/terms" style="color:#0A2E1F;font-weight:600">Help Centre</a> or track your orders at <a href="${env.CLIENT_URL}/orders" style="color:#0A2E1F;font-weight:600">My Orders</a>.</p>
    <p style="margin-bottom:4px">For urgent matters, reach us directly:</p>
    <ul style="color:#444;padding-left:20px;line-height:2">
      <li>📞 <a href="tel:+250792696038" style="color:#0A2E1F">+250 792 696 038</a> (Mon–Fri, 8am–6pm)</li>
      <li>✉️ <a href="mailto:support@soma.rw" style="color:#0A2E1F">support@soma.rw</a></li>
    </ul>
    <p style="margin-top:24px">Murakoze,<br/><strong>The SOMA Market Team</strong></p>
  </div>
  <div style="padding:12px 24px;background:#e8e0d4;font-size:11px;color:#888;text-align:center">
    © ${new Date().getFullYear()} SOMA Market · Kigali, Rwanda · <a href="${env.CLIENT_URL}/privacy" style="color:#888">Privacy Policy</a>
  </div>
</div>`,
  };
}

// ── Route ────────────────────────────────────────────────────────────────────

contactRouter.post("/", validate(contactSchema), async (req, res, next) => {
  try {
    const payload = req.body as ContactPayload;

    // Fire both emails concurrently; don't let a failure on one block the other
    const [supportResult, autoReplyResult] = await Promise.allSettled([
      sendMail(buildSupportEmail(payload)),
      sendMail(buildAutoReply(payload)),
    ]);

    // Log any failures but still return success to the user so they know we got the message
    if (supportResult.status === "rejected") {
      console.error("[contact] Failed to send support email:", supportResult.reason);
    }
    if (autoReplyResult.status === "rejected") {
      console.error("[contact] Failed to send auto-reply:", autoReplyResult.reason);
    }

    res.json({
      ok: true,
      message: "Your message has been received. We'll be in touch soon — Murakoze!",
    });
  } catch (e) {
    next(e);
  }
});
