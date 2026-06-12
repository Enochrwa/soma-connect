import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGetProductQuery, useGetReviewsQuery } from "../app/api";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { addItem } from "../features/cart/cartSlice";
import { toggleWishlist as dispatchToggleWishlist } from "../features/wishlist/wishlistSlice";
import type { RootState } from "../app/store";
import { formatRWF } from "../utils/format";
import {
  ShoppingCart,
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  Package,
  Shield,
  Truck,
  RefreshCw,
  Share2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { Seller } from "../types";
import { Breadcrumb } from "../components/ui/Breadcrumb";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useGetProductQuery(id!);
  const { data: reviewsData } = useGetReviewsQuery(id ?? "skip", { skip: !id });
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [imgIdx, setImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<"desc" | "reviews">("desc");

  const wishlistItems = useAppSelector((s: RootState) => s.wishlist.items);
  const user = useAppSelector((s: RootState) => s.auth.user);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="animate-spin text-forest" size={32} />
      </div>
    );
  }

  if (isError || !data?.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="text-vermillion mx-auto mb-3" size={40} />
        <h2 className="font-display text-xl font-bold text-forest mb-2">Product not found</h2>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">
          Go back
        </button>
      </div>
    );
  }

  const p = data.product;
  const seller = typeof p.sellerId === "object" ? (p.sellerId as unknown as Seller) : null;
  const onSale = p.comparePrice && p.comparePrice > p.price;
  const discountPct = onSale
    ? Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100)
    : 0;
  const isWishlisted = wishlistItems.some((w) => w._id === p._id);

  function handleAddToCart() {
    dispatch(
      addItem({
        productId: p._id,
        title: p.title,
        image: p.images?.[0] ?? "",
        unitPrice: p.price,
        quantity,
        sellerId: typeof p.sellerId === "string" ? p.sellerId : p._id,
        sellerName: seller?.storeName,
        stock: p.stock,
      }),
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleToggleWishlist() {
    if (!user) {
      navigate("/login", { state: { from: `/products/${p._id}` } });
      return;
    }
    dispatch(dispatchToggleWishlist(p));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        className="mb-6"
        items={[{ label: p.category, to: `/search?category=${p.category}` }, { label: p.title }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square bg-ivory rounded-2xl overflow-hidden group">
            <img
              src={p.images?.[imgIdx] ?? "/placeholder.png"}
              alt={p.title}
              className="w-full h-full object-cover transition group-hover:scale-[1.02]"
            />
            {onSale && (
              <div className="absolute top-4 left-4 bg-vermillion text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                -{discountPct}% OFF
              </div>
            )}
            {p.images.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx((i) => (i - 1 + p.images.length) % p.images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setImgIdx((i) => (i + 1) % p.images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {p.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                    imgIdx === i ? "border-saffron" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate/50 uppercase tracking-wide mb-2">
              <span>{p.category}</span>
              {p.condition === "used" && (
                <span className="bg-saffron/15 text-saffron-dark px-2 py-0.5 rounded-full font-semibold">
                  Used
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-forest leading-tight">
              {p.title}
            </h1>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  className={
                    s <= Math.round(p.avgRating) ? "fill-saffron text-saffron" : "text-slate/20"
                  }
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-forest">
              {(p.avgRating ?? 0).toFixed(1)}
            </span>
            <span className="text-sm text-slate/50">({p.reviewCount} reviews)</span>
            <span className="text-sm text-slate/40">·</span>
            <span className="text-sm text-slate/50">{p.salesCount} sold</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="font-mono font-bold text-3xl text-saffron">{formatRWF(p.price)}</span>
            {onSale && (
              <span className="font-mono text-lg text-slate/40 line-through">
                {formatRWF(p.comparePrice!)}
              </span>
            )}
            {onSale && (
              <span className="text-sm text-green-600 font-semibold">
                Save {formatRWF(p.comparePrice! - p.price)}
              </span>
            )}
          </div>

          {/* Stock */}
          <div
            className={`flex items-center gap-2 text-sm font-medium ${p.stock > 0 ? "text-green-600" : "text-vermillion"}`}
          >
            <Package size={16} />
            {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
          </div>

          {/* Quantity + CTA */}
          {p.stock > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-forest/15 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-11 flex items-center justify-center text-slate hover:bg-forest/5 transition"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono font-semibold text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(p.stock, q + 1))}
                  className="w-10 h-11 flex items-center justify-center text-slate hover:bg-forest/5 transition"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${
                  added ? "bg-green-500 text-white" : "bg-forest text-white hover:bg-forest-light"
                }`}
              >
                <ShoppingCart size={17} />
                {added ? "Added to cart!" : "Add to cart"}
              </button>

              <button
                onClick={handleToggleWishlist}
                className={`w-11 h-11 flex items-center justify-center rounded-xl border-2 transition ${
                  isWishlisted
                    ? "border-vermillion bg-vermillion/10 text-vermillion"
                    : "border-forest/15 text-slate/50 hover:border-vermillion hover:text-vermillion"
                }`}
              >
                <Heart size={18} className={isWishlisted ? "fill-vermillion" : ""} />
              </button>

              <button className="w-11 h-11 flex items-center justify-center rounded-xl border-2 border-forest/15 text-slate/50 hover:border-forest/30 transition">
                <Share2 size={18} />
              </button>
            </div>
          )}

          {/* Seller */}
          {seller && (
            <Link
              to={`/sellers/${seller.storeSlug}`}
              className="flex items-center gap-3 p-4 bg-forest/5 rounded-2xl hover:bg-forest/10 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-saffron font-bold text-sm shrink-0">
                {seller.storeName?.[0]?.toUpperCase() ?? "S"}
              </div>
              <div>
                <div className="font-semibold text-sm text-forest group-hover:text-forest-light transition">
                  {seller.storeName}
                </div>
                <div className="text-xs text-slate/50">
                  ★ {seller.rating?.toFixed(1) ?? "—"} · {seller.totalSales ?? 0} sales
                </div>
              </div>
              <ChevronRight size={16} className="text-slate/40 ml-auto" />
            </Link>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Shield, label: "Buyer protection" },
              { icon: Truck, label: "Fast delivery" },
              { icon: RefreshCw, label: "Easy returns" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-9 h-9 bg-forest/5 rounded-xl flex items-center justify-center">
                  <Icon size={16} className="text-forest" />
                </div>
                <span className="text-xs text-slate/60 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12">
        <div className="flex border-b border-forest/10">
          {(["desc", "reviews"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-saffron text-forest"
                  : "border-transparent text-slate/50 hover:text-slate"
              }`}
            >
              {tab === "desc" ? "Description" : `Reviews (${p.reviewCount})`}
            </button>
          ))}
        </div>

        {activeTab === "desc" ? (
          <div className="py-6 prose prose-sm max-w-none text-slate/70 leading-relaxed">
            {p.description || <p className="text-slate/40 italic">No description provided.</p>}
            {p.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 not-prose">
                {p.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/search?q=${encodeURIComponent(tag)}`}
                    className="bg-forest/5 text-forest text-xs px-3 py-1 rounded-full hover:bg-forest/10 transition"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 space-y-4">
            {!reviewsData?.reviews?.length ? (
              <div className="text-center text-slate/40 py-8">
                <Star size={32} className="mx-auto mb-3 opacity-30" />
                <p>No reviews yet. Be the first to review this product!</p>
              </div>
            ) : (
              reviewsData.reviews.map((r) => (
                <div key={r._id} className="bg-white rounded-2xl p-5 shadow-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          className={s <= r.rating ? "fill-saffron text-saffron" : "text-slate/20"}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate/40">
                      {new Date(r.createdAt).toLocaleDateString("en-RW")}
                    </span>
                  </div>
                  <p className="text-sm text-slate/80">{r.text}</p>
                  {r.isVerifiedPurchase && (
                    <span className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                      <Shield size={11} /> Verified purchase
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
