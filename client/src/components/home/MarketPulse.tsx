import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Flame } from "lucide-react";

const url = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

export default function MarketPulse() {
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    const socket = io(url, { transports: ["websocket"] });
    socket.on("marketPulse", (p: { activeShoppers: number }) => setCount(p.activeShoppers));
    return () => {
      socket.disconnect();
    };
  }, []);
  return (
    <div className="bg-forest text-ivory text-xs md:text-sm">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap font-mono">
        <span className="flex items-center gap-2 text-saffron">
          <Flame size={14} /> Market Pulse
        </span>
        <span>🛍️ {count || "—"} shopping now</span>
        <span>⚡ Flash sales live</span>
        <span className="hidden md:inline">📦 Same-day delivery in Kigali</span>
      </div>
    </div>
  );
}
