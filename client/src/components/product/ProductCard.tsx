import { Link, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { formatRWF } from "../../utils/format";
import type { Product } from "../../types";
import type { RootState } from "../../app/store";
import { toggleWishlist } from "../../features/wishlist/wishlistSlice";

export default function ProductCard({ p }: { p: Product }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const isWishlisted = useSelector((s: RootState) => s.wishlist.items.some((w) => w._id === p._id));

  const onSale = p.comparePrice && p.comparePrice > p.price;
  const discountPct = onSale
    ? Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100)
    : 0;

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login", { state: { from: `/products/${p._id}` } });
      return;
    }
    dispatch(toggleWishlist(p));
  }

  return (
    <Link to={`/products/${p._id}`} className="card overflow-hidden group block">
      <div className="relative aspect-square bg-ivory">
        <img
          src={p.images?.[0]}
          alt={p.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = `https://placehold.co/400x400/0A2E1F/F5A623?text=${encodeURIComponent(
              p.title.slice(0, 12),
            )}`;
          }}
        />
        {onSale && (
          <span className="absolute top-2 left-2 bg-vermillion text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discountPct}%
          </span>
        )}
        {p.stock === 0 && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="bg-white text-slate/60 text-xs font-semibold px-3 py-1 rounded-full shadow">
              Sold out
            </span>
          </div>
        )}
        <button
          onClick={handleWishlist}
          className={`absolute top-2 right-2 w-9 h-9 grid place-items-center rounded-full bg-white/90 hover:bg-white shadow transition ${
            isWishlisted ? "text-vermillion" : "text-slate/40 hover:text-vermillion"
          }`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="p-3 space-y-1">
        <div className="text-sm font-medium line-clamp-2 text-slate">{p.title}</div>
        <div className="flex items-baseline gap-2">
          <span className="price text-base font-bold text-forest font-mono">
            {formatRWF(p.price)}
          </span>
          {onSale && (
            <span className="text-xs text-slate/40 line-through font-mono">
              {formatRWF(p.comparePrice!)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-slate/60">
          <span>
            ★ {(p.avgRating ?? 0).toFixed(1)}
            <span className="text-slate/40 ml-0.5">({p.reviewCount ?? 0})</span>
          </span>
          {p.stock > 0 ? (
            <span className="text-green-600 font-medium">In stock</span>
          ) : (
            <span className="text-vermillion font-medium">Sold out</span>
          )}
        </div>
      </div>
    </Link>
  );
}
