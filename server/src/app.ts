import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
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

export const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(rateLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "soma-market" }));

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/sellers", sellerRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/ai", aiRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/loyalty", loyaltyRouter);

app.use(errorHandler);