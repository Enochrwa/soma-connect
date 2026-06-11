import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useGetProductQuery, useGetReviewsQuery, useCreateReviewMutation } from "../app/api";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { addItem } from "../features/cart/cartSlice";
import { formatRWF } from "../utils/format";
import {
  Heart,
  Shield,
  Truck,
  BadgeCheck,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { RootState } from "../app/store";

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer"}`}
          aria-label={`${star} stars`}
        >
          <Star
            size={readonly ? 14 : 22}
            className={
              (hover || value) >= star ? "fill-saffron text-saffron" : "text-slate/20 fill-slate/10"
            }
          />
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const user = useAppSelector((s: RootState) => s.auth.user);
  const { data, isLoading } = useGetReviewsQuery(productId);
  const [createReview, { isLoading: submitting }] = useCreateReviewMutation();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (rating === 0) {
      setSubmitError("Please select a star rating.");
      return;
    }
    if (text.length < 20) {
      setSubmitError("Review must be at least 20 characters.");
      return;
    }
    try {
      await createReview({ productId, rating, text }).unwrap();
      setSubmitted(true);
      setRating(0);
      setText("");
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      setSubmitError(e?.data?.error ?? "Failed to submit review.");
    }
  }

  const reviews = data?.reviews ?? [];

  return (
    <div className="mt-10 space-y-6">
      <h2 className="font-display text-xl text-forest">Customer Reviews ({reviews.length})</h2>

      {/* Write a review */}
      {user ? (
        submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <p className="text-green-800 text-sm font-medium">
              Thank you! Your review has been submitted.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h3 className="font-display text-forest font-bold mb-3">Write a Review</h3>
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div>
                <p className="text-sm text-slate/60 mb-1">Your rating *</p>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <textarea
                className="w-full border border-forest/20 rounded-xl px-3 py-2 text-sm h-28 resize-none"
                placeholder="Share your experience with this product (min. 20 characters)…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {submitError && (
                <p className="text-vermillion text-xs flex items-center gap-1">
                  <AlertCircle size={12} /> {submitError}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Submit Review
              </button>
            </form>
          </div>
        )
      ) : (
        <div className="bg-forest/5 rounded-2xl p-4 text-sm text-slate/60">
          <Link to="/login" className="text-saffron hover:underline font-medium">
            Sign in
          </Link>{" "}
          to write a review.
        </div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-forest" size={20} />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate/40 py-6 text-center">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const r = review as unknown as Record<string, unknown>;
            return (
              <div key={String(r._id)} className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating value={Number(r.rating)} readonly />
                      {Boolean(r.isVerifiedPurchase) && (
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle size={10} /> Verified purchase
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate/80 leading-relaxed">{String(r.text)}</p>
                    {(r.tags as string[])?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(r.tags as string[]).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-forest/8 text-forest px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate/40 shrink-0">
                    {new Date(String(r.createdAt ?? "")).toLocaleDateString("en-RW")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useGetProductQuery(id!);
  const dispatch = useAppDispatch();
  const [selectedImage, setSelectedImage] = useState(0);

  if (isLoading)
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 flex justify-center">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );

  const p = data?.product;
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-12">Product not found.</div>;

  const seller =
    p.sellerId && typeof p.sellerId === "object"
      ? (p.sellerId as unknown as Record<string, string>)
      : null;

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{p.title} — SOMA Market</title>
        <meta
          name="description"
          content={p.description?.slice(0, 155) ?? `${p.title} on SOMA Market`}
        />
        <meta property="og:title" content={`${p.title} — SOMA Market`} />
        <meta property="og:description" content={p.description?.slice(0, 155) ?? ""} />
        {p.images?.[0] && <meta property="og:image" content={p.images[0]} />}
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <img
              src={p.images?.[selectedImage] ?? p.images?.[0]}
              alt={p.title}
              className="w-full rounded-2xl aspect-square object-cover bg-slate/10"
            />
            {p.images?.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {(p.images ?? []).slice(0, 5).map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === i ? "border-saffron" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
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
              {p.comparePrice && (
                <span className="text-xs bg-vermillion/15 text-vermillion px-2 py-0.5 rounded-full font-medium">
                  -{Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)}% off
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

            {seller && (
              <Link
                to={`/sellers/${seller.storeSlug}`}
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-forest/60 hover:text-forest"
              >
                <BadgeCheck size={13} />
                {seller.storeName}
              </Link>
            )}

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
                      sellerId:
                        typeof p.sellerId === "string"
                          ? p.sellerId
                          : (p.sellerId as unknown as { _id: string })?._id,
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

        {/* Reviews section */}
        <ReviewsSection productId={p._id} />
      </div>
    </>
  );
}
