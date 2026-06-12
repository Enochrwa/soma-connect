import { Link } from "react-router-dom";
import { Breadcrumb } from "../components/ui/Breadcrumb";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { toggleWishlist } from "../features/wishlist/wishlistSlice";
import { addItem } from "../features/cart/cartSlice";
import type { RootState } from "../app/store";
import { formatRWF } from "../utils/format";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";

export default function WishlistPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s: RootState) => s.wishlist.items);

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Heart className="text-forest/20 mx-auto mb-5" size={64} />
        <h2 className="font-display text-2xl font-bold text-forest mb-2">Your wishlist is empty</h2>
        <p className="text-slate/50 mb-8">Save products you love to revisit them later.</p>
        <Link
          to="/search"
          className="bg-forest text-white font-bold px-8 py-3 rounded-xl hover:bg-forest-light transition"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb className="mb-4" items={[{ label: "Wishlist" }]} />
      <h1 className="font-display text-2xl font-bold text-forest mb-6">
        Wishlist <span className="text-slate/40 font-normal text-lg">({items.length})</span>
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => (
          <div key={p._id} className="bg-white rounded-2xl shadow-card overflow-hidden group">
            <Link to={`/products/${p._id}`} className="block relative aspect-square">
              <img
                src={p.images?.[0] ?? "/placeholder.png"}
                alt={p.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition"
              />
              {p.comparePrice && p.comparePrice > p.price && (
                <span className="absolute top-2 left-2 bg-vermillion text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  -{Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)}%
                </span>
              )}
            </Link>
            <div className="p-3 space-y-2">
              <Link
                to={`/products/${p._id}`}
                className="text-sm font-semibold text-forest hover:text-saffron transition line-clamp-2"
              >
                {p.title}
              </Link>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-saffron">{formatRWF(p.price)}</span>
                {p.comparePrice && p.comparePrice > p.price && (
                  <span className="font-mono text-xs text-slate/40 line-through">
                    {formatRWF(p.comparePrice)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    dispatch(
                      addItem({
                        productId: p._id,
                        title: p.title,
                        image: p.images?.[0] ?? "",
                        unitPrice: p.price,
                        quantity: 1,
                        sellerId: typeof p.sellerId === "string" ? p.sellerId : "",
                        stock: p.stock,
                      }),
                    )
                  }
                  disabled={p.stock === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-forest text-white text-xs font-semibold py-2 rounded-lg hover:bg-forest-light transition disabled:opacity-40"
                >
                  <ShoppingCart size={13} /> Add to cart
                </button>
                <button
                  onClick={() => dispatch(toggleWishlist(p))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-vermillion/30 text-vermillion hover:bg-vermillion/10 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
