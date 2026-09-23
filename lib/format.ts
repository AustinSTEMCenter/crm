const DAY = 86_400_000;

export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const today = () => isoDate(new Date());

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Whole days from today (negative = past). Timestamps are compared by local calendar day. */
export function daysFromToday(value: string): number {
  const day = value.length > 10 ? isoDate(new Date(value)) : value;
  return Math.round((parseDate(day).getTime() - parseDate(today()).getTime()) / DAY);
}

export function fmtDate(value: string, withYear = true): string {
  const d = value.length > 10 ? new Date(value) : parseDate(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function relativeDay(iso: string): string {
  const n = daysFromToday(iso);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n}d overdue`;
  if (n < 7) return `In ${n} days`;
  return fmtDate(iso, parseDate(iso).getFullYear() !== new Date().getFullYear());
}

export function timeAgo(ts: string): string {
  const t = ts.length > 10 ? new Date(ts) : parseDate(ts);
  const mins = Math.round((Date.now() - t.getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(ts);
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const money = (n: number) => usd.format(n);
export const moneyCompact = (n: number) => (n >= 10_000 ? usdCompact.format(n) : usd.format(n));
