import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "./errorHandler.js";

export interface AuthedRequest extends Request {
  user?: { id: string; role: "buyer" | "seller" | "admin" };
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Please sign in to continue."));
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as {
      sub: string;
      role: AuthedRequest["user"] extends infer T ? T extends { role: infer R } ? R : never : never;
    };
    req.user = { id: payload.sub, role: payload.role as "buyer" | "seller" | "admin" };
    next();
  } catch {
    next(new HttpError(401, "Your session expired — please sign in again."));
  }
}

export function requireRole(...roles: Array<"buyer" | "seller" | "admin">) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Sign in required."));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "Not allowed."));
    next();
  };
}