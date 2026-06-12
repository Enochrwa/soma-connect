import { Link } from "react-router-dom";
import { useFlashDealsQuery, useTrendingQuery, useNewArrivalsQuery } from "../app/api";
import ProductCard from "../components/product/ProductCard";
import { Skeleton } from "../components/ui/Skeleton";
import { ArrowRight, Zap, TrendingUp, Sparkles, ShoppingBag, Package, Users } from "lucide-react";
import { formatRWF } from "../utils/format";

const CATEGORIES = [
  { label: "Electronics", emoji: "📱", slug: "electronics" },
  { label: "Fashion", emoji: "👗", slug: "fashion" },
  { label: "Home & Garden", emoji: "🏡", slug: "home" },
  { label: "Food & Drinks", emoji: "🍲", slug: "food" },
  { label: "Beauty", emoji: "💄", slug: "beauty" },
  { label: "Sports", emoji: "⚽", slug: "sports" },
  { label: "Agriculture", emoji: "🌾", slug: "agriculture" },
  { label: "Books", emoji: "📚", slug: "books" },
];

function ProductRowSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden">
          <Skeleton className="aspect-square" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  href,
  accent = false,
}: {
  icon: React.ElementType;
  title: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-vermillion/10" : "bg-forest/10"}`}
        >
          <Icon size={17} className={accent ? "text-vermillion" : "text-forest"} />
        </div>
        <h2 className="font-display text-xl font-bold text-forest">{title}</h2>
      </div>
      <Link
        to={href}
        className="text-sm text-saffron font-semibold flex items-center gap-1 hover:gap-2 transition-all"
      >
        See all <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function FlashDealCard({
  p,
}: {
  p: {
    _id: string;
    title: string;
    price: number;
    comparePrice?: number;
    images: string[];
    flashSale?: { endsAt?: string; discountPct?: number };
  };
}) {
  const discountPct = p.comparePrice
    ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
    : (p.flashSale?.discountPct ?? 0);
  return (
    <Link
      to={`/products/${p._id}`}
      className="group relative rounded-2xl overflow-hidden bg-forest shadow-card hover:shadow-card-hover transition-all block"
    >
      <div className="aspect-square">
        <img
          src={p.images?.[0]}
          alt={p.title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/30 to-transparent p-3 flex flex-col justify-between">
        <div className="flex justify-between">
          <span className="bg-vermillion text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discountPct}%
          </span>
          {p.flashSale?.endsAt && (
            <span className="bg-black/40 text-white text-xs px-2 py-0.5 rounded-full font-mono">
              ⚡ Flash
            </span>
          )}
        </div>
        <div>
          <p className="text-white text-sm font-semibold line-clamp-2">{p.title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-saffron font-mono font-bold text-base">{formatRWF(p.price)}</span>
            {p.comparePrice && (
              <span className="text-white/50 font-mono text-xs line-through">
                {formatRWF(p.comparePrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data: flashData, isLoading: flashLoading } = useFlashDealsQuery();
  const { data: trendingData, isLoading: trendingLoading } = useTrendingQuery();
  const { data: newData, isLoading: newLoading } = useNewArrivalsQuery();

  return (
    <div className="min-h-screen bg-ivory">
      {/* Hero */}
      <section className="bg-forest text-white">
        <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-saffron/15 text-saffron px-3 py-1.5 rounded-full text-sm font-semibold">
              <Sparkles size={14} /> Rwanda's Premium Marketplace
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
              Shop Rwandan.
              <br />
              <span className="text-saffron">Support Local.</span>
            </h1>
            <p className="text-white/70 text-lg max-w-md">
              Discover authentic products from Rwandan sellers. Pay with MoMo, get fast delivery
              across Kigali and beyond.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/search"
                className="bg-saffron text-forest font-bold px-6 py-3 rounded-xl hover:bg-saffron-dark transition flex items-center gap-2 shadow-gold"
              >
                <ShoppingBag size={18} /> Start Shopping
              </Link>
              <Link
                to="/register"
                className="border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition"
              >
                Sell on SOMA
              </Link>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Package, label: "Products", value: "10,000+" },
              { icon: Users, label: "Sellers", value: "500+" },
              { icon: TrendingUp, label: "Orders/month", value: "5,000+" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 rounded-2xl p-5 text-center">
                <Icon className="text-saffron mx-auto mb-2" size={24} />
                <div className="font-display text-2xl font-bold text-white">{value}</div>
                <div className="text-white/60 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="font-display text-xl font-bold text-forest mb-5">Browse by category</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              to={`/search?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl hover:shadow-card hover:-translate-y-0.5 transition-all group"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-xs font-semibold text-forest/70 group-hover:text-forest text-center leading-tight">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Flash Deals */}
      {(flashLoading || (flashData?.items?.length ?? 0) > 0) && (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <SectionHeader icon={Zap} title="Flash Deals" href="/search?sort=price_asc" accent />
          {flashLoading ? (
            <ProductRowSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {flashData?.items.map((p) => (
                <FlashDealCard key={p._id} p={p as Parameters<typeof FlashDealCard>[0]["p"]} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <SectionHeader icon={TrendingUp} title="Trending Now" href="/search?sort=rating" />
        {trendingLoading ? (
          <ProductRowSkeleton />
        ) : (trendingData?.items?.length ?? 0) === 0 ? (
          <div className="text-center py-12 text-slate/40">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Products are on their way — check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {trendingData?.items.map((p) => (
              <ProductCard key={p._id} p={p} />
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 py-6 pb-16">
        <SectionHeader icon={Sparkles} title="New Arrivals" href="/search?sort=newest" />
        {newLoading ? (
          <ProductRowSkeleton />
        ) : (newData?.items?.length ?? 0) === 0 ? (
          <div className="text-center py-12 text-slate/40">
            <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">New products coming soon — be the first to discover them.</p>
            <Link
              to="/seller/apply"
              className="inline-block mt-3 text-forest text-sm font-semibold hover:underline"
            >
              Become a seller →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {newData?.items.map((p) => (
              <ProductCard key={p._id} p={p} />
            ))}
          </div>
        )}
      </section>

      {/* Sell CTA Banner */}
      <section className="bg-saffron/10 border-y border-saffron/15">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h3 className="font-display text-2xl font-bold text-forest">Start selling today</h3>
            <p className="text-slate/60 mt-1">Reach thousands of buyers across Rwanda.</p>
          </div>
          <Link
            to="/seller/onboarding"
            className="bg-forest text-white font-bold px-6 py-3 rounded-xl hover:bg-forest-light transition flex items-center gap-2 shrink-0"
          >
            <Package size={17} /> Open your store
          </Link>
        </div>
      </section>
    </div>
  );
}
