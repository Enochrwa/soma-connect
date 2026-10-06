import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAdminEarningsQuery } from "../../app/api";
import { formatRWF } from "../../utils/format";
import { Badge, Chip, Empty, PageHeader, Spinner, StatCard, Table } from "./ui";
import { fmtDate } from "./helpers";

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "All time" },
];

export default function EarningsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAdminEarningsQuery({ days });
  const rate = Math.round((data?.defaultRate ?? 0.1) * 1000) / 10;

  return (
    <>
      <Helmet>
        <title>Earnings & commission — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Earnings & commission"
        subtitle={`Commission is ${rate}% of item sales (delivery fees excluded), recorded when an order is delivered. This is what the platform earns and what it owes sellers.`}
      />
      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <Chip key={p.days} active={days === p.days} onClick={() => setDays(p.days)}>
            {p.label}
          </Chip>
        ))}
      </div>

      {isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <StatCard
              label="Delivered sales"
              value={formatRWF(data.totals.sales)}
              hint={`${data.totals.orders} seller-orders`}
            />
            <StatCard
              label="Platform commission"
              value={formatRWF(data.totals.commission)}
              tone="good"
            />
            <StatCard label="Sellers earned" value={formatRWF(data.totals.net)} />
            <StatCard
              label="Refund clawbacks"
              value={formatRWF(data.clawbacks.amount)}
              hint={`${data.clawbacks.count} to recover from next payouts`}
              tone={data.clawbacks.count ? "alert" : "forest"}
            />
          </section>

          <h2 className="font-semibold text-forest mt-6 mb-2">What we owe sellers right now</h2>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Withdrawable"
              value={formatRWF(data.owed.available)}
              hint="Sellers can request this now"
            />
            <StatCard
              label="Clearing"
              value={formatRWF(data.owed.clearing)}
              hint="In the post-delivery hold or on dispute"
            />
            <StatCard
              label="In payout"
              value={formatRWF(data.owed.requested)}
              hint="Requested — pay these in Payouts"
            />
            <StatCard label="Already paid out" value={formatRWF(data.owed.paid)} />
          </section>

          <h2 className="font-semibold text-forest mb-2">By seller</h2>
          {data.sellers.length === 0 ? (
            <Empty>No delivered sales in this period.</Empty>
          ) : (
            <Table
              head={[
                "Store",
                "Orders",
                "Sales",
                "Commission",
                "Seller earned",
                "Withdrawable",
                "Clearing",
                "In payout",
                "Paid",
              ]}
            >
              {data.sellers.map((s) => (
                <tr key={s.sellerId}>
                  <td className="px-4 py-3 font-medium text-forest">
                    {s.storeName}
                    {s.commissionRate !== null && (
                      <div className="text-xs text-saffron-dark">
                        custom {s.commissionRate * 100}%
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.orders}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatRWF(s.sales)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-saffron-dark">
                    {formatRWF(s.commission)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{formatRWF(s.net)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-green-700">
                    {formatRWF(s.available)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatRWF(s.clearing)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatRWF(s.requested)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate/50">{formatRWF(s.paid)}</td>
                </tr>
              ))}
            </Table>
          )}

          <h2 className="font-semibold text-forest mt-6 mb-2">Latest ledger entries</h2>
          <Table
            head={["When", "Order", "Store", "Sales", "Commission", "Seller earned", "Status"]}
          >
            {data.recent.map((e) => (
              <tr key={e._id}>
                <td className="px-4 py-3 text-xs text-slate/50 whitespace-nowrap">
                  {fmtDate(e.createdAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    to={`/admin/orders?queue=all&q=${e.orderNumber}`}
                    className="text-forest underline"
                  >
                    {e.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {typeof e.sellerId === "object" ? e.sellerId.storeName : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{formatRWF(e.commissionBase)}</td>
                <td className="px-4 py-3 font-mono text-xs text-saffron-dark">
                  {formatRWF(e.commission)}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold">{formatRWF(e.net)}</td>
                <td className="px-4 py-3">
                  {e.clawbackRequired ? (
                    <Badge tone="red">refunded — recover</Badge>
                  ) : (
                    <Badge
                      tone={
                        e.status === "paid"
                          ? "slate"
                          : e.status === "reversed"
                            ? "red"
                            : e.status === "requested"
                              ? "blue"
                              : "green"
                      }
                    >
                      {e.status}
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
