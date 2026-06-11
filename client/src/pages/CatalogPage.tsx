import { useSearchParams } from "react-router-dom";
import { useListProductsQuery } from "../app/api";
import ProductCard from "../components/product/ProductCard";
import { Skeleton } from "../components/ui/Skeleton";
import { CATEGORIES } from "../constants";
import type { Product } from "../types";

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? undefined;
  const q = params.get("q") ?? undefined;
  const { data, isLoading } = useListProductsQuery({ category, q, limit: 24 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button className="pill bg-white border" onClick={() => setParams({})}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            onClick={() => setParams({ category: c.label })}
            className={`pill border ${category === c.label ? "bg-forest text-ivory" : "bg-white"}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
          : (data?.items ?? []).map((p: Product) => <ProductCard key={p._id} p={p} />)}
      </div>
    </div>
  );
}
