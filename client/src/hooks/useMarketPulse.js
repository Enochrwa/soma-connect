import { useState } from "react";
import { useSocketEvent } from "./useSocket";
export function useMarketPulse() {
    const [activeShoppers, setActiveShoppers] = useState(12);
    useSocketEvent("marketPulse", ({ activeShoppers: count }) => {
        setActiveShoppers(count);
    });
    return { activeShoppers };
}
