/**
 * Format a number as Rwandan Franc.
 * e.g. 45000 → "RWF 45,000"
 */
export function formatRWF(amount: number): string {
  return `RWF ${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Short price display without prefix for tight spaces.
 * e.g. 45000 → "45,000"
 */
export function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

/**
 * Format a date string or Date to human-readable.
 * e.g. "02 Jan 2025"
 */
export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Relative time ("2 hours ago", "just now").
 */
export function formatRelativeTime(d: string | Date): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

/**
 * HH:MM:SS countdown from a target date.
 */
export function countdown(target: string | Date): string {
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Discount percentage between original and sale price.
 */
export function discountPct(original: number, sale: number): number {
  if (!original || original <= sale) return 0;
  return Math.round(((original - sale) / original) * 100);
}

/**
 * Truncate long strings with ellipsis.
 */
export function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
