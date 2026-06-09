import nodemailer from "nodemailer";
import { env } from "../config/env.js";

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
    console.log("[email:dev]", opts.to, opts.subject, "\n", opts.text ?? opts.html);
    return { mocked: true };
  }
  return transporter.sendMail({ from: env.SMTP_FROM, ...opts });
}

export async function sendOtpEmail(to: string, code: string) {
  return sendMail({
    to,
    subject: "Your SOMA Market code",
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<div style="font-family:DM Sans,Arial,sans-serif;padding:24px;background:#FAF7F2;color:#1C1C1E"><h2 style="color:#0A2E1F;margin:0 0 12px">SOMA Market</h2><p>Your verification code:</p><p style="font-family:JetBrains Mono,monospace;font-size:32px;letter-spacing:6px;color:#0A2E1F;background:#fff;padding:16px;border-radius:12px;text-align:center;border:1px solid #eee">${code}</p><p style="color:#666;font-size:12px">Expires in 10 minutes. If you didn't request this, ignore this email.</p></div>`,
  });
}

export async function sendOrderConfirmation(to: string, orderNumber: string, total: number) {
  return sendMail({
    to,
    subject: `Order ${orderNumber} confirmed`,
    text: `Murakoze! Your SOMA Market order ${orderNumber} for RWF ${total.toLocaleString()} is confirmed.`,
    html: `<div style="font-family:DM Sans,Arial,sans-serif;padding:24px;background:#FAF7F2;color:#1C1C1E"><h2 style="color:#0A2E1F">Murakoze!</h2><p>Your order <strong>${orderNumber}</strong> is confirmed.</p><p style="font-size:20px;color:#F5A623"><strong>RWF ${total.toLocaleString()}</strong></p><p>We'll email you again when it's on the way.</p></div>`,
  });
}