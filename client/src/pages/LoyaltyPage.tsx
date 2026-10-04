import { useGetLoyaltyQuery, useClaimDailyLoginMutation, useGetMyReferralsQuery } from "../app/api";
import { useAppSelector } from "../app/hooks";
import type { RootState } from "../app/store";
import { Star, Gift, Zap, Loader2, CheckCircle, Copy, Share2, Users } from "lucide-react";
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
    pointsNeeded: 2000,
    label: "Regular",
  },
  trusted: {
    color: "bg-purple-50 text-purple-700",
    next: "vip",
    pointsNeeded: 10000,
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
  const { data: referrals } = useGetMyReferralsQuery(undefined, { skip: !user });
  const [copied, setCopied] = useState(false);

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

  const tier = (data?.tier ?? user?.tier ?? "starter") as keyof typeof TIER_CONFIG;
  const tierInfo = TIER_CONFIG[tier];
  const points = data?.points ?? user?.loyaltyPoints ?? 0;
  const inviteLink = referrals ? `${window.location.origin}/register?ref=${referrals.code}` : "";
  const bonus = referrals?.rules.referrerBonusPoints ?? 500;

  async function copyInvite() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
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

      {/* Refer a friend */}
      {referrals && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-saffron/10 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-saffron" />
            </div>
            <div>
              <h2 className="font-display font-bold text-forest">Refer a friend</h2>
              <p className="text-xs text-slate/50">
                You earn {bonus} points and your friend gets {referrals.rules.refereeBonusPoints}{" "}
                when their first order (min. {referrals.rules.minQualifyingOrder.toLocaleString()}{" "}
                RWF) is delivered.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-forest/5 rounded-xl px-4 py-3">
            <span className="font-mono font-bold text-forest tracking-widest flex-1">
              {referrals.code}
            </span>
            <button
              onClick={copyInvite}
              className="flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-saffron"
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? "Link copied" : "Copy invite link"}
            </button>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Join me on OneAfricaShop and get ${referrals.rules.refereeBonusPoints} bonus points: ${inviteLink}`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition"
          >
            <Share2 size={14} /> Share on WhatsApp
          </a>

          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            {[
              { label: "Joined", value: referrals.stats.invited },
              { label: "Rewarded", value: referrals.stats.rewarded },
              { label: "Points earned", value: referrals.stats.pointsEarned },
            ].map((x) => (
              <div key={x.label} className="bg-slate/5 rounded-xl py-3">
                <p className="font-display text-xl font-bold text-forest">{x.value}</p>
                <p className="text-xs text-slate/50">{x.label}</p>
              </div>
            ))}
          </div>

          {referrals.referrals.length > 0 && (
            <div className="mt-4 space-y-2">
              {referrals.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate/70">{r.friend}</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      r.status === "rewarded"
                        ? "bg-green-50 text-green-700"
                        : r.status === "rejected"
                          ? "bg-red-50 text-red-700"
                          : "bg-saffron/15 text-saffron-dark"
                    }`}
                  >
                    {r.status === "rewarded"
                      ? `+${r.pointsEarned} pts`
                      : r.status === "rejected"
                        ? "Not eligible"
                        : "Waiting for first delivery"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            { label: "Daily login", points: "+5", icon: "🌅" },
            { label: "Delivered purchase", points: "+1 per 100 RWF", icon: "🛒" },
            { label: "Refer a friend", points: `+${bonus}`, icon: "👥" },
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
