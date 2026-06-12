import nodemailer from "nodemailer";
import { env } from "../config/env.js";

/**
 * Transport setup.
 * Supports: Brevo (recommended, free tier), SendGrid, or any SMTP.
 *
 * For Brevo: set SMTP_HOST=smtp-relay.brevo.com SMTP_PORT=587
 *            SMTP_USER=<your-brevo-login-email>  SMTP_PASS=<brevo-smtp-key>
 *
 * For SendGrid: set SMTP_HOST=smtp.sendgrid.net  SMTP_PORT=587
 *               SMTP_USER=apikey  SMTP_PASS=<sendgrid-api-key>
 *
 * Without credentials the emails are logged to console (dev mode).
 */
const transporter =
  env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  if (!transporter) {
    console.log("[email:dev]", opts.to, opts.subject, "\n", opts.text ?? "(html)");
    return { mocked: true };
  }
  return transporter.sendMail({ from: env.SMTP_FROM, ...opts });
}

const baseStyle = `font-family:DM Sans,Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF7F2;color:#1C1C1E;border-radius:12px;overflow:hidden`;
const headerStyle = `background:#0A2E1F;padding:20px 24px`;
const bodyStyle = `padding:24px`;
const btnStyle = `display:inline-block;background:#F5A623;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px`;
const footerStyle = `padding:16px 24px;background:#e8e0d4;font-size:11px;color:#888;text-align:center`;

function emailWrapper(content: string, footer = "") {
  return `
<div style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="color:#F5A623;margin:0;font-size:22px">SOMA Market</h1>
    <p style="color:#a8c5b5;margin:4px 0 0;font-size:13px">Rwanda's marketplace</p>
  </div>
  <div style="${bodyStyle}">${content}</div>
  <div style="${footerStyle}">${footer || '© SOMA Market · Kigali, Rwanda · <a href="#" style="color:#888">Unsubscribe</a>'}</div>
</div>`;
}

