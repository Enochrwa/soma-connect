import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trash2 } from "lucide-react";
import {
  useAdminProductsQuery,
  useAdminToggleProductMutation,
  useDeleteProductMutation,
} from "../../app/api";
import { formatRWF } from "../../utils/format";
import {
  Badge,
  Chip,
  ConfirmModal,
  Empty,
  PageHeader,
  Pagination,
  SearchInput,
  Spinner,
  Table,
} from "./ui";
import { errMsg, useDebounced, useToast } from "./helpers";

const FILTERS = [
  { key: "", label: "All" },
  { key: "active", label: "Visible" },
  { key: "hidden", label: "Hidden" },
  { key: "low_stock", label: "Low stock (≤5)" },
];

export default function ProductsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? 1);
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data, isLoading } = useAdminProductsQuery({
    q: q || undefined,
    status: status || undefined,
    page,
  });
  const [toggle] = useAdminToggleProductMutation();
  const [del, { isLoading: deleting }] = useDeleteProductMutation();
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
        <title>Products — Admin · OneAfricaShop</title>
      </Helmet>
      <PageHeader
        title="Products"
        subtitle="Hide listings that break the rules, spot low stock, or remove products entirely."
      />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {FILTERS.map((f) => (
          <Chip key={f.key} active={status === f.key} onClick={() => setParam("status", f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by product title…" />
      </div>
      {isLoading ? (
        <Spinner />
      ) : (data?.products ?? []).length === 0 ? (
        <Empty>No products match.</Empty>
      ) : (
        <Table head={["Product", "Store", "Price", "Stock", "Sold", "Status", ""]}>
          {data!.products.map((p) => {
            const store = typeof p.sellerId === "object" ? p.sellerId.storeName : "—";
            return (
              <tr key={p._id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images?.[0]}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-forest/5 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-forest line-clamp-1 max-w-[220px]">
                        {p.title}
                      </div>
                      <div className="text-xs text-slate/40 capitalize">{p.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate/70">{store}</td>
                <td className="px-4 py-3 font-mono text-saffron font-bold text-xs whitespace-nowrap">
                  {formatRWF(p.price)}
                </td>
                <td className="px-4 py-3">
                  {p.stock <= 5 ? (
                    <Badge tone={p.stock === 0 ? "red" : "amber"}>{p.stock}</Badge>
                  ) : (
                    p.stock
                  )}
                </td>
                <td className="px-4 py-3 text-slate/60">{p.salesCount ?? 0}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={async () => {
                      try {
                        await toggle(p._id).unwrap();
                        toast.success(p.isActive ? "Product hidden" : "Product visible");
                      } catch (e) {
                        toast.error(errMsg(e));
                      }
                    }}
                    title="Click to toggle visibility"
                  >
                    <Badge tone={p.isActive ? "green" : "slate"}>
                      {p.isActive ? "visible" : "hidden"}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDeleteId(p._id)}
                    className="text-vermillion/60 hover:text-vermillion"
                    aria-label="Delete product"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total}
        onPage={(p) => setParam("page", String(p))}
      />
      <ConfirmModal
        open={Boolean(deleteId)}
        title="Delete this product?"
        body="This permanently removes the listing. Past orders keep their details. To just take it off sale, hide it instead."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await del(deleteId!).unwrap();
            toast.success("Product deleted");
            setDeleteId(null);
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </>
  );
}
