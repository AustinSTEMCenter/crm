import type { ReactNode } from "react";
import { daysFromToday, relativeDay } from "@/lib/format";
import { useDB } from "@/lib/store";
import { STATUSES, GROUPS, type Group, type Source, type Status } from "@/lib/types";

export const inputCls =
  "h-9 rounded-md border border-stone-300 bg-white px-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
export const btnPrimary =
  "inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50";
export const btnSecondary =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 text-sm font-medium text-ink hover:bg-stone-50";
export const cardCls = "rounded-xl border border-stone-200 bg-white";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  New: "bg-brand-soft text-brand-dark",
  Exploring: "bg-violet-50 text-violet-800",
  Pending: "bg-amber-50 text-amber-800",
  Active: "bg-emerald-50 text-emerald-800",
  "Not Yet": "bg-stone-100 text-stone-600",
  "Needs Renewal": "bg-orange-50 text-orange-800",
  Closed: "bg-stone-100 text-stone-400",
};
const STATUS_DOT: Record<Status, string> = {
  New: "bg-brand",
  Exploring: "bg-violet-500",
  Pending: "bg-amber-500",
  Active: "bg-emerald-500",
  "Not Yet": "bg-stone-400",
  "Needs Renewal": "bg-orange-500",
  Closed: "bg-stone-300",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {status}
    </span>
  );
}

export { STATUS_DOT };

const SOURCE_LABEL: Record<Source, [string, string]> = {
  inquiry: ["Inquiry", "border-brand/30 text-brand"],
  donor: ["Donor", "border-gold/60 bg-gold/10 text-amber-800"],
  staff: ["Staff entry", "border-stone-300 text-stone-500"],
};

export function SourceBadges({ sources }: { sources: Source[] }) {
  return (
    <span className="inline-flex gap-1">
      {sources.map((s) => (
        <span
          key={s}
          className={`whitespace-nowrap rounded border px-1.5 text-[11px] font-medium leading-5 ${SOURCE_LABEL[s][1]}`}
        >
          {SOURCE_LABEL[s][0]}
        </span>
      ))}
    </span>
  );
}

const AVATAR_COLORS = ["bg-brand", "bg-accent", "bg-[#8e5283]", "bg-[#b8901f]", "bg-[#2f8f6b]", "bg-ink"];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const hash = [...name].reduce((h, c) => h + c.charCodeAt(0), 0);
  const sizing = { sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-14 text-lg" }[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizing} ${AVATAR_COLORS[hash % AVATAR_COLORS.length]}`}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

export function FollowUp({ date }: { date: string | null }) {
  if (!date) return <span className="text-stone-400">—</span>;
  const n = daysFromToday(date);
  const tone = n < 0 ? "text-accent font-medium" : n === 0 ? "text-amber-700 font-medium" : "text-stone-600";
  return <span className={`whitespace-nowrap ${tone}`}>{relativeDay(date)}</span>;
}

export function StatusSelect({
  value,
  onChange,
  className = inputCls,
}: {
  value: Status;
  onChange: (s: Status) => void;
  className?: string;
}) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value as Status)}>
      {STATUSES.map((s) => (
        <option key={s}>{s}</option>
      ))}
    </select>
  );
}

export function GroupSelect({
  value,
  onChange,
  className = inputCls,
}: {
  value: Group;
  onChange: (g: Group) => void;
  className?: string;
}) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value as Group)}>
      {GROUPS.map((g) => (
        <option key={g}>{g}</option>
      ))}
    </select>
  );
}

export function OwnerSelect({
  value,
  onChange,
  className = inputCls,
}: {
  value: string | null;
  onChange: (o: string | null) => void;
  className?: string;
}) {
  const { team } = useDB();
  // Keep a current owner who is no longer on the team list selectable.
  const options = value && !team.includes(value) ? [...team, value] : team;
  return (
    <select className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Unassigned</option>
      {options.map((t) => (
        <option key={t}>{t}</option>
      ))}
    </select>
  );
}

export function StatTile({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "alert";
}) {
  return (
    <div className={`${cardCls} p-4`}>
      <div className="text-sm text-stone-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${tone === "alert" ? "text-accent" : "text-ink"}`}>
        {value}
      </div>
      {detail && <div className="mt-1 text-xs text-stone-500">{detail}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-stone-400">{children}</div>;
}
