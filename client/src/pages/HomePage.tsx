import MarketPulse from "../components/home/MarketPulse";
import Hero from "../components/home/Hero";
import CategoryPills from "../components/home/CategoryPills";
import FlashDeals from "../components/home/FlashDeals";
import ProductRow from "../components/home/ProductRow";
import SocialProof from "../components/home/SocialProof";
import { useTrendingQuery, useNewArrivalsQuery } from "../app/api";

export default function HomePage() {
  const trending = useTrendingQuery();
  const fresh = useNewArrivalsQuery();
  return (
    <>
      <MarketPulse />
      <Hero />
      <CategoryPills />
      <FlashDeals />
      <ProductRow title="Trending in Kigali" items={trending.data?.items ?? []} isLoading={trending.isLoading} />
      <ProductRow title="New arrivals" items={fresh.data?.items ?? []} isLoading={fresh.isLoading} />
      <SocialProof />
    </>
  );
}