export async function sendOtpEmail(to: string, code: string) {
  return sendMail({
    to,
    subject: "Your SOMA Market verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: emailWrapper(`
      <h2 style="color:#0A2E1F;margin:0 0 12px">Verify your identity</h2>
      <p>Use the code below to sign in or confirm your account:</p>
      <p style="font-family:monospace;font-size:36px;letter-spacing:8px;color:#0A2E1F;background:#fff;padding:20px;border-radius:8px;text-align:center;border:1px solid #ddd;margin:16px 0">${code}</p>
      <p style="color:#888;font-size:12px">⏱ Expires in 10 minutes. If you didn't request this, ignore this email.</p>
    `),
  });
}

export async function sendOrderConfirmation(to: string, orderNumber: string, total: number) {
  return sendMail({
    to,
    subject: `✅ Order ${orderNumber} confirmed — SOMA Market`,
    text: `Murakoze! Your SOMA Market order ${orderNumber} for RWF ${total.toLocaleString()} is confirmed.`,
    html: emailWrapper(`
      <h2 style="color:#0A2E1F;margin:0 0 8px">Murakoze! Order confirmed 🎉</h2>
      <p>Your order <strong>${orderNumber}</strong> has been received and is being processed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666">Order number</td><td style="padding:8px 0;font-weight:600">${orderNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Amount</td><td style="padding:8px 0;font-weight:600;color:#F5A623">RWF ${total.toLocaleString()}</td></tr>
      </table>
      <p>We'll send you another email when your order is on the way.</p>
    `),
  });
}

export async function sendNewOrderAlertToSeller(
  to: string,
  storeName: string,
  orderNumber: string,
  items: Array<{ title: string; quantity: number; unitPrice: number }>,
) {
  const itemRows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0">${i.title}</td><td style="padding:8px 0">x${i.quantity}</td><td style="padding:8px 0;font-weight:600">RWF ${(i.unitPrice * i.quantity).toLocaleString()}</td></tr>`,
    )
    .join("");

  return sendMail({
    to,
    subject: `🛒 New order ${orderNumber} — ${storeName}`,
    text: `You have a new order ${orderNumber} on SOMA Market. Log in to your seller dashboard to process it.`,
    html: emailWrapper(`
      <h2 style="color:#0A2E1F;margin:0 0 8px">New order received! 🛒</h2>
      <p>Hi ${storeName}, you have a new order <strong>${orderNumber}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="border-bottom:1px solid #ddd"><th style="text-align:left;padding:8px 0">Item</th><th style="text-align:left;padding:8px 0">Qty</th><th style="text-align:left;padding:8px 0">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <a href="${process.env.CLIENT_URL ?? "https://somamarket.rw"}/seller/orders" style="${btnStyle}">View Order →</a>
    `),
  });
}

export async function sendOrderStatusUpdate(
  to: string,
  orderNumber: string,
  status: string,
  note?: string,
) {
  const statusLabels: Record<string, string> = {
    preparing: "Your order is being prepared",
    packed: "Your order is packed and ready",
    out_for_delivery: "Your order is out for delivery 🚴",
    delivered: "Your order has been delivered ✅",
    cancelled: "Your order has been cancelled",
  };

  const label = statusLabels[status] ?? `Order status updated: ${status}`;

  return sendMail({
    to,
    subject: `📦 ${label} — Order ${orderNumber}`,
    text: `${label}. Order: ${orderNumber}.${note ? ` Note: ${note}` : ""}`,
    html: emailWrapper(`
      <h2 style="color:#0A2E1F;margin:0 0 8px">${label}</h2>
      <p>Your order <strong>${orderNumber}</strong> status has been updated.</p>
      ${note ? `<p style="background:#fff;padding:12px;border-radius:8px;border-left:3px solid #F5A623;color:#444">${note}</p>` : ""}
      <a href="${process.env.CLIENT_URL ?? "https://somamarket.rw"}/orders" style="${btnStyle}">Track Order →</a>
    `),
  });
}

export async function sendSellerApprovalEmail(
  to: string,
  storeName: string,
  approved: boolean,
  note?: string,
) {
  return sendMail({
    to,
    subject: approved
      ? `✅ Your SOMA store "${storeName}" is approved!`
      : `ℹ️ Update on your SOMA store application — ${storeName}`,
    text: approved
      ? `Congratulations! Your store "${storeName}" has been approved on SOMA Market. You can now start listing products.`
      : `Your store application for "${storeName}" needs attention. ${note ?? "Please contact support."}`,
    html: emailWrapper(
      approved
        ? `
          <h2 style="color:#0A2E1F">Congratulations! Your store is live 🎉</h2>
          <p>Your store <strong>"${storeName}"</strong> has been approved on SOMA Market.</p>
          <p>You can now:</p>
          <ul style="color:#444"><li>List your first products</li><li>Set up your store profile</li><li>Share your store link with customers</li></ul>
          <a href="${process.env.CLIENT_URL ?? "https://somamarket.rw"}/seller" style="${btnStyle}">Go to Seller Dashboard →</a>
        `
        : `
          <h2 style="color:#0A2E1F">Store Application Update</h2>
          <p>We've reviewed your store application for <strong>"${storeName}"</strong>.</p>
          ${note ? `<p style="background:#fff;padding:12px;border-radius:8px;border-left:3px solid #e55">Reason: ${note}</p>` : ""}
          <p>Please contact <a href="mailto:support@somamarket.rw">support@somamarket.rw</a> if you have questions.</p>
        `,
    ),
  });
}

export async function sendPasswordResetEmail(to: string, code: string) {
  return sendMail({
    to,
    subject: "Reset your SOMA Market password",
    text: `Your password reset code is ${code}. It expires in 15 minutes.`,
    html: emailWrapper(`
      <h2 style="color:#0A2E1F;margin:0 0 12px">Reset your password</h2>
      <p>Use the code below to reset your password. It expires in 15 minutes.</p>
      <p style="font-family:monospace;font-size:36px;letter-spacing:8px;color:#0A2E1F;background:#fff;padding:20px;border-radius:8px;text-align:center;border:1px solid #ddd;margin:16px 0">${code}</p>
      <p style="color:#888;font-size:12px">If you didn't request a password reset, you can ignore this email — your account is safe.</p>
    `),
  });
}

export async function sendPayoutNotificationEmail(
  to: string,
  storeName: string,
  amount: number,
  ref: string,
) {
  return sendMail({
    to,
    subject: `💰 Payout of RWF ${amount.toLocaleString()} sent — ${storeName}`,
    text: `Your payout of RWF ${amount.toLocaleString()} has been sent to your MoMo account. Reference: ${ref}.`,
    html: emailWrapper(`
      <h2 style="color:#0A2E1F;margin:0 0 8px">Payout sent! 💰</h2>
      <p>Hi ${storeName}, your payout has been processed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#666">Amount</td><td style="padding:8px 0;font-weight:600;color:#F5A623">RWF ${amount.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;font-family:monospace">${ref}</td></tr>
      </table>
      <p style="color:#888;font-size:12px">Funds will appear in your MoMo account within minutes.</p>
    `),
  });
}

export async function sendDisputeNotificationEmail(
  to: string,
  orderNumber: string,
  status: string,
) {
  return sendMail({
    to,
    subject: `Dispute update for order ${orderNumber} — SOMA Market`,
    text: `Your dispute for order ${orderNumber} has been updated: ${status}.`,
    html: emailWrapper(`
      <h2 style="color:#0A2E1F;margin:0 0 8px">Dispute Update</h2>
      <p>Your dispute for order <strong>${orderNumber}</strong> has been updated.</p>
      <p style="background:#fff;padding:12px;border-radius:8px;border-left:3px solid #F5A623">Status: <strong>${status}</strong></p>
      <a href="${process.env.CLIENT_URL ?? "https://somamarket.rw"}/orders" style="${btnStyle}">View Orders →</a>
    `),
  });
}
