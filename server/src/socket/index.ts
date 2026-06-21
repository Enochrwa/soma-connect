import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env.js";

let io: Server | null = null;
let activeShoppers = 0;

// Parse CLIENT_URL into array for CORS
const parseClientOrigins = (): string[] => {
  return (env.CLIENT_URL ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
};

export function initSocket(httpServer: HttpServer) {
  const clientOrigins = parseClientOrigins();

  io = new Server(httpServer, {
    cors: { origin: clientOrigins, credentials: true },
  });

  io.on("connection", (socket) => {
    activeShoppers += 1;
    io?.emit("marketPulse", { activeShoppers });

    socket.on("subscribeOrder", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("disconnect", () => {
      activeShoppers = Math.max(0, activeShoppers - 1);
      io?.emit("marketPulse", { activeShoppers });
    });
  });

  // Demo: jitter active shopper count for realism
  setInterval(() => {
    const jitter = Math.floor(Math.random() * 5) - 2;
    const fake = Math.max(8, activeShoppers + 8 + jitter);
    io?.emit("marketPulse", { activeShoppers: fake });
  }, 7000);
}

export function emitOrderUpdate(orderId: string, payload: unknown) {
  io?.to(`order:${orderId}`).emit("orderUpdate", payload);
}

export function getIO() {
  return io;
}
