import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useFlashDealsQuery } from "../../app/api";
import ProductCard from "../product/ProductCard";
import { Skeleton } from "../ui/Skeleton";
import { countdown } from "../../utils/format";
import type { Product } from "../../types";

export default function FlashDeals() {
  const { data, isLoading } = useFlashDealsQuery();
  const items: Product[] = data?.items ?? [];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const soonest = items
    .map((i) => i.flashSale?.endsAt)
    .filter(Boolean)
    .sort()[0];

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 mt-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl flex items-center gap-2 text-vermillion">
            <Flame /> Flash deals
          </h2>
          <p className="text-sm text-slate/60">Verified sellers, sharp prices.</p>
        </div>
        {soonest && (
          <div className="font-mono text-sm bg-vermillion text-white rounded-lg px-3 py-1.5">
            Ends in {countdown(soonest)} <span className="sr-only">{tick}</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
          : items.slice(0, 4).map((p) => <ProductCard key={p._id} p={p} />)}
      </div>
    </section>
  );
}
