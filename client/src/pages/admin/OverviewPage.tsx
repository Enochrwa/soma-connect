import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useAdminDashboardQuery, useAdminOverviewQuery } from "../../app/api";
import { formatRWF } from "../../utils/format";
import { Badge, PageHeader, Spinner, StatCard } from "./ui";
import { fmtDate, label, orderStatusTone } from "./helpers";

const ATTENTION: Array<{ key: string; text: string; to: string }> = [
  { key: "verify", text: "payments to verify", to: "/admin/orders?queue=verify" },
  { key: "ready", text: "paid orders waiting to be processed", to: "/admin/orders?queue=ready" },
  { key: "refunds", text: "refunds to send", to: "/admin/orders?queue=refund" },
  {
    key: "pendingSellers",
    text: "sellers waiting for approval",
    to: "/admin/sellers?status=pending",
  },
  { key: "pendingPayouts", text: "payout requests to pay", to: "/admin/payouts" },
  { key: "openDisputes", text: "open disputes", to: "/admin/disputes" },
  { key: "clawbacks", text: "refund clawbacks to recover", to: "/admin/earnings" },
  { key: "lowStock", text: "products almost out of stock", to: "/admin/products?status=low_stock" },
];

function RevenueBars({
  daily,
}: {
  daily: Array<{ _id: string; revenue: number; orders: number }>;
}) {
  if (daily.length === 0)
    return (
      <p className="text-sm text-slate/50 py-6 text-center">No paid orders in the last 30 days.</p>
    );
  const max = Math.max(...daily.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1 h-36">
      {daily.map((d) => (
        <div
          key={d._id}
          className="flex-1 min-w-[6px] group relative flex flex-col justify-end h-full"
        >
          <div
            className="bg-forest/80 group-hover:bg-saffron rounded-t transition-colors"
            style={{ height: `${Math.max(4, (d.revenue / max) * 100)}%` }}
          />
          <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 bg-forest text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
            {d._id}: {formatRWF(d.revenue)} · {d.orders} order{d.orders > 1 ? "s" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { data: dash, isLoading } = useAdminDashboardQuery(undefined, { pollingInterval: 60_000 });
  const { data: ov } = useAdminOverviewQuery(undefined, { pollingInterval: 60_000 });
  const stats = (dash?.stats ?? {}) as Record<string, number>;
  const todo = ATTENTION.map((a) => ({ ...a, n: ov?.attention?.[a.key] ?? 0 })).filter(
    (a) => a.n > 0,
  );

  if (isLoading) return <Spinner />;
  return (
    <>
      <Helmet>
        <title>Overview — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Overview"
        subtitle="What needs you today, and how the marketplace is doing."
      />

      <section className="mb-6">
        <h2 className="font-semibold text-forest mb-2 flex items-center gap-2">
          <AlertTriangle size={16} className="text-saffron" /> Needs your attention
        </h2>
        {todo.length === 0 ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-4 py-3 text-sm">
            All clear — nothing is waiting on you right now. 🎉
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {todo.map((a) => (
              <Link
                key={a.key}
                to={a.to}
                className="flex items-center justify-between bg-white rounded-2xl shadow-card px-4 py-3 hover:shadow-md transition"
              >
                <span className="text-sm">
                  <span className="font-mono font-bold text-vermillion text-lg mr-2">{a.n}</span>
                  {a.text}
                </span>
                <ArrowRight size={16} className="text-slate/40" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Gross sales (paid)"
          value={formatRWF(stats.gmv ?? 0)}
          to="/admin/orders?queue=all"
        />
        <StatCard
          label={`Commission earned (${Math.round((stats.commissionRate ?? 0.1) * 1000) / 10}%)`}
          value={formatRWF(stats.commissionEarned ?? 0)}
          tone="good"
          to="/admin/earnings"
        />
        <StatCard
          label="Payouts waiting"
          value={formatRWF(stats.pendingPayoutAmount ?? 0)}
          hint={`${stats.pendingPayoutCount ?? 0} request(s)`}
          to="/admin/payouts"
        />
        <StatCard
          label="Open orders"
          value={stats.pendingOrders ?? 0}
          to="/admin/orders?queue=active"
        />
        <StatCard
          label="Users"
          value={(stats.totalUsers ?? 0).toLocaleString()}
          to="/admin/users"
        />
        <StatCard label="Sellers" value={stats.totalSellers ?? 0} to="/admin/sellers" />
        <StatCard
          label="Active products"
          value={(stats.totalProducts ?? 0).toLocaleString()}
          to="/admin/products"
        />
        <StatCard
          label="Referrals rewarded"
          value={stats.referralsRewarded ?? 0}
          to="/admin/referrals"
        />
      </section>

      <section className="bg-white rounded-2xl shadow-card p-5 mb-6">
        <h2 className="font-semibold text-forest mb-3">Paid sales — last 30 days</h2>
        <RevenueBars daily={ov?.daily ?? []} />
      </section>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <section className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-forest mb-3">Top sellers (30 days)</h2>
          {(ov?.topSellers ?? []).length === 0 ? (
            <p className="text-sm text-slate/50">No delivered sales yet.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {ov!.topSellers.map((s, i) => (
                <li key={s.sellerId} className="flex justify-between gap-3">
                  <span>
                    {i + 1}. {s.storeName}
                  </span>
                  <span className="font-mono text-xs">
                    {formatRWF(s.sales)}{" "}
                    <span className="text-slate/40">· fee {formatRWF(s.commission)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-forest mb-3">Best-selling products</h2>
          {(ov?.topProducts ?? []).length === 0 ? (
            <p className="text-sm text-slate/50">No sales yet.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {ov!.topProducts.map((p, i) => (
                <li key={p._id} className="flex justify-between gap-3">
                  <span className="truncate">
                    {i + 1}. {p.title}
                  </span>
                  <span className="font-mono text-xs shrink-0">{p.salesCount} sold</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-forest">Latest orders</h2>
          <Link to="/admin/orders?queue=all" className="text-xs text-forest underline">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-forest/5 text-sm">
          {(dash?.recentOrders ?? []).slice(0, 8).map((o) => (
            <li key={o._id}>
              <Link
                to={`/admin/orders?queue=all&order=${o._id}`}
                className="flex items-center gap-3 py-2 hover:bg-forest/[0.03]"
              >
                <span className="font-mono font-bold text-forest">{o.orderNumber}</span>
                <Badge tone={orderStatusTone(o.status)}>{label(o.status)}</Badge>
                <span className="ml-auto font-mono text-saffron font-bold">
                  {formatRWF(o.total)}
                </span>
                <span className="text-xs text-slate/40 hidden sm:block">
                  {fmtDate(o.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
