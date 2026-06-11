import { useParams, Link } from "react-router-dom";
import { useGetSellerQuery, useListProductsQuery } from "../app/api";
import ProductCard from "../components/product/ProductCard";
import { Loader2, AlertCircle, Star, Package, Calendar, Shield } from "lucide-react";
import { Skeleton } from "../components/ui/Skeleton";

export default function SellerPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: sellerData, isLoading, isError } = useGetSellerQuery(slug!);
  const { data: productsData, isLoading: productsLoading } = useListProductsQuery(
    { limit: 20 },
    { skip: !sellerData?.seller },
  );

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );
  }

  if (isError || !sellerData?.seller) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="text-vermillion mx-auto mb-3" size={40} />
        <h2 className="font-display text-xl font-bold text-forest mb-2">Store not found</h2>
        <Link to="/" className="text-saffron hover:underline text-sm">
          Back to home
        </Link>
      </div>
    );
  }

  const seller = sellerData.seller;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Store header */}
      <div className="bg-forest rounded-2xl overflow-hidden mb-8">
        {seller.banner ? (
          <img src={seller.banner} alt="Store banner" className="w-full h-32 object-cover" />
        ) : (
          <div className="h-28 bg-gradient-to-r from-forest to-forest-light" />
        )}
        <div className="p-6 pt-0 flex items-end gap-4 -mt-8">
          <div className="w-16 h-16 rounded-2xl bg-saffron flex items-center justify-center text-white font-bold text-2xl font-display shadow-gold shrink-0">
            {seller.storeName[0]?.toUpperCase()}
          </div>
          <div className="pb-1">
            <h1 className="font-display text-xl font-bold text-white">{seller.storeName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-white/70 text-xs">
                <Star size={12} className="fill-saffron text-saffron" />{" "}
                {seller.rating?.toFixed(1) ?? "—"}
              </span>
              <span className="text-white/40 text-xs">·</span>
              <span className="text-white/70 text-xs">{seller.totalSales ?? 0} sales</span>
              <span className="text-white/40 text-xs">·</span>
              <span className="flex items-center gap-1 text-white/70 text-xs capitalize">
                <Shield size={11} /> {seller.verificationTier}
              </span>
            </div>
          </div>
        </div>
        {seller.description && (
          <p className="px-6 pb-5 text-white/60 text-sm">{seller.description}</p>
        )}
        <div className="px-6 pb-5 flex items-center gap-4 text-xs text-white/50">
          {seller.location?.district && (
            <span className="flex items-center gap-1">📍 {seller.location.district}</span>
          )}
          <span className="flex items-center gap-1 capitalize">
            <Package size={11} /> {seller.accountType}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} /> Since {new Date(seller.createdAt).getFullYear()}
          </span>
        </div>
      </div>

      {/* Products */}
      <h2 className="font-display text-xl font-bold text-forest mb-5">Products</h2>
      {productsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <Skeleton className="aspect-square" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !productsData?.items?.length ? (
        <div className="text-center py-12 text-slate/40">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>No products listed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {productsData.items.map((p) => (
            <ProductCard key={p._id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
