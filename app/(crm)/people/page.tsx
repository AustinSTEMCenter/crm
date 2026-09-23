"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BulkBar, SelectCell, useSelection } from "@/components/bulk";
import { AddPersonDialog } from "@/components/dialogs";
import { Avatar, cardCls, Empty, FollowUp, inputCls, PageHeader, SourceBadges, StatusPill } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { fullName, isOverdue, lastActivity, matches } from "@/lib/people";
import { useDB } from "@/lib/store";
import { GROUPS, STATUSES, type Person } from "@/lib/types";

const SOURCE_FILTERS: Record<string, (p: Person) => boolean> = {
  "All sources": () => true,
  "Inquiries": (p) => p.sources.includes("inquiry"),
  "Donors": (p) => p.sources.includes("donor"),
  "Inquiry + donor": (p) => p.sources.includes("inquiry") && p.sources.includes("donor"),
  "Staff entries": (p) => p.sources.includes("staff"),
};

export default function PeoplePage() {
  const router = useRouter();
  const { people, me, team } = useDB();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("All sources");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const [owner, setOwner] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const selection = useSelection();

  const rows = people
    .filter(SOURCE_FILTERS[source])
    .filter((p) => !status || p.status === status)
    .filter((p) => !group || p.group === group)
    .filter((p) => !owner || (owner === "none" ? !p.owner : p.owner === owner))
    .filter((p) => !overdueOnly || isOverdue(p))
    .filter((p) => matches(p, query))
    .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));

  const select = (value: string, set: (v: string) => void, placeholder: string, options: readonly string[]) => (
    <select className={inputCls} value={value} onChange={(e) => set(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );

  return (
    <>
      <PageHeader
        title="Everyone"
        subtitle="Inquiries, donors, and staff-added contacts in one list. Same email = same person."
        actions={<AddPersonDialog />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className={`${inputCls} w-64`}
          placeholder="Search name, email, org, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
          {Object.keys(SOURCE_FILTERS).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {select(status, setStatus, "Any status", STATUSES)}
        {select(group, setGroup, "Any group", GROUPS)}
        <select className={inputCls} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">Any owner</option>
          <option value={me}>Mine ({me})</option>
          <option value="none">Unassigned</option>
          {team.filter((t) => t !== me).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
          Overdue only
        </label>
        <span className="ml-auto text-sm text-stone-500">{rows.length} people</span>
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
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Group</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Owner</th>
              <th className="px-4 py-2.5 font-medium">Follow up</th>
              <th className="px-4 py-2.5 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((p) => (
              <tr key={p.id} onClick={() => router.push(`/people/${p.id}`)} className="cursor-pointer hover:bg-stone-50">
                <SelectCell
                  checked={selection.selected.has(p.id)}
                  onChange={() => selection.toggle(p.id)}
                  label={`Select ${fullName(p)}`}
                />
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={fullName(p)} size="sm" />
                    <div className="min-w-0">
                      <div className="font-medium">{fullName(p)}</div>
                      <div className="truncate text-xs text-stone-500">{p.org || p.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <SourceBadges sources={p.sources} />
                </td>
                <td className="px-4 py-2.5 text-stone-600">{p.group}</td>
                <td className="px-4 py-2.5">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-4 py-2.5 text-stone-600">{p.owner ?? <span className="text-stone-400">—</span>}</td>
                <td className="px-4 py-2.5">
                  <FollowUp date={p.followUp} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-stone-500">{timeAgo(lastActivity(p))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No one matches those filters.</Empty>}
      </div>
    </>
  );
}
