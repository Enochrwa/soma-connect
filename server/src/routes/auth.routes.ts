import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { nanoid } from "nanoid";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { HttpError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { strictLimiter } from "../middleware/rateLimiter.js";
import {
  signAccessToken,
  signRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} from "../services/token.service.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../services/email.service.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { passport, googleOAuthEnabled } from "../config/passport.js";
import type { UserDoc } from "../models/User.js";

export const authRouter = Router();

const phoneRwRegex = /^\+250 ?7\d{2} ?\d{3} ?\d{3}$/;

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(phoneRwRegex, "Use the format +250 7XX XXX XXX"),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128),
});

authRouter.post("/register", strictLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body as z.infer<typeof registerSchema>;
    const existing = await User.findOne({ phone });
    if (existing) throw new HttpError(409, "An account with this phone already exists.");
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      phone,
      email,
      passwordHash,
      profile: { name },
      referralCode: nanoid(8).toUpperCase(),
    });
    const access = signAccessToken({ id: String(user._id), role: user.role });
    const refresh = signRefreshToken({ id: String(user._id), role: user.role });
    setRefreshCookie(res, refresh);
    res.status(201).json({ user: sanitize(user), accessToken: access });
  } catch (e) {
    next(e);
  }
});

const loginSchema = z.object({
  phone: z.string().regex(phoneRwRegex),
  password: z.string().min(1),
});

authRouter.post("/login", strictLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { phone, password } = req.body as z.infer<typeof loginSchema>;
    const user = await User.findOne({ phone });
    if (!user || !user.passwordHash) throw new HttpError(401, "Invalid phone or password.");
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpError(423, "Too many attempts. Try again in a few minutes.");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      user.failedLogins = (user.failedLogins ?? 0) + 1;
      if (user.failedLogins >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60_000);
        user.failedLogins = 0;
      }
      await user.save();
      throw new HttpError(401, "Invalid phone or password.");
    }
    user.failedLogins = 0;
    user.lockedUntil = undefined;
    await user.save();
    const access = signAccessToken({ id: String(user._id), role: user.role });
    const refresh = signRefreshToken({ id: String(user._id), role: user.role });
    setRefreshCookie(res, refresh);
    res.json({ user: sanitize(user), accessToken: access });
  } catch (e) {
    next(e);
  }
});

const otpRequestSchema = z.object({ email: z.string().email() });
authRouter.post(
  "/otp/request",
  strictLimiter,
  validate(otpRequestSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body as { email: string };
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await bcrypt.hash(code, 8);
      await Otp.create({ email, codeHash, expiresAt: new Date(Date.now() + 10 * 60_000) });
      await sendOtpEmail(email, code);
      res.json({ ok: true, message: "If that email exists, a code is on its way." });
    } catch (e) {
      next(e);
    }
  },
);

const otpVerifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });
authRouter.post("/otp/verify", strictLimiter, validate(otpVerifySchema), async (req, res, next) => {
  try {
    const { email, code } = req.body as { email: string; code: string };
    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (!record) throw new HttpError(400, "No code found — request a new one.");
    if (record.attempts >= 5) throw new HttpError(429, "Too many attempts. Request a new code.");
    const ok = await bcrypt.compare(code, record.codeHash);
    record.attempts += 1;
    await record.save();
    if (!ok) throw new HttpError(400, "That code didn't match.");
    await Otp.deleteMany({ email });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        phone: `+250 ${nanoid(9)
          .replace(/[^0-9]/g, "0")
          .slice(0, 9)}`,
        email,
        emailVerifiedAt: new Date(),
        referralCode: nanoid(8).toUpperCase(),
      });
    } else if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    const access = signAccessToken({ id: String(user._id), role: user.role });
    const refresh = signRefreshToken({ id: String(user._id), role: user.role });
    setRefreshCookie(res, refresh);
    res.json({ user: sanitize(user), accessToken: access });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.soma_rt;
    if (!token) throw new HttpError(401, "Not signed in.");
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; role: string };
    const user = await User.findById(payload.sub);
    if (!user) throw new HttpError(401, "Not signed in.");
    const access = signAccessToken({ id: String(user._id), role: user.role });
    const refresh = signRefreshToken({ id: String(user._id), role: user.role });
    setRefreshCookie(res, refresh); // rotate
    res.json({ accessToken: access, user: sanitize(user) });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/logout", (_req, res) => {
  clearRefreshCookie(res);
  res.json({ ok: true });
});

// Accepts both Mongoose Documents and lean objects — mirrors the User schema shape
type UserLike = {
  _id: unknown;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  profile?: unknown;
  addresses?: unknown;
  loyaltyPoints?: number | null;
  tier?: string | null;
  referralCode?: string | null;
};

function sanitize(u: UserLike) {
  return {
    id: String(u._id),
    phone: u.phone,
    email: u.email,
    role: u.role,
    profile: u.profile,
    addresses: u.addresses,
    loyaltyPoints: u.loyaltyPoints,
    tier: u.tier,
    referralCode: u.referralCode,
  };
}

