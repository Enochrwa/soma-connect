/**
 * create-admin.ts
 *
 * Production-safe script to create a new admin user or promote/reset an
 * existing user to admin. Safe to run multiple times — it never duplicates.
 *
 * Usage (Render Shell, after build):
 *   node dist/scripts/create-admin.js
 *
 * Required env vars — add temporarily in Render dashboard, remove after:
 *   ADMIN_PHONE      Rwandan format: +250 7XX XXX XXX
 *   ADMIN_EMAIL      Valid email address
 *   ADMIN_PASSWORD   Minimum 16 characters
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import { User } from "../models/User.js";

// ── Validation ────────────────────────────────────────────────────────────────

const RWANDAN_PHONE_RE = /^\+250 ?7\d{2} ?\d{3} ?\d{3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(msg: string): never {
  console.error(`\n[create-admin] ❌  ${msg}\n`);
  process.exit(1);
}

const phone = process.env.ADMIN_PHONE?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!phone) fail("ADMIN_PHONE is not set.");
if (!email) fail("ADMIN_EMAIL is not set.");
if (!password) fail("ADMIN_PASSWORD is not set.");

if (!RWANDAN_PHONE_RE.test(phone))
  fail(`ADMIN_PHONE "${phone}" is not a valid Rwandan number (+250 7XX XXX XXX).`);

if (!EMAIL_RE.test(email)) fail(`ADMIN_EMAIL "${email}" is not a valid email address.`);

if (password.length < 16)
  fail("ADMIN_PASSWORD must be at least 16 characters for a production admin account.");

// ── Main ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  await connectDB();

  const passwordHash = await bcrypt.hash(password!, 12); // cost 12 for admin

  // Find by phone OR email — handles both fresh accounts and existing users
  const existing = await User.findOne({ $or: [{ phone }, { email }] });

  if (existing) {
    const wasAdmin = existing.role === "admin";

    existing.role = "admin";
    existing.passwordHash = passwordHash;
    existing.failedLogins = 0;
    existing.lockedUntil = undefined;

    // Link email if the account was phone-only
    if (!existing.email) existing.email = email;
    if (!existing.emailVerifiedAt) existing.emailVerifiedAt = new Date();

    await existing.save();

    console.log(
      `\n[create-admin] ✅  Existing user ${wasAdmin ? "password reset" : "promoted to admin"}:`,
    );
    console.log(`   ID    : ${String(existing._id)}`);
    console.log(`   Phone : ${existing.phone}`);
    console.log(`   Email : ${existing.email}`);
    console.log(`   Role  : ${existing.role}`);
  } else {
    const user = await User.create({
      phone,
      email,
      passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
      profile: { name: "SOMA Admin", language: "en" },
      referralCode: nanoid(8).toUpperCase(),
      notificationPrefs: { email: true, sms: false, push: true },
    });

    console.log("\n[create-admin] ✅  New admin user created:");
    console.log(`   ID    : ${String(user._id)}`);
    console.log(`   Phone : ${user.phone}`);
    console.log(`   Email : ${user.email}`);
    console.log(`   Role  : ${user.role}`);
  }

  console.log("\n[create-admin] ⚠️   Security reminder:");
  console.log("   → Remove ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD from Render env vars now.");
  console.log("   → Log in at https://somamarket.vercel.app with the phone + password above.\n");
}

run()
  .catch((err: unknown) => {
    console.error("\n[create-admin] ❌  Unexpected error:", err);
    process.exit(1);
  })
  .finally(() => {
    void mongoose.disconnect();
  });
