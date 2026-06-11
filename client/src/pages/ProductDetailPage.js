import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useGetProductQuery, useGetReviewsQuery, useCreateReviewMutation } from "../app/api";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { addItem } from "../features/cart/cartSlice";
import { formatRWF } from "../utils/format";
import { Heart, Shield, Truck, BadgeCheck, Star, Loader2, AlertCircle, CheckCircle } from "lucide-react";
function StarRating({ value, onChange, readonly = false, }) {
    const [hover, setHover] = useState(0);
    return (_jsx("div", { className: "flex gap-0.5", children: [1, 2, 3, 4, 5].map((star) => (_jsx("button", { type: "button", disabled: readonly, onClick: () => onChange?.(star), onMouseEnter: () => !readonly && setHover(star), onMouseLeave: () => !readonly && setHover(0), className: `transition-colors ${readonly ? "cursor-default" : "cursor-pointer"}`, "aria-label": `${star} stars`, children: _jsx(Star, { size: readonly ? 14 : 22, className: (hover || value) >= star ? "fill-saffron text-saffron" : "text-slate/20 fill-slate/10" }) }, star))) }));
}
function ReviewsSection({ productId }) {
    const user = useAppSelector((s) => s.auth.user);
    const { data, isLoading } = useGetReviewsQuery(productId);
    const [createReview, { isLoading: submitting }] = useCreateReviewMutation();
    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [submitted, setSubmitted] = useState(false);
    async function handleSubmitReview(e) {
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
        }
        catch (err) {
            const e = err;
            setSubmitError(e?.data?.error ?? "Failed to submit review.");
        }
    }
    const reviews = data?.reviews ?? [];
    return (_jsxs("div", { className: "mt-10 space-y-6", children: [_jsxs("h2", { className: "font-display text-xl text-forest", children: ["Customer Reviews (", reviews.length, ")"] }), user ? (submitted ? (_jsxs("div", { className: "bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3", children: [_jsx(CheckCircle, { className: "text-green-600", size: 20 }), _jsx("p", { className: "text-green-800 text-sm font-medium", children: "Thank you! Your review has been submitted." })] })) : (_jsxs("div", { className: "bg-white rounded-2xl shadow-card p-5", children: [_jsx("h3", { className: "font-display text-forest font-bold mb-3", children: "Write a Review" }), _jsxs("form", { onSubmit: handleSubmitReview, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-slate/60 mb-1", children: "Your rating *" }), _jsx(StarRating, { value: rating, onChange: setRating })] }), _jsx("textarea", { className: "w-full border border-forest/20 rounded-xl px-3 py-2 text-sm h-28 resize-none", placeholder: "Share your experience with this product (min. 20 characters)\u2026", value: text, onChange: (e) => setText(e.target.value) }), submitError && (_jsxs("p", { className: "text-vermillion text-xs flex items-center gap-1", children: [_jsx(AlertCircle, { size: 12 }), " ", submitError] })), _jsxs("button", { type: "submit", disabled: submitting, className: "btn-primary flex items-center gap-2", children: [submitting && _jsx(Loader2, { size: 14, className: "animate-spin" }), "Submit Review"] })] })] }))) : (_jsxs("div", { className: "bg-forest/5 rounded-2xl p-4 text-sm text-slate/60", children: [_jsx(Link, { to: "/login", className: "text-saffron hover:underline font-medium", children: "Sign in" }), " ", "to write a review."] })), isLoading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 20 }) })) : reviews.length === 0 ? (_jsx("p", { className: "text-sm text-slate/40 py-6 text-center", children: "No reviews yet. Be the first to review this product!" })) : (_jsx("div", { className: "space-y-4", children: reviews.map((review) => {
                    const r = review;
                    return (_jsx("div", { className: "bg-white rounded-2xl shadow-card p-5", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(StarRating, { value: Number(r.rating), readonly: true }), Boolean(r.isVerifiedPurchase) && (_jsxs("span", { className: "text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1", children: [_jsx(CheckCircle, { size: 10 }), " Verified purchase"] }))] }), _jsx("p", { className: "text-sm text-slate/80 leading-relaxed", children: String(r.text) }), r.tags?.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1.5 mt-2", children: r.tags.map((tag) => (_jsx("span", { className: "text-xs bg-forest/8 text-forest px-2 py-0.5 rounded-full", children: tag }, tag))) }))] }), _jsx("span", { className: "text-xs text-slate/40 shrink-0", children: new Date(String(r.createdAt ?? "")).toLocaleDateString("en-RW") })] }) }, String(r._id)));
                }) }))] }));
}
export default function ProductDetailPage() {
    const { id } = useParams();
    const { data, isLoading } = useGetProductQuery(id);
    const dispatch = useAppDispatch();
    const [selectedImage, setSelectedImage] = useState(0);
    if (isLoading)
        return (_jsx("div", { className: "mx-auto max-w-7xl px-4 py-12 flex justify-center", children: _jsx(Loader2, { className: "animate-spin text-forest", size: 28 }) }));
    const p = data?.product;
    if (!p)
        return _jsx("div", { className: "mx-auto max-w-7xl px-4 py-12", children: "Product not found." });
    const seller = p.sellerId && typeof p.sellerId === "object"
        ? p.sellerId
        : null;
    return (_jsxs(_Fragment, { children: [_jsxs(Helmet, { children: [_jsxs("title", { children: [p.title, " \u2014 SOMA Market"] }), _jsx("meta", { name: "description", content: p.description?.slice(0, 155) ?? `${p.title} on SOMA Market` }), _jsx("meta", { property: "og:title", content: `${p.title} — SOMA Market` }), _jsx("meta", { property: "og:description", content: p.description?.slice(0, 155) ?? "" }), p.images?.[0] && _jsx("meta", { property: "og:image", content: p.images[0] }), _jsx("meta", { property: "og:type", content: "product" }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" })] }), _jsxs("div", { className: "mx-auto max-w-7xl px-4 py-8", children: [_jsxs("div", { className: "grid md:grid-cols-2 gap-8", children: [_jsxs("div", { children: [_jsx("img", { src: p.images?.[selectedImage] ?? p.images?.[0], alt: p.title, className: "w-full rounded-2xl aspect-square object-cover bg-slate/10" }), p.images?.length > 1 && (_jsx("div", { className: "grid grid-cols-5 gap-2 mt-2", children: (p.images ?? []).slice(0, 5).map((img, i) => (_jsx("button", { onClick: () => setSelectedImage(i), className: `aspect-square rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? "border-saffron" : "border-transparent"}`, children: _jsx("img", { src: img, alt: "", className: "w-full h-full object-cover" }) }, i))) }))] }), _jsxs("div", { children: [_jsx("h1", { className: "font-display text-3xl text-forest", children: p.title }), _jsxs("div", { className: "text-sm text-slate/60 mt-1", children: ["\u2605 ", (p.avgRating ?? 0).toFixed(1), " \u00B7 ", p.reviewCount ?? 0, " reviews"] }), _jsxs("div", { className: "mt-4 flex items-baseline gap-3", children: [_jsx("span", { className: "price text-3xl text-saffron", children: formatRWF(p.price) }), p.comparePrice && (_jsx("span", { className: "text-slate/40 line-through font-mono", children: formatRWF(p.comparePrice) })), p.comparePrice && (_jsxs("span", { className: "text-xs bg-vermillion/15 text-vermillion px-2 py-0.5 rounded-full font-medium", children: ["-", Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100), "% off"] }))] }), _jsx("p", { className: "mt-4 text-slate/80 leading-relaxed", children: p.description }), _jsx("div", { className: "mt-2 text-sm", children: p.stock > 0 ? (_jsxs("span", { className: "text-forest", children: ["\u2705 In stock (", p.stock, ")"] })) : (_jsx("span", { className: "text-vermillion", children: "\u274C Out of stock" })) }), seller && (_jsxs(Link, { to: `/sellers/${seller.storeSlug}`, className: "inline-flex items-center gap-1.5 mt-3 text-xs text-forest/60 hover:text-forest", children: [_jsx(BadgeCheck, { size: 13 }), seller.storeName] })), _jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [_jsx("button", { className: "btn-primary", disabled: p.stock < 1, onClick: () => dispatch(addItem({
                                                    productId: p._id,
                                                    title: p.title,
                                                    image: p.images?.[0],
                                                    unitPrice: p.price,
                                                    quantity: 1,
                                                    sellerId: typeof p.sellerId === "string" ? p.sellerId : p.sellerId?._id,
                                                    stock: p.stock,
                                                })), children: "Add to cart" }), _jsx("button", { className: "btn-secondary", children: "Buy now" }), _jsxs("button", { className: "btn-ghost", children: [_jsx(Heart, { size: 16 }), " Save"] })] }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-4 text-xs text-slate/70", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Shield, { size: 14 }), " Secure payment"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Truck, { size: 14 }), " 7-day returns"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(BadgeCheck, { size: 14 }), " Verified seller"] })] })] })] }), _jsx(ReviewsSection, { productId: p._id })] })] }));
}
