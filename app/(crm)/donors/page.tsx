"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BulkBar, SelectCell, useSelection } from "@/components/bulk";
import { ImportDialog } from "@/components/dialogs";
import { cardCls, Empty, FollowUp, inputCls, PageHeader, SourceBadges, StatTile, StatusPill } from "@/components/ui";
import { addDays, fmtDate, money, moneyCompact, today } from "@/lib/format";
import { fullName, isDonor, lastGift, lifetimeGiving, matches } from "@/lib/people";
import { useDB } from "@/lib/store";

const SORTS = {
  "Lifetime giving": "lifetime",
  "Most recent gift": "recent",
  "Name": "name",
} as const;
type Sort = (typeof SORTS)[keyof typeof SORTS];

export default function DonorsPage() {
  const router = useRouter();
  const { people } = useDB();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("lifetime");
  const [lapsedOnly, setLapsedOnly] = useState(false);
  const [campaign, setCampaign] = useState("");
  const selection = useSelection();

  const donors = people.filter(isDonor);
  const yearAgo = addDays(today(), -365);
  const allGifts = donors.flatMap((p) => p.gifts);
  const total = allGifts.reduce((s, g) => s + g.amount, 0);
  const lastYear = allGifts.filter((g) => g.date >= yearAgo);
  const isLapsed = (p: (typeof donors)[number]) => (lastGift(p)?.date ?? "") < yearAgo;
  const lapsed = donors.filter(isLapsed);
  const campaigns = [...new Set(allGifts.map((g) => g.campaign))].sort();

  const rows = donors
    .filter((p) => matches(p, query))
    .filter((p) => !lapsedOnly || isLapsed(p))
    .filter((p) => !campaign || p.gifts.some((g) => g.campaign === campaign))
    .sort((a, b) => {
      if (sort === "name") return fullName(a).localeCompare(fullName(b));
      if (sort === "recent") return (lastGift(b)?.date ?? "").localeCompare(lastGift(a)?.date ?? "");
      return lifetimeGiving(b) - lifetimeGiving(a);
    });

  return (
    <>
      <PageHeader
        title="Donors"
        subtitle="Everyone who has given to ASC, with their giving history."
        actions={<ImportDialog kind="donors" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Raised, last 12 months" value={moneyCompact(lastYear.reduce((s, g) => s + g.amount, 0))} detail={`${lastYear.length} gifts`} />
        <StatTile label="Raised, all time" value={moneyCompact(total)} detail={`${allGifts.length} gifts`} />
        <StatTile label="Donors" value={String(donors.length)} detail={`Average gift ${money(total / Math.max(allGifts.length, 1))}`} />
        <StatTile label="Lapsed donors" value={String(lapsed.length)} detail="No gift in 12+ months" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className={`${inputCls} w-64`}
          placeholder="Search donors…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={inputCls} value={campaign} onChange={(e) => setCampaign(e.target.value)}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          {Object.entries(SORTS).map(([label, value]) => (
            <option key={value} value={value}>
              Sort: {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={lapsedOnly} onChange={(e) => setLapsedOnly(e.target.checked)} />
          Lapsed only
        </label>
        <span className="ml-auto text-sm text-stone-500">{rows.length} donors</span>
      </div>

      <BulkBar people={people.filter((p) => selection.selected.has(p.id))} onClear={selection.clear} />
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
            <tr>
              <th className="w-10 py-2.5 pl-4">
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  aria-label="Select all"
                  checked={rows.length > 0 && rows.every((p) => selection.selected.has(p.id))}
                  onChange={() => selection.toggleAll(rows.map((p) => p.id))}
                />
              </th>
              <th className="px-4 py-2.5 font-medium">Donor</th>
              <th className="px-4 py-2.5 text-right font-medium">Lifetime</th>
              <th className="px-4 py-2.5 text-right font-medium">Gifts</th>
              <th className="px-4 py-2.5 font-medium">Last gift</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Owner</th>
              <th className="px-4 py-2.5 font-medium">Follow up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((p) => {
              const last = lastGift(p)!;
              return (
                <tr key={p.id} onClick={() => router.push(`/people/${p.id}`)} className="cursor-pointer hover:bg-stone-50">
                  <SelectCell
                    checked={selection.selected.has(p.id)}
                    onChange={() => selection.toggle(p.id)}
                    label={`Select ${fullName(p)}`}
                  />
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 font-medium">
                      {p.org || fullName(p)}
                      {p.sources.length > 1 && <SourceBadges sources={p.sources.filter((s) => s !== "donor")} />}
                    </div>
                    <div className="text-xs text-stone-500">{p.org ? fullName(p) : p.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{money(lifetimeGiving(p))}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{p.gifts.length}</td>
                  <td className="px-4 py-2.5">
                    <div className="tabular-nums">
                      {money(last.amount)} · {fmtDate(last.date)}
                    </div>
                    <div className="text-xs text-stone-500">{last.campaign}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{p.owner ?? <span className="text-stone-400">—</span>}</td>
                  <td className="px-4 py-2.5">
                    <FollowUp date={p.followUp} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No donors match.</Empty>}
      </div>
    </>
  );
}
