import jwt, { type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../config/env.js";

export function signAccessToken(user: { id: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(user: { id: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions["expiresIn"],
  });
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie("soma_rt", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    // "none" is required for cross-origin (Vercel frontend → Render API).
    // "lax" only works when frontend and backend share the same domain.
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    // Omit domain when the env var is empty — setting it to a specific Render
    // subdomain causes browsers to reject the cookie on cross-origin requests.
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie("soma_rt", {
    path: "/api/auth",
    domain: env.COOKIE_DOMAIN || undefined,
  });
}
