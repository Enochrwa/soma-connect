import ProductCard from "../product/ProductCard";
import { Skeleton } from "../ui/Skeleton";
import type { Product } from "../../types";

export default function ProductRow({
  title,
  subtitle,
  items,
  isLoading,
}: {
  title: string;
  subtitle?: string;
  items: Product[];
  isLoading?: boolean;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 mt-12">
      <div className="mb-4">
        <h2 className="font-display text-2xl text-forest">{title}</h2>
        {subtitle && <p className="text-sm text-slate/60">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
          : items.map((p) => <ProductCard key={p._id} p={p} />)}
      </div>
    </section>
  );
}
