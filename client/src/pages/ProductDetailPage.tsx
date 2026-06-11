import { useParams } from "react-router-dom";
import { useGetProductQuery } from "../app/api";
import { useAppDispatch } from "../app/hooks";
import { addItem } from "../features/cart/cartSlice";
import { formatRWF } from "../utils/format";
import { Heart, Shield, Truck, BadgeCheck } from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useGetProductQuery(id!);
  const dispatch = useAppDispatch();
  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-12">Loading…</div>;
  const p = data?.product;
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-12">Product not found.</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 grid md:grid-cols-2 gap-8">
      <div>
        <img
          src={p.images?.[0]}
          alt={p.title}
          className="w-full rounded-2xl aspect-square object-cover"
        />
        <div className="grid grid-cols-5 gap-2 mt-2">
          {(p.images ?? []).slice(0, 5).map((img: string, i: number) => (
            <img key={i} src={img} className="aspect-square object-cover rounded-lg" />
          ))}
        </div>
      </div>
      <div>
        <h1 className="font-display text-3xl text-forest">{p.title}</h1>
        <div className="text-sm text-slate/60 mt-1">
          ★ {(p.avgRating ?? 0).toFixed(1)} · {p.reviewCount ?? 0} reviews
        </div>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="price text-3xl text-saffron">{formatRWF(p.price)}</span>
          {p.comparePrice && (
            <span className="text-slate/40 line-through font-mono">
              {formatRWF(p.comparePrice)}
            </span>
          )}
        </div>
        <p className="mt-4 text-slate/80 leading-relaxed">{p.description}</p>
        <div className="mt-2 text-sm">
          {p.stock > 0 ? (
            <span className="text-forest">✅ In stock ({p.stock})</span>
          ) : (
            <span className="text-vermillion">❌ Out of stock</span>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="btn-primary"
            disabled={p.stock < 1}
            onClick={() =>
              dispatch(
                addItem({
                  productId: p._id,
                  title: p.title,
                  image: p.images?.[0],
                  unitPrice: p.price,
                  quantity: 1,
                  sellerId: typeof p.sellerId === "string" ? p.sellerId : p.sellerId._id,
                  stock: p.stock,
                }),
              )
            }
          >
            Add to cart
          </button>
          <button className="btn-secondary">Buy now</button>
          <button className="btn-ghost">
            <Heart size={16} /> Save
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate/70">
          <span className="flex items-center gap-1">
            <Shield size={14} /> Secure payment
          </span>
          <span className="flex items-center gap-1">
            <Truck size={14} /> 7-day returns
          </span>
          <span className="flex items-center gap-1">
            <BadgeCheck size={14} /> Verified seller
          </span>
        </div>
      </div>
    </div>
  );
}
