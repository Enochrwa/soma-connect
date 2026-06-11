import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Flame } from "lucide-react";
const url = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";
export default function MarketPulse() {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const socket = io(url, { transports: ["websocket"] });
        socket.on("marketPulse", (p) => setCount(p.activeShoppers));
        return () => {
            socket.disconnect();
        };
    }, []);
    return (_jsx("div", { className: "bg-forest text-ivory text-xs md:text-sm", children: _jsxs("div", { className: "mx-auto max-w-7xl px-4 py-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap font-mono", children: [_jsxs("span", { className: "flex items-center gap-2 text-saffron", children: [_jsx(Flame, { size: 14 }), " Market Pulse"] }), _jsxs("span", { children: ["\uD83D\uDECD\uFE0F ", count || "—", " shopping now"] }), _jsx("span", { children: "\u26A1 Flash sales live" }), _jsx("span", { className: "hidden md:inline", children: "\uD83D\uDCE6 Same-day delivery in Kigali" })] }) }));
}
