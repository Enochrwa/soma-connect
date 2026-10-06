import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAdminActivityQuery } from "../../app/api";
import { Badge, Empty, PageHeader, Pagination, SearchInput, Spinner, Table } from "./ui";
import { fmtDate, useDebounced } from "./helpers";

const TYPES = ["", "order", "user", "seller", "product", "payout", "referral"];

export default function ActivityPage() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminActivityQuery({
    q: q || undefined,
    type: type || undefined,
    page,
  });

  return (
    <>
      <Helmet>
        <title>Activity log — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Activity log"
        subtitle="Every sensitive action taken in the admin console — who did it, when, and to what."
      />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search actions, people, order numbers…"
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="bg-white border border-forest/15 rounded-xl px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t ? t[0].toUpperCase() + t.slice(1) : "Everything"}
            </option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (data?.actions ?? []).length === 0 ? (
        <Empty>No activity recorded yet.</Empty>
      ) : (
        <Table head={["When", "Admin", "What happened", "Type"]}>
          {data!.actions.map((a) => (
            <tr key={a._id}>
              <td className="px-4 py-3 text-xs text-slate/50 whitespace-nowrap">
                {fmtDate(a.createdAt)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{a.adminName ?? "—"}</td>
              <td className="px-4 py-3">{a.summary}</td>
              <td className="px-4 py-3">
                {a.targetType && <Badge tone="forest">{a.targetType}</Badge>}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} pages={data?.pages ?? 1} total={data?.total} onPage={setPage} />
    </>
  );
}
