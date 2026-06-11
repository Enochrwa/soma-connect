import { useGetLoyaltyQuery, useClaimDailyLoginMutation } from "../app/api";
import { useAppSelector } from "../app/hooks";
import type { RootState } from "../app/store";
import { Star, Gift, Zap, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";

const TIER_CONFIG = {
  starter: {
    color: "bg-slate/10 text-slate",
    next: "regular",
    pointsNeeded: 500,
    label: "Starter",
  },
  regular: {
    color: "bg-blue-50 text-blue-700",
    next: "trusted",
    pointsNeeded: 1500,
    label: "Regular",
  },
  trusted: {
    color: "bg-purple-50 text-purple-700",
    next: "vip",
    pointsNeeded: 5000,
    label: "Trusted",
  },
  vip: {
    color: "bg-saffron/15 text-saffron-dark",
    next: null,
    pointsNeeded: null,
    label: "VIP 👑",
  },
};

export default function LoyaltyPage() {
  const user = useAppSelector((s: RootState) => s.auth.user);
  const { data, isLoading } = useGetLoyaltyQuery(undefined, { skip: !user });
  const [claimDaily, { isLoading: claiming }] = useClaimDailyLoginMutation();
  const [claimed, setClaimed] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");

  async function handleClaim() {
    try {
      const res = await claimDaily().unwrap();
      setClaimed(true);
      setClaimMsg(res.message ?? `+${res.awarded} points earned!`);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      setClaimMsg(msg ?? "Already claimed today.");
      setClaimed(true);
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-forest" size={28} />
      </div>
    );

  const tier = (user?.tier ?? "starter") as keyof typeof TIER_CONFIG;
  const tierInfo = TIER_CONFIG[tier];
  const points = user?.loyaltyPoints ?? 0;
  const progress = tierInfo.pointsNeeded
    ? Math.min((points / tierInfo.pointsNeeded) * 100, 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display text-2xl font-bold text-forest">Your Rewards</h1>

      {/* Points card */}
      <div className="bg-forest rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-white/60 text-sm">Available points</p>
            <p className="font-display text-4xl font-bold text-saffron mt-1">
              {points.toLocaleString()}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${tierInfo.color}`}>
            {tierInfo.label}
          </div>
        </div>
        {tierInfo.pointsNeeded && (
          <div>
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>
                Progress to {TIER_CONFIG[tierInfo.next as keyof typeof TIER_CONFIG]?.label}
              </span>
              <span>
                {points} / {tierInfo.pointsNeeded}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-saffron rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Daily claim */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-saffron/10 rounded-xl flex items-center justify-center">
            <Gift size={20} className="text-saffron" />
          </div>
          <div>
            <h2 className="font-display font-bold text-forest">Daily Login Bonus</h2>
            <p className="text-xs text-slate/50">Earn points by logging in every day</p>
          </div>
        </div>
        {claimed ? (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle size={16} /> {claimMsg}
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="flex items-center gap-2 bg-saffron text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-saffron-dark transition disabled:opacity-60"
          >
            {claiming ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            Claim daily bonus
          </button>
        )}
      </div>

      {/* History */}
      {data?.events?.length ? (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-display font-bold text-forest mb-4">Points history</h2>
          <div className="space-y-3">
            {data.events.map((ev) => (
              <div
                key={ev._id}
                className="flex items-center justify-between py-2 border-b border-forest/5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-forest">{ev.description}</p>
                  <p className="text-xs text-slate/40 mt-0.5">
                    {new Date(ev.createdAt).toLocaleDateString("en-RW")}
                  </p>
                </div>
                <span
                  className={`font-mono font-bold text-sm ${ev.points >= 0 ? "text-green-600" : "text-vermillion"}`}
                >
                  {ev.points >= 0 ? "+" : ""}
                  {ev.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* How to earn */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <h2 className="font-display font-bold text-forest mb-4 flex items-center gap-2">
          <Star size={16} className="text-saffron" /> How to earn points
        </h2>
        <div className="space-y-3">
          {[
            { label: "Daily login", points: "+10", icon: "🌅" },
            { label: "Make a purchase", points: "+1 per 100 RWF", icon: "🛒" },
            { label: "Leave a review", points: "+50", icon: "⭐" },
            { label: "Refer a friend", points: "+200", icon: "👥" },
          ].map(({ label, points: pts, icon }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-slate/70">
                <span>{icon}</span> {label}
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                {pts}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
