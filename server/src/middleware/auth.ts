import type { NextFunction, Request, Response, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "./errorHandler.js";

// ── Extend Express Request via module augmentation (no namespace) ─────────────
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; role: "buyer" | "seller" | "admin" };
  }
}

export interface AuthedRequest extends Request {
  user?: { id: string; role: "buyer" | "seller" | "admin" };
}

export type AuthedHandler = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

export const requireAuth: RequestHandler = (req, _res, next): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new HttpError(401, "Please sign in to continue."));
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as {
      sub: string;
      role: "buyer" | "seller" | "admin";
    };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, "Your session has expired — please sign in again."));
  }
};

export function requireRole(...roles: Array<"buyer" | "seller" | "admin">): RequestHandler {
  return (req, _res, next): void => {
    if (!req.user) {
      next(new HttpError(401, "Sign in required."));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "You do not have permission to access this resource."));
      return;
    }
    next();
  };
}