// ── Password Reset ────────────────────────────────────────────────────────────

const forgotSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((d) => d.phone || d.email, { message: "Provide phone or email." });

authRouter.post(
  "/password/forgot",
  strictLimiter,
  validate(forgotSchema),
  async (req, res, next) => {
    try {
      const { phone, email } = req.body as { phone?: string; email?: string };
      const user = await User.findOne(phone ? { phone } : { email });
      // Always respond OK to prevent user enumeration
      if (!user) {
        return res.json({
          ok: true,
          message: "If that account exists, a reset code has been sent.",
        });
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await bcrypt.hash(code, 8);
      await Otp.create({
        email: user.email ?? user.phone,
        codeHash,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      });
      if (user.email) {
        await sendPasswordResetEmail(user.email, code).catch((e) =>
          console.error("[email] password reset failed", e),
        );
      }
      res.json({ ok: true, message: "If that account exists, a reset code has been sent." });
    } catch (e) {
      next(e);
    }
  },
);

const resetSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    code: z.string().length(6),
    newPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.phone || d.email, { message: "Provide phone or email." });

authRouter.post("/password/reset", strictLimiter, validate(resetSchema), async (req, res, next) => {
  try {
    const { phone, email, code, newPassword } = req.body as {
      phone?: string;
      email?: string;
      code: string;
      newPassword: string;
    };
    const user = await User.findOne(phone ? { phone } : { email });
    if (!user) throw new HttpError(400, "Invalid reset request.");
    const identifier = user.email ?? user.phone;
    const record = await Otp.findOne({ email: identifier }).sort({ createdAt: -1 });
    if (!record) throw new HttpError(400, "No reset code found — request a new one.");
    if (record.attempts >= 5) throw new HttpError(429, "Too many attempts. Request a new code.");
    const ok = await bcrypt.compare(code, record.codeHash);
    record.attempts += 1;
    await record.save();
    if (!ok) throw new HttpError(400, "That code didn't match.");
    await Otp.deleteMany({ email: identifier });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.failedLogins = 0;
    user.lockedUntil = undefined;
    await user.save();
    res.json({ ok: true, message: "Password updated. Please sign in." });
  } catch (e) {
    next(e);
  }
});

// ── Google OAuth ───────────────────────────────────────────────────────────────
// Stateless OAuth flow (no server-side sessions): passport authenticates the
// user, then we issue the same JWT access/refresh tokens used by phone/OTP login
// and redirect back to the SPA.

authRouter.get("/google", (req, res, next) => {
  if (!googleOAuthEnabled) {
    throw new HttpError(503, "Google sign-in is not configured.");
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

authRouter.get(
  "/google/callback",
  (req, res, next) => {
    if (!googleOAuthEnabled) {
      throw new HttpError(503, "Google sign-in is not configured.");
    }
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${env.BASE_URL}/login?error=google`,
    })(req, res, next);
  },
  (req, res, _next) => {
    try {
      // Validate user was authenticated by passport
      const user = req.user as unknown as UserDoc;
      if (!user) {
        console.error("Google callback: No user returned from Passport");
        return res.status(401).json({
          error: "Authentication failed: no user returned",
        });
      }

      // Validate user has required fields
      if (!user._id) {
        console.error("Google callback: User missing _id", user);
        return res.status(500).json({ error: "User record is invalid" });
      }

      // Check if email already exists with different auth method
      const newlyLinkedGoogle = user.newlyLinkedGoogle;
      if (newlyLinkedGoogle) {
        console.log("Google callback: Email exists with different auth method", {
          userId: String(user._id),
          email: user.email,
        });
        return res.status(409).json({
          error: "This email is already registered with a different login method",
          code: "EMAIL_EXISTS",
          suggestion: "Please login with your email and password instead",
        });
      }

      // Validate JWT secrets are configured
      if (!env.JWT_ACCESS_SECRET) {
        console.error("Google callback: JWT_ACCESS_SECRET not configured");
        return res.status(500).json({
          error: "Server configuration error: JWT_ACCESS_SECRET missing",
        });
      }

      if (!env.JWT_REFRESH_SECRET) {
        console.error("Google callback: JWT_REFRESH_SECRET not configured");
        return res.status(500).json({
          error: "Server configuration error: JWT_REFRESH_SECRET missing",
        });
      }

      // Sign tokens
      const access = signAccessToken({
        id: String(user._id),
        role: user.role ?? "buyer",
      });
      const refresh = signRefreshToken({
        id: String(user._id),
        role: user.role ?? "buyer",
      });

      // Set refresh cookie
      setRefreshCookie(res, refresh);

      // Redirect with access token
      res.redirect(`${env.BASE_URL}/auth/google/callback?accessToken=${access}`);
    } catch (err) {
      console.error("Google callback error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return res.status(500).json({
        error: `Google authentication failed: ${errorMsg}`,
      });
    }
  },
);
