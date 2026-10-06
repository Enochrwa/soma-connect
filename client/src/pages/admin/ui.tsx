import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ToastCtx, type Tone } from "./helpers";
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, Search, X, XCircle } from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

// ── toasts ───────────────────────────────────────────────────────────────────

type Toast = { id: number; kind: "success" | "error"; text: string };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      kind === "error" ? 7000 : 4000,
    );
  }, []);
  const api = useMemo(
    () => ({ success: (t: string) => push("success", t), error: (t: string) => push("error", t) }),
    [push],
  );
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] space-y-2 w-[min(92vw,360px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-lg border ${
              t.kind === "success"
                ? "bg-white border-green-200 text-green-800"
                : "bg-white border-red-200 text-red-700"
            }`}
          >
            {t.kind === "success" ? (
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0" />
            )}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ── presentational bits ──────────────────────────────────────────────────────

export function Spinner({ className = "py-12" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Loader2 className="animate-spin text-forest" size={24} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-center text-slate/50 py-12 text-sm">{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-2xl text-forest">{title}</h1>
        {subtitle && <p className="text-sm text-slate/60 mt-0.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

const TONES: Record<Tone, string> = {
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-saffron/15 text-saffron-dark",
  blue: "bg-blue-50 text-blue-700",
  slate: "bg-slate/10 text-slate/70",
  forest: "bg-forest/10 text-forest",
};
export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label: l,
  value,
  hint,
  to,
  tone = "forest",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  to?: string;
  tone?: "forest" | "alert" | "good";
}) {
  const color =
    tone === "alert" ? "text-vermillion" : tone === "good" ? "text-green-700" : "text-forest";
  const body = (
    <div className="bg-white rounded-2xl shadow-card p-4 h-full hover:shadow-md transition">
      <p className="text-xs text-slate/50">{l}</p>
      <p className={`font-mono font-bold text-xl mt-1 ${color}`}>{value}</p>
      {hint && <p className="text-xs text-slate/40 mt-1">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function Chip({
  active,
  count,
  onClick,
  children,
  alert,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: ReactNode;
  alert?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition whitespace-nowrap ${
        active ? "bg-forest text-saffron" : "bg-white shadow-card text-slate/70 hover:bg-forest/5"
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`text-xs font-bold px-1.5 rounded-full ${
            active
              ? "bg-white/20"
              : alert && count > 0
                ? "bg-vermillion text-white"
                : "bg-slate/10 text-slate/60"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-80">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-forest/15 rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate/40 hover:text-slate"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total?: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1 && total === undefined) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate/60">
      <span>{total !== undefined ? `${total.toLocaleString()} total` : ""}</span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg bg-white shadow-card disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          Page {page} of {Math.max(1, pages)}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg bg-white shadow-card disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative bg-cream w-full max-w-xl h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b border-forest/10 px-5 py-3 flex items-center justify-between">
          <div className="font-display text-lg text-forest">{title}</div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-forest/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </aside>
    </div>
  );
}

/** A modal that asks for a reason (replaces window.prompt for rejections / cancellations). */
export function ReasonModal({
  open,
  title,
  description,
  placeholder = "Reason",
  defaultValue = "",
  confirmLabel = "Confirm",
  danger,
  optional,
  busy,
  extra,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  extra?: ReactNode;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  danger?: boolean;
  optional?: boolean;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(defaultValue);
  useEffect(() => {
    if (open) setText(defaultValue);
  }, [open, defaultValue]);
  if (!open) return null;
  const valid = optional || text.trim().length >= 2;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
        <h3 className="font-display text-lg text-forest">{title}</h3>
        {description && <p className="text-sm text-slate/60 mt-1">{description}</p>}
        {extra && <div className="mt-3">{extra}</div>}
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={200}
          className="w-full mt-3 border border-forest/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-forest/15"
          >
            Cancel
          </button>
          <button
            disabled={!valid || busy}
            onClick={() => onConfirm(text.trim())}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${
              danger ? "bg-vermillion" : "bg-forest"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Simple yes/no confirmation. */
export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
        <h3 className="font-display text-lg text-forest">{title}</h3>
        {body && <div className="text-sm text-slate/70 mt-2">{body}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-forest/15"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${
              danger ? "bg-vermillion" : "bg-forest"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-forest/5">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold text-slate/60 uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-forest/5">{children}</tbody>
      </table>
    </div>
  );
}
