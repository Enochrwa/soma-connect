import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useListProductsQuery, useSemanticSearchQuery } from "../app/api";
import ProductCard from "../components/product/ProductCard";
import { Skeleton } from "../components/ui/Skeleton";
import { Filter, X, ChevronDown, Search, Sparkles } from "lucide-react";

const CATEGORIES = [
  "electronics",
  "fashion",
  "home",
  "food",
  "beauty",
  "sports",
  "agriculture",
  "books",
];
const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Highest rated" },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);
  const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "relevance";
  const inStock = params.get("inStock") ?? "";
  const condition = params.get("condition") ?? "";
  const page = Number(params.get("page") ?? "1");

  const { data: semanticData, isLoading: semanticLoading } = useSemanticSearchQuery(q, {
    skip: !semanticMode || !q,
  });

  const { data, isLoading, isFetching } = useListProductsQuery({
    q: q || undefined,
    category: category || undefined,
    sort,
    inStock: inStock || undefined,
    condition: condition || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    page,
    limit: 24,
  });

  function setParam(key: string, val: string) {
    const p = new URLSearchParams(params);
    if (val) p.set(key, val);
    else p.delete(key);
    p.delete("page");
    setParams(p);
  }

  function clearFilters() {
    setParams(q ? { q } : {});
    setMinPrice("");
    setMaxPrice("");
  }

  const hasFilters = !!(category || inStock || condition || minPrice || maxPrice);

  const products = semanticMode && q ? (semanticData?.products ?? []) : (data?.items ?? []);
  const isSemantic = semanticMode && !!semanticData?.semantic;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Helmet>
        <title>{q ? `"${q}" — Search — SOMA Market` : "Search — SOMA Market"}</title>
        <meta
          name="description"
          content={
            q
              ? `Find ${q} on SOMA Market — Rwanda's online marketplace.`
              : "Search products on SOMA Market."
          }
        />
        <meta property="og:title" content={q ? `Search: ${q} — SOMA Market` : "SOMA Market"} />
      </Helmet>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {q && (
          <button
            onClick={() => setSemanticMode(!semanticMode)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              semanticMode
                ? "bg-forest text-white border-forest"
                : "bg-white text-forest/60 border-forest/20 hover:border-forest/40"
            }`}
            title="Use AI-powered semantic search to find products by meaning, not just keywords"
          >
            <Sparkles size={11} />
            AI Search {semanticMode && isSemantic ? "✓" : ""}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold text-forest">
            {q ? (
              `Results for "${q}"`
            ) : category ? (
              <span className="capitalize">{category}</span>
            ) : (
              "All Products"
            )}
          </h1>
          {data && (
            <p className="text-sm text-slate/50 mt-0.5">
              {data.total.toLocaleString()} products found
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-vermillion border border-vermillion/30 px-3 py-1.5 rounded-lg hover:bg-vermillion/5 transition"
            >
              <X size={14} /> Clear filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border transition ${showFilters ? "bg-forest text-white border-forest" : "border-forest/15 text-forest hover:bg-forest/5"}`}
          >
            <Filter size={15} /> Filters{" "}
            {hasFilters && (
              <span className="bg-saffron text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                !
              </span>
            )}
          </button>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="appearance-none text-sm border border-forest/15 rounded-xl px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-saffron/30 bg-white cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate/40 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 animate-slide-up">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setParam("category", category === c ? "" : c)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition capitalize ${
                    category === c
                      ? "bg-forest text-white"
                      : "bg-forest/10 text-forest hover:bg-forest/15"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-2">
              Condition
            </label>
            <div className="flex gap-2">
              {["new", "used"].map((c) => (
                <button
                  key={c}
                  onClick={() => setParam("condition", condition === c ? "" : c)}
                  className={`flex-1 text-sm py-2 rounded-xl font-medium capitalize transition ${
                    condition === c
                      ? "bg-forest text-white"
                      : "bg-forest/10 text-forest hover:bg-forest/15"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-2">
              Price range (RWF)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => setParam("minPrice", minPrice)}
                className="w-full rounded-lg border border-forest/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => setParam("maxPrice", maxPrice)}
                className="w-full rounded-lg border border-forest/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
              />
            </div>
          </div>

          {/* In Stock */}
          <div>
            <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-2">
              Availability
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock === "true"}
                onChange={(e) => setParam("inStock", e.target.checked ? "true" : "")}
                className="w-4 h-4 accent-forest"
              />
              <span className="text-sm text-slate/70">In stock only</span>
            </label>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading || isFetching || (semanticMode && semanticLoading) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <Skeleton className="aspect-square" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !products.length ? (
        <div className="text-center py-20">
          <Search className="text-forest/20 mx-auto mb-4" size={48} />
          <h3 className="font-display text-xl font-bold text-forest/40">No products found</h3>
          <p className="text-slate/40 mt-2">Try different keywords or remove some filters</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-saffron font-semibold hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          {isSemantic && (
            <p className="text-xs text-forest/50 flex items-center gap-1 -mt-2 mb-2">
              <Sparkles size={11} /> AI semantic search — results ranked by meaning
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((p) => (
              <ProductCard key={p._id} p={p} />
            ))}
          </div>

          {/* Pagination */}
          {!semanticMode && data && data.pages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {page > 1 && (
                <button
                  onClick={() => setParam("page", String(page - 1))}
                  className="px-4 py-2 rounded-xl border border-forest/15 text-sm font-medium hover:bg-forest/5 transition"
                >
                  Previous
                </button>
              )}
              {Array.from({ length: Math.min(data!.pages, 7) }, (_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => setParam("page", String(pg))}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition ${pg === page ? "bg-forest text-white" : "border border-forest/15 hover:bg-forest/5"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              {page < data!.pages && (
                <button
                  onClick={() => setParam("page", String(page + 1))}
                  className="px-4 py-2 rounded-xl border border-forest/15 text-sm font-medium hover:bg-forest/5 transition"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
