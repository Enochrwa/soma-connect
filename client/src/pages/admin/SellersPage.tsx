import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ExternalLink } from "lucide-react";
import {
  useAdminApproveSellerMutation,
  useAdminReactivateSellerMutation,
  useAdminSetCommissionMutation,
  useAdminSellersQuery,
  useAdminSuspendSellerMutation,
  useAdminUpdateSellerTierMutation,
} from "../../app/api";
import type { Seller } from "../../types";
import { formatRWF } from "../../utils/format";
import {
  Badge,
  Chip,
  ConfirmModal,
  Empty,
  PageHeader,
  Pagination,
  ReasonModal,
  SearchInput,
  Spinner,
} from "./ui";
import { errMsg, fmtDay, useDebounced, useToast } from "./helpers";

type Row = Seller & {
  userId: unknown;
  documents?: { nidUrl?: string; licenseUrl?: string };
};
const owner = (s: Row) =>
  (s.userId ?? {}) as { phone?: string; email?: string; profile?: { name?: string } };

const FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending approval" },
  { key: "approved", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" },
];

function statusBadge(s: Row) {
  if (s.approvalStatus === "pending") return <Badge tone="amber">pending</Badge>;
  if (s.approvalStatus === "rejected") return <Badge tone="red">rejected</Badge>;
  if (!s.isActive) return <Badge tone="red">suspended</Badge>;
  return <Badge tone="green">active</Badge>;
}

