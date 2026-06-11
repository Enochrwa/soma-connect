import { useState } from "react";
import { useSocketEvent } from "./useSocket";

interface MarketPulseData {
  activeShoppers: number;
}

export function useMarketPulse() {
  const [activeShoppers, setActiveShoppers] = useState<number>(12);

  useSocketEvent<MarketPulseData>("marketPulse", ({ activeShoppers: count }) => {
    setActiveShoppers(count);
  });

  return { activeShoppers };
}
