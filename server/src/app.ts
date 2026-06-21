import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { passport } from "./config/passport.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { authRouter } from "./routes/auth.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { sellerRouter } from "./routes/seller.routes.js";
import { orderRouter } from "./routes/order.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { loyaltyRouter } from "./routes/loyalty.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import couponRouter from "./routes/coupon.routes.js";
import { payoutRouter } from "./routes/payout.routes.js";
import { disputeRouter } from "./routes/dispute.routes.js";
import { bulkImportRouter } from "./routes/bulk-import.routes.js";
import { contactRouter } from "./routes/contact.routes.js";

export const app = express();
const clientUrls = (env.CLIENT_URL ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "https://res.cloudinary.com",
          "https://placehold.co",
          "https://lh3.googleusercontent.com",
        ],
        connectSrc: ["'self'", ...clientUrls, "wss:", "ws:"],
      },
    },
  }),
);

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(compression());
app.use(
  cors({
    origin: clientUrls,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(rateLimiter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    name: "soma-market",
    env: env.NODE_ENV,
    time: new Date().toISOString(),
  }),
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/sellers", sellerRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/ai", aiRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/loyalty", loyaltyRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/payouts", payoutRouter);
app.use("/api/disputes", disputeRouter);
app.use("/api/products/bulk", bulkImportRouter);
app.use("/api/contact", contactRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);