export default function SellersPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? 1);
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data, isLoading } = useAdminSellersQuery({
    status: status || undefined,
    q: q || undefined,
    page,
  });
  const { data: pending } = useAdminSellersQuery({ status: "pending" });
  const [approve, { isLoading: approving }] = useAdminApproveSellerMutation();
  const [suspend, { isLoading: suspending }] = useAdminSuspendSellerMutation();
  const [reactivate] = useAdminReactivateSellerMutation();
  const [setTier] = useAdminUpdateSellerTierMutation();
  const [setCommission, { isLoading: savingRate }] = useAdminSetCommissionMutation();
  const [modal, setModal] = useState<null | {
    kind: "approve" | "reject" | "suspend" | "commission";
    seller: Row;
  }>(null);
  const [rate, setRate] = useState("");

  const setFilter = (k: string) => {
    const n = new URLSearchParams(params);
    if (k) n.set("status", k);
    else n.delete("status");
    n.delete("page");
    setParams(n, { replace: true });
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      setModal(null);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const sellers = (data?.sellers ?? []) as Row[];

  return (
    <>
      <Helmet>
        <title>Sellers — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Sellers"
        subtitle="Approve new stores, suspend problem ones, set verification tiers and custom commission rates."
      />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            active={status === f.key}
            count={f.key === "pending" ? pending?.total : undefined}
            alert={f.key === "pending"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Chip>
        ))}
      </div>
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by store name…" />
      </div>

      {isLoading ? (
        <Spinner />
      ) : sellers.length === 0 ? (
        <Empty>No sellers match.</Empty>
      ) : (
        <div className="space-y-3">
          {sellers.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl shadow-card p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-forest text-saffron font-bold flex items-center justify-center shrink-0 text-lg">
                  {s.storeName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-forest">{s.storeName}</span>
                    {statusBadge(s)}
                    <Badge tone="forest">{s.verificationTier}</Badge>
                  </div>
                  <p className="text-xs text-slate/50 mt-0.5 capitalize">
                    {s.accountType} · {s.location?.sector ?? "—"} · joined {fmtDay(s.createdAt)}
                  </p>
                  <p className="text-xs text-slate/60 mt-1">
                    {owner(s).profile?.name ?? "—"} ·{" "}
                    <span className="font-mono">{owner(s).phone}</span>
                    {owner(s).email && ` · ${owner(s).email}`}
                  </p>
                  <p className="text-xs text-slate/60 mt-1">
                    Sales {formatRWF(s.totalSales)} · ★ {s.rating?.toFixed?.(1) ?? "—"} (
                    {s.ratingCount}) · commission{" "}
                    <b>
                      {s.commissionRate !== undefined
                        ? `${s.commissionRate * 100}% (custom)`
                        : "platform default"}
                    </b>
                    {s.payoutPhone && (
                      <>
                        {" "}
                        · payout to <span className="font-mono">{s.payoutPhone}</span>
                      </>
                    )}
                  </p>
                  {s.description && (
                    <p className="text-xs text-slate/50 mt-1 line-clamp-2">{s.description}</p>
                  )}
                  {s.approvalNote && (
                    <p className="text-xs text-vermillion mt-1">Note: {s.approvalNote}</p>
                  )}
                  <div className="flex gap-3 mt-1.5">
                    {s.documents?.nidUrl && (
                      <a
                        href={s.documents.nidUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-forest underline inline-flex items-center gap-1"
                      >
                        National ID <ExternalLink size={11} />
                      </a>
                    )}
                    {s.documents?.licenseUrl && (
                      <a
                        href={s.documents.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-forest underline inline-flex items-center gap-1"
                      >
                        Business license <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {s.approvalStatus === "pending" ? (
                    <>
                      <button
                        onClick={() => setModal({ kind: "approve", seller: s })}
                        className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setModal({ kind: "reject", seller: s })}
                        className="text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg"
                      >
                        Reject
                      </button>
                    </>
                  ) : s.approvalStatus === "rejected" ? (
                    <button
                      onClick={() => setModal({ kind: "approve", seller: s })}
                      className="text-sm border border-forest/20 text-forest px-3 py-1.5 rounded-lg"
                    >
                      Approve instead
                    </button>
                  ) : (
                    <>
                      <select
                        value={s.verificationTier}
                        onChange={(e) =>
                          void run(
                            () => setTier({ id: s._id, tier: e.target.value }).unwrap(),
                            "Tier updated",
                          )
                        }
                        className="text-sm border border-forest/20 rounded-lg px-2 py-1.5 bg-white"
                        aria-label="Verification tier"
                      >
                        <option value="basic">Basic</option>
                        <option value="verified">Verified</option>
                        <option value="premium">Premium</option>
                      </select>
                      <button
                        onClick={() => {
                          setRate(
                            s.commissionRate !== undefined ? String(s.commissionRate * 100) : "",
                          );
                          setModal({ kind: "commission", seller: s });
                        }}
                        className="text-sm border border-forest/20 text-forest px-3 py-1.5 rounded-lg"
                      >
                        Commission
                      </button>
                      {s.isActive ? (
                        <button
                          onClick={() => setModal({ kind: "suspend", seller: s })}
                          className="text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            void run(() => reactivate(s._id).unwrap(), `${s.storeName} reactivated`)
                          }
                          className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg"
                        >
                          Reactivate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        page={data?.page ?? page}
        pages={data?.pages ?? 1}
        total={data?.total}
        onPage={(p) => {
          const n = new URLSearchParams(params);
          n.set("page", String(p));
          setParams(n, { replace: true });
        }}
      />

      <ReasonModal
        open={modal?.kind === "approve"}
        title={`Approve ${modal?.seller.storeName ?? ""}?`}
        description="They'll be able to list products and receive orders straight away."
        placeholder="Optional welcome note"
        optional
        confirmLabel="Approve"
        busy={approving}
        onClose={() => setModal(null)}
        onConfirm={(note) =>
          void run(
            () =>
              approve({
                id: modal!.seller._id,
                status: "approved",
                note: note || undefined,
              }).unwrap(),
            "Seller approved",
          )
        }
      />
      <ReasonModal
        open={modal?.kind === "reject"}
        title={`Reject ${modal?.seller.storeName ?? ""}?`}
        description="The seller sees this note, so say what they need to fix."
        placeholder="e.g. National ID photo is unreadable"
        confirmLabel="Reject application"
        danger
        busy={approving}
        onClose={() => setModal(null)}
        onConfirm={(note) =>
          void run(
            () => approve({ id: modal!.seller._id, status: "rejected", note }).unwrap(),
            "Application rejected",
          )
        }
      />
      <ConfirmModal
        open={modal?.kind === "suspend"}
        title={`Suspend ${modal?.seller.storeName ?? ""}?`}
        body="Their products stop being sold and they can't receive new orders. You can reactivate them any time."
        confirmLabel="Suspend store"
        danger
        busy={suspending}
        onClose={() => setModal(null)}
        onConfirm={() => void run(() => suspend(modal!.seller._id).unwrap(), "Store suspended")}
      />
      <ReasonModal
        open={modal?.kind === "commission"}
        title={`Commission for ${modal?.seller.storeName ?? ""}`}
        description="Percentage taken from this seller's item sales (0–50). Leave empty to use the platform default. Applies to orders delivered from now on."
        optional
        busy={savingRate}
        extra={
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="e.g. 8   (empty = platform default)"
            className="w-full border border-forest/20 rounded-xl px-3 py-2 font-mono text-sm"
          />
        }
        placeholder="Why? (optional)"
        confirmLabel="Save rate"
        onClose={() => setModal(null)}
        onConfirm={() => {
          const trimmed = rate.trim();
          const pct = trimmed === "" ? null : Number(trimmed);
          if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 50))
            return toast.error("Enter a number from 0 to 50.");
          void run(
            () =>
              setCommission({
                id: modal!.seller._id,
                rate: pct === null ? null : pct / 100,
              }).unwrap(),
            "Commission updated",
          );
        }}
      />
    </>
  );
}
