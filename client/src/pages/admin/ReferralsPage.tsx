import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAdminReferralsQuery, useAdminRejectReferralMutation } from "../../app/api";
import { Badge, Empty, PageHeader, ReasonModal, Spinner, StatCard, Table } from "./ui";
import { errMsg, fmtDate, useToast } from "./helpers";

export default function ReferralsPage() {
  const toast = useToast();
  const { data, isLoading } = useAdminReferralsQuery();
  const [reject, { isLoading: rejecting }] = useAdminRejectReferralMutation();
  const [rejectId, setRejectId] = useState<string | null>(null);

  if (isLoading || !data) return <Spinner />;
  const r = data.rules;
  const who = (u?: { profile?: { name?: string }; phone?: string }) =>
    u?.profile?.name ?? u?.phone ?? "—";

  return (
    <>
      <Helmet>
        <title>Referrals — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Referrals"
        subtitle={`Referrer gets ${r.referrerBonusPoints} points and the friend ${r.refereeBonusPoints} when the friend's first order (min. ${r.minQualifyingOrder.toLocaleString()} RWF) is delivered. Max ${r.maxRewards} rewards per referrer. Change these with environment variables.`}
      />
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Signed up with a code" value={data.stats.invited} />
        <StatCard label="Waiting for first delivery" value={data.stats.pending} />
        <StatCard label="Rewarded" value={data.stats.rewarded} tone="good" />
        <StatCard label="Rejected" value={data.stats.rejected} />
        <StatCard label="Points given out" value={data.stats.pointsPaid.toLocaleString()} />
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="bg-white rounded-2xl shadow-card p-5 lg:col-span-1 h-fit">
          <h2 className="font-semibold text-forest mb-3">Top referrers</h2>
          {data.topReferrers.length === 0 ? (
            <p className="text-sm text-slate/50">No rewarded referrals yet.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {data.topReferrers.map((t, i) => (
                <li key={t.userId} className="flex justify-between gap-2">
                  <span>
                    {i + 1}. {t.name}
                  </span>
                  <span className="font-mono text-xs">
                    {t.rewarded} · {t.points} pts
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="font-semibold text-forest mb-2">Recent referrals</h2>
          {data.recent.length === 0 ? (
            <Empty>No one has signed up with a referral code yet.</Empty>
          ) : (
            <Table head={["Referrer → Friend", "Joined", "Status", "Order", ""]}>
              {data.recent.map((x) => (
                <tr key={x._id}>
                  <td className="px-4 py-3">
                    <div>{who(x.referrerId)}</div>
                    <div className="text-xs text-slate/50">→ {who(x.refereeId)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate/50 whitespace-nowrap">
                    {fmtDate(x.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        x.status === "rewarded"
                          ? "green"
                          : x.status === "rejected"
                            ? "red"
                            : "amber"
                      }
                    >
                      {x.status}
                    </Badge>
                    {x.rejectReason && (
                      <div className="text-xs text-slate/40 mt-0.5">
                        {x.rejectReason.replace(/_/g, " ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {x.qualifyingOrderId?.orderNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {x.status === "pending" && (
                      <button
                        onClick={() => setRejectId(x._id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Reject (fraud)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      </div>

      <ReasonModal
        open={Boolean(rejectId)}
        title="Reject this referral?"
        description="Use for fake accounts or abuse. No points will be paid for it."
        placeholder="Reason (kept in the activity log)"
        confirmLabel="Reject referral"
        danger
        busy={rejecting}
        onClose={() => setRejectId(null)}
        onConfirm={async (reason) => {
          try {
            await reject({ id: rejectId!, reason }).unwrap();
            toast.success("Referral rejected");
            setRejectId(null);
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </>
  );
}
