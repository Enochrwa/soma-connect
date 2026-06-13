import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  useGetProductQuery,
  useGetReviewsQuery,
  useCreateReviewMutation,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useGetWishlistQuery,
  useReplyToReviewMutation,
  useGetDraftReplyQuery,
  useGetReviewSummaryQuery,
} from "../app/api";
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
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  Sparkles,
  Bot,
  ThumbsUp,
  ThumbsDown,
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

// ── AI draft reply button ─────────────────────────────────────────────────────
function AIDraftButton({
  reviewId,
  onDraft,
}: {
  reviewId: string;
  onDraft: (draft: string) => void;
}) {
  const [fetch, setFetch] = useState(false);
  const { data, isFetching } = useGetDraftReplyQuery(reviewId, { skip: !fetch });

  function handleClick() {
    if (data?.draft) {
      onDraft(data.draft);
    } else {
      setFetch(true);
    }
  }

  // Once data arrives, pass it up
  if (data?.draft && fetch) {
    onDraft(data.draft);
    setFetch(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={isFetching}
      className="text-xs text-saffron/70 hover:text-saffron flex items-center gap-1"
      title="Draft reply with AI"
    >
      {isFetching ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
      AI draft
    </button>
  );
}

// ── AI review summary banner ──────────────────────────────────────────────────
function ReviewSummaryBanner({ productId }: { productId: string }) {
  const [show, setShow] = useState(false);
  const { data, isFetching } = useGetReviewSummaryQuery(productId, { skip: !show });

  return (
    <div>
      {!show ? (
        <button
          onClick={() => setShow(true)}
          className="flex items-center gap-2 text-sm text-forest/60 hover:text-forest border border-forest/20 rounded-xl px-4 py-2 transition-colors"
        >
          <Bot size={15} />
          Summarise reviews with AI
        </button>
      ) : isFetching ? (
        <div className="flex items-center gap-2 text-sm text-slate/50 bg-white rounded-xl p-4 shadow-card">
          <Loader2 size={14} className="animate-spin text-saffron" />
          Generating AI summary…
        </div>
      ) : data?.summary ? (
        <div className="bg-gradient-to-r from-forest/5 to-saffron/5 border border-forest/10 rounded-xl p-4 shadow-card">
          <p className="text-xs font-semibold text-forest/60 flex items-center gap-1 mb-1">
            <Sparkles size={11} className="text-saffron" /> AI Review Summary
          </p>
          <p className="text-sm text-slate/80 leading-relaxed">{data.summary}</p>
        </div>
      ) : null}
    </div>
  );
}

interface ReviewItemProps {
  review: unknown;
  isSeller: boolean;
  onReplySuccess: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replyToReview: (args: { id: string; text: string }) => any;
}

function ReviewItem({ review, isSeller, onReplySuccess, replyToReview }: ReviewItemProps) {
  const r = review as Record<string, unknown>;
  const sellerReply = r.sellerReply as { text: string; at: string } | undefined;
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setReplyError("");
    if (replyText.length < 5) {
      setReplyError("Reply too short.");
      return;
    }
    try {
      await replyToReview({ id: String(r._id), text: replyText }).unwrap();
      onReplySuccess();
      setShowReplyForm(false);
    } catch (err: unknown) {
      setReplyError((err as { data?: { error?: string } }).data?.error ?? "Failed to post reply.");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
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
          {Boolean(r.sentiment) && (
            <div className="mt-2 flex items-center gap-1">
              {(r.sentiment as string) === "positive" && (
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ThumbsUp size={9} /> Positive
                </span>
              )}
              {(r.sentiment as string) === "negative" && (
                <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ThumbsDown size={9} /> Negative
                </span>
              )}
              {Boolean(r.needsModeration) && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                  ⚠ Flagged for review
                </span>
              )}
            </div>
          )}
          {sellerReply && (
            <div className="mt-3 bg-forest/5 border-l-2 border-forest/20 pl-3 rounded-r-lg p-2">
              <p className="text-xs font-semibold text-forest flex items-center gap-1 mb-1">
                <MessageSquare size={11} /> Seller reply
                <span className="text-slate/40 font-normal ml-1">
                  · {new Date(sellerReply.at).toLocaleDateString("en-RW")}
                </span>
              </p>
              <p className="text-sm text-slate/70">{sellerReply.text}</p>
            </div>
          )}
          {isSeller && !sellerReply && (
            <div className="mt-2">
              {showReplyForm ? (
                <form onSubmit={handleReply} className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a public reply to this review…"
                    className="w-full border border-forest/20 rounded-lg px-3 py-2 text-sm h-20 resize-none"
                  />
                  {replyError && <p className="text-vermillion text-xs">{replyError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-xs py-1.5 px-3">
                      Post reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReplyForm(false)}
                      className="btn-ghost text-xs py-1.5 px-3"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => setShowReplyForm(true)}
                    className="text-xs text-forest/50 hover:text-forest flex items-center gap-1"
                  >
                    <MessageSquare size={11} /> Reply as seller
                  </button>
                  <AIDraftButton
                    reviewId={String(r._id)}
                    onDraft={(d) => {
                      setReplyText(d);
                      setShowReplyForm(true);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-slate/40 shrink-0">
          {new Date(String(r.createdAt ?? "")).toLocaleDateString("en-RW")}
        </span>
      </div>
    </div>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const user = useAppSelector((s: RootState) => s.auth.user);
  const { data, isLoading, refetch } = useGetReviewsQuery(productId);
  const [createReview, { isLoading: submitting }] = useCreateReviewMutation();
  const [replyToReview] = useReplyToReviewMutation();

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-display text-xl text-forest">Customer Reviews ({reviews.length})</h2>
        {reviews.length >= 3 && <ReviewSummaryBanner productId={productId} />}
      </div>

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
          {reviews.map((review) => (
            <ReviewItem
              key={String((review as unknown as Record<string, unknown>)._id)}
              review={review}
              isSeller={!!(user && (user.role === "seller" || user.role === "admin"))}
              onReplySuccess={refetch}
              replyToReview={replyToReview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useGetProductQuery(id!);
  const dispatch = useAppDispatch();
  const user = useAppSelector((s: RootState) => s.auth.user);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const { data: wishlistData } = useGetWishlistQuery(undefined, { skip: !user });
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

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

  const images: string[] = p.images ?? [];
  const isWished = wishlistData?.items?.some(
    (w) => (typeof w === "string" ? w : (w as unknown as { _id: string })._id) === p._id,
  );

  async function toggleWishlist() {
    if (!user) return;
    if (isWished) await removeFromWishlist(p!._id);
    else await addToWishlist(p!._id);
  }

  const ogUrl = `${window.location.origin}/products/${p._id}`;

  return (
    <>
      <Helmet>
        <title>{p.title} — SOMA Market</title>
        <meta
          name="description"
          content={p.description?.slice(0, 155) ?? `Buy ${p.title} on SOMA Market`}
        />
        <meta property="og:title" content={`${p.title} — SOMA Market`} />
        <meta
          property="og:description"
          content={p.description?.slice(0, 155) ?? `Shop ${p.title} on SOMA Market`}
        />
        {images[0] && <meta property="og:image" content={images[0]} />}
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="SOMA Market" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${p.title} — SOMA Market`} />
        <meta name="twitter:description" content={p.description?.slice(0, 155) ?? ""} />
        {images[0] && <meta name="twitter:image" content={images[0]} />}
        {/* WhatsApp / general OG price */}
        <meta property="product:price:amount" content={String(p.price)} />
        <meta property="product:price:currency" content="RWF" />
      </Helmet>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2"
            onClick={() => setLightbox(false)}
          >
            <X size={24} />
          </button>
          <button
            className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage((i) => (i - 1 + images.length) % images.length);
            }}
          >
            <ChevronLeft size={28} />
          </button>
          <img
            src={images[selectedImage]}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage((i) => (i + 1) % images.length);
            }}
          >
            <ChevronRight size={28} />
          </button>
          <div className="absolute bottom-4 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(i);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${i === selectedImage ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Image carousel */}
          <div>
            <div className="relative">
              <img
                src={images[selectedImage] ?? images[0]}
                alt={p.title}
                className="w-full rounded-2xl aspect-square object-cover bg-slate/10 cursor-zoom-in"
                onClick={() => images.length > 0 && setLightbox(true)}
              />
              {images.length > 1 && (
                <>
                  <button
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors"
                    onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors"
                    onClick={() => setSelectedImage((i) => (i + 1) % images.length)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {images.slice(0, 10).map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? "border-saffron" : "border-transparent hover:border-forest/20"}`}
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
                {Boolean((seller as unknown as Record<string, unknown>).holidayMode) && (
                  <span className="text-amber-600 ml-1">· 🌴 Temporarily closed</span>
                )}
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
              <button
                onClick={toggleWishlist}
                className={`btn-ghost ${isWished ? "text-vermillion" : ""}`}
                title={isWished ? "Remove from wishlist" : "Save to wishlist"}
              >
                <Heart size={16} className={isWished ? "fill-current" : ""} />
                {isWished ? "Saved" : "Save"}
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
