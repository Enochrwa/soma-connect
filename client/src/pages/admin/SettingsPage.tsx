import { Helmet } from "react-helmet-async";
import { CheckCircle, XCircle } from "lucide-react";
import { useAdminSettingsQuery } from "../../app/api";
import { formatRWF } from "../../utils/format";
import { PageHeader, Spinner } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-card p-5">
      <h2 className="font-semibold text-forest mb-3">{title}</h2>
      <dl className="text-sm space-y-2">{children}</dl>
    </section>
  );
}
function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate/60">{k}</dt>
      <dd className="font-mono text-right">{v}</dd>
    </div>
  );
}
function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate/60">{label}</dt>
      <dd className={`flex items-center gap-1 ${ok ? "text-green-700" : "text-red-600"}`}>
        {ok ? <CheckCircle size={15} /> : <XCircle size={15} />} {ok ? "Connected" : "Not set up"}
      </dd>
    </div>
  );
}

export default function SettingsPage() {
  const { data: s, isLoading } = useAdminSettingsQuery();
  if (isLoading || !s) return <Spinner />;
  const c: any = s;
  return (
    <>
      <Helmet>
        <title>Settings — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Settings"
        subtitle="How the platform is configured right now. Values come from environment variables on your server (Render) — change them there and redeploy."
      />
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Commission & payouts">
          <Item k="Default commission" v={`${Math.round(c.commission.defaultRate * 1000) / 10}%`} />
          <Item k="Earnings hold after delivery" v={`${c.commission.holdDays} day(s)`} />
          <Item k="Minimum payout" v={formatRWF(c.commission.minPayout)} />
          <p className="text-xs text-slate/40 pt-1">
            Env: COMMISSION_RATE, EARNINGS_HOLD_DAYS. Per-seller rates are set on the Sellers page.
          </p>
        </Card>
        <Card title="Referral programme">
          <Item k="Referrer bonus" v={`${c.referral.REFERRER_BONUS_POINTS} pts`} />
          <Item k="Friend bonus" v={`${c.referral.REFEREE_BONUS_POINTS} pts`} />
          <Item
            k="Friend's first order at least"
            v={formatRWF(c.referral.MIN_QUALIFYING_ORDER_RWF)}
          />
          <Item k="Max rewards per referrer" v={c.referral.MAX_REWARDED_PER_REFERRER} />
        </Card>
        <Card title="Loyalty & delivery">
          <Item k="Points earned" v={`1 per ${Math.round(1 / c.loyalty.pointsPerRwf)} RWF`} />
          <Item k="Point value" v={`${c.loyalty.rwfPerPoint} RWF`} />
          <Item k="Max paid with points" v={`${c.loyalty.maxRedemptionPct * 100}% of order`} />
          <Item
            k="Standard / Express / Pickup"
            v={`${formatRWF(c.delivery.fees.standard)} / ${formatRWF(c.delivery.fees.express)} / ${formatRWF(c.delivery.fees.pickup)}`}
          />
          <Item k="Free standard delivery over" v={formatRWF(c.delivery.freeStandardOver)} />
        </Card>
        <Card title="Payment methods at checkout">
          <Status
            ok={c.payments.pawapay}
            label={`Instant MoMo (pawaPay, ${c.payments.pawapayEnv})`}
          />
          <Status ok={c.payments.manualAccounts.length > 0} label="Manual transfer" />
          {c.payments.manualAccounts.map((a: any) => (
            <Item key={a.provider} k={a.label} v={a.number} />
          ))}
          {c.payments.manualAccounts.length === 0 && (
            <p className="text-xs text-slate/40">
              Set MANUAL_PAY_MTN_NUMBER or MANUAL_PAY_AIRTEL_NUMBER to offer manual transfer.
            </p>
          )}
          <Status ok label="Cash on delivery" />
        </Card>
        <Card title="Connected services">
          <Status ok={c.services.email} label="Email (Brevo)" />
          <Status ok={c.services.images} label="Image uploads (Cloudinary)" />
          <Status ok={c.services.redis} label="Cache (Upstash Redis)" />
          <Status ok={c.services.googleSignIn} label="Google sign-in" />
          <Status ok={c.services.ai} label="AI helpers (Hugging Face)" />
        </Card>
        <Card title="Environment">
          <Item k="Mode" v={c.environment} />
          <Item k="Website URL" v={c.clientUrl} />
          <Item k="Support inbox" v={c.supportEmail} />
        </Card>
      </div>
    </>
  );
}
