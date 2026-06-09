import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { formatRWF } from "../../utils/format";

export default function ProductCard({ p }: { p: any }) {
  const onSale = p.comparePrice && p.comparePrice > p.price;
  return (
    <Link to={`/product/${p._id}`} className="card overflow-hidden group block">
      <div className="relative aspect-square bg-ivory">
        <img
          src={p.images?.[0]}
          alt={p.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition"
        />
        {onSale && (
          <span className="absolute top-2 left-2 pill bg-vermillion text-white">
            -{Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)}%
          </span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); }}
          className="absolute top-2 right-2 w-9 h-9 grid place-items-center rounded-full bg-white/90 hover:bg-white"
          aria-label="Save"
        >
          <Heart size={16} />
        </button>
      </div>
      <div className="p-3 space-y-1">
        <div className="text-sm font-medium line-clamp-2">{p.title}</div>
        <div className="flex items-baseline gap-2">
          <span className="price text-base">{formatRWF(p.price)}</span>
          {onSale && <span className="text-xs text-slate/40 line-through font-mono">{formatRWF(p.comparePrice)}</span>}
        </div>
        <div className="flex items-center justify-between text-xs text-slate/60">
          <span>★ {(p.avgRating ?? 0).toFixed(1)} ({p.reviewCount ?? 0})</span>
          <span>{p.stock > 0 ? `${p.stock} in stock` : "Sold out"}</span>
        </div>
      </div>
    </Link>
  );
}