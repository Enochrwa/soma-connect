import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  useAdminAdjustPointsMutation,
  useAdminBanUserMutation,
  useAdminSetUserRoleMutation,
  useAdminUserDetailQuery,
  useAdminUsersQuery,
} from "../../app/api";
import type { AdminUserRow } from "../../types";
import { formatRWF } from "../../utils/format";
import {
  Badge,
  ConfirmModal,
  Drawer,
  Empty,
  PageHeader,
  Pagination,
  ReasonModal,
  SearchInput,
  Spinner,
  Table,
} from "./ui";
import { errMsg, fmtDay, useDebounced, useToast } from "./helpers";

const isBanned = (u: AdminUserRow) =>
  Boolean(u.lockedUntil && new Date(u.lockedUntil) > new Date());

function UserDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const toast = useToast();
  const { data, isFetching } = useAdminUserDetailQuery(id ?? "", { skip: !id });
  const [ban, { isLoading: banning }] = useAdminBanUserMutation();
  const [setRole, { isLoading: roling }] = useAdminSetUserRoleMutation();
  const [adjust, { isLoading: adjusting }] = useAdminAdjustPointsMutation();
  const [modal, setModal] = useState<null | "ban" | "unban" | "points" | "role">(null);
  const [pts, setPts] = useState("");
  const [role, setRoleVal] = useState("buyer");
  const u = data?.user;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      setModal(null);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={u?.profile?.name ?? u?.phone ?? "User"}>
      {!u ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge tone={u.role === "admin" ? "red" : u.role === "seller" ? "amber" : "forest"}>
              {u.role}
            </Badge>
            {isBanned(u) && <Badge tone="red">banned</Badge>}
            {u.flaggedForReview && <Badge tone="amber">flagged</Badge>}
            {isFetching && <Badge>refreshing…</Badge>}
          </div>
          <section className="bg-white rounded-2xl shadow-card p-4 text-sm space-y-1">
            <p className="font-mono">{u.phone}</p>
            {u.email && <p className="text-slate/60">{u.email}</p>}
            <p className="text-slate/50">Joined {fmtDay(u.createdAt)}</p>
            <p>
              Loyalty points: <b className="font-mono">{u.loyaltyPoints.toLocaleString()}</b>
              {u.tier && <span className="text-slate/50"> · {u.tier}</span>}
            </p>
            <p>
              Referral code: <span className="font-mono">{u.referralCode ?? "—"}</span>
            </p>
            {data?.referredBy && (
              <p className="text-slate/60">
                Invited by {data.referredBy.profile?.name ?? data.referredBy.phone}
              </p>
            )}
            <p className="text-slate/60">
              Invited {data?.referrals.invited ?? 0} friend(s), {data?.referrals.rewarded ?? 0}{" "}
              rewarded
            </p>
            {data?.seller && (
              <p className="text-slate/60">
                Store: {data.seller.storeName} ({data.seller.approvalStatus}
                {data.seller.isActive ? "" : ", suspended"})
              </p>
            )}
          </section>
          <section className="bg-white rounded-2xl shadow-card p-4 text-sm">
            <p className="mb-2">
              <b className="font-mono">{data?.stats.paidOrders ?? 0}</b> paid orders ·{" "}
              <b className="font-mono">{formatRWF(data?.stats.totalSpent ?? 0)}</b> spent
            </p>
            <ul className="divide-y divide-forest/5">
              {(data?.recentOrders ?? []).map((o) => (
                <li key={o._id} className="py-1.5 flex justify-between gap-2">
                  <a
                    href={`/admin/orders?queue=all&order=${o._id}`}
                    className="font-mono text-forest underline"
                  >
                    {o.orderNumber}
                  </a>
                  <span className="text-xs text-slate/50">{o.status.replace(/_/g, " ")}</span>
                  <span className="font-mono text-xs">{formatRWF(o.total)}</span>
                </li>
              ))}
            </ul>
          </section>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal("points")}
              className="text-sm px-3 py-2 rounded-xl border border-forest/20 text-forest"
            >
              Adjust points
            </button>
            <button
              onClick={() => {
                setRoleVal(u.role);
                setModal("role");
              }}
              className="text-sm px-3 py-2 rounded-xl border border-forest/20 text-forest"
            >
              Change role
            </button>
            {isBanned(u) ? (
              <button
                onClick={() => setModal("unban")}
                className="text-sm px-3 py-2 rounded-xl bg-green-600 text-white"
              >
                Unban
              </button>
            ) : (
              <button
                onClick={() => setModal("ban")}
                className="text-sm px-3 py-2 rounded-xl border border-red-200 text-red-600"
              >
                Ban user…
              </button>
            )}
          </div>

          <ReasonModal
            open={modal === "ban"}
            title="Ban this user?"
            description="They'll be signed out and unable to log in."
            placeholder="Reason (kept in the activity log)"
            confirmLabel="Ban user"
            danger
            busy={banning}
            onClose={() => setModal(null)}
            onConfirm={(reason) =>
              void run(() => ban({ id: u._id, banned: true, reason }).unwrap(), "User banned")
            }
          />
          <ConfirmModal
            open={modal === "unban"}
            title="Unban this user?"
            confirmLabel="Unban"
            busy={banning}
            onClose={() => setModal(null)}
            onConfirm={() =>
              void run(() => ban({ id: u._id, banned: false }).unwrap(), "User unbanned")
            }
          />
          <ReasonModal
            open={modal === "points"}
            title="Adjust loyalty points"
            description="Use a positive number to give points or a negative one to remove them (e.g. 200 or -50). Balance can't go below zero."
            placeholder="Reason (e.g. goodwill gesture for a late delivery)"
            extra={
              <input
                autoFocus
                value={pts}
                onChange={(e) => setPts(e.target.value)}
                placeholder="Points, e.g. 200 or -50"
                className="w-full border border-forest/20 rounded-xl px-3 py-2 font-mono text-sm"
              />
            }
            confirmLabel="Apply"
            busy={adjusting}
            onClose={() => setModal(null)}
            onConfirm={(reason) => {
              const points = Number(pts);
              if (!Number.isInteger(points) || points === 0)
                return toast.error("Enter a whole number, not zero.");
              void run(() => adjust({ id: u._id, points, reason }).unwrap(), "Points updated");
            }}
          />
          <ConfirmModal
            open={modal === "role"}
            title="Change role"
            body={
              <select
                value={role}
                onChange={(e) => setRoleVal(e.target.value)}
                className="w-full border border-forest/20 rounded-xl px-3 py-2"
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin (full access!)</option>
              </select>
            }
            confirmLabel="Change role"
            danger={role === "admin"}
            busy={roling}
            onClose={() => setModal(null)}
            onConfirm={() => void run(() => setRole({ id: u._id, role }).unwrap(), "Role updated")}
          />
        </>
      )}
    </Drawer>
  );
}

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const role = params.get("role") ?? "";
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? 1);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const q = useDebounced(search);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useAdminUsersQuery({
    q: q || undefined,
    role: role || undefined,
    status: status || undefined,
    page,
  });

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== "page") n.delete("page");
    setParams(n, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Users — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Users"
        subtitle="Search, review, ban, change roles, or adjust loyalty points."
      />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Name, phone, email or referral code…"
        />
        <select
          value={role}
          onChange={(e) => setParam("role", e.target.value)}
          className="bg-white border border-forest/15 rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="buyer">Buyers</option>
          <option value="seller">Sellers</option>
          <option value="admin">Admins</option>
        </select>
        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="bg-white border border-forest/15 rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Any status</option>
          <option value="banned">Banned</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (data?.users ?? []).length === 0 ? (
        <Empty>No users match.</Empty>
      ) : (
        <Table head={["User", "Role", "Points", "Joined", "Status"]}>
          {data!.users.map((u) => (
            <tr
              key={u._id}
              className="hover:bg-forest/[0.03] cursor-pointer"
              onClick={() => setOpenId(u._id)}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-forest">{u.profile?.name ?? "—"}</div>
                <div className="text-xs text-slate/50 font-mono">{u.phone}</div>
              </td>
              <td className="px-4 py-3 capitalize">{u.role}</td>
              <td className="px-4 py-3 font-mono">{u.loyaltyPoints.toLocaleString()}</td>
              <td className="px-4 py-3 text-xs text-slate/50">{fmtDay(u.createdAt)}</td>
              <td className="px-4 py-3">
                {isBanned(u) ? (
                  <Badge tone="red">banned</Badge>
                ) : u.flaggedForReview ? (
                  <Badge tone="amber">flagged</Badge>
                ) : (
                  <Badge tone="green">active</Badge>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination
        page={data?.page ?? 1}
        pages={data?.pages ?? 1}
        total={data?.total}
        onPage={(p) => setParam("page", String(p))}
      />
      <UserDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
