"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, FollowUp, inputCls, PageHeader, SourceBadges, STATUS_DOT } from "@/components/ui";
import { fullName } from "@/lib/people";
import { updatePerson, useDB } from "@/lib/store";
import { GROUPS, STATUSES, type Status } from "@/lib/types";

export default function PipelinePage() {
  const { people, me } = useDB();
  const [group, setGroup] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [includeDonors, setIncludeDonors] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);

  const visible = people
    .filter((p) => !group || p.group === group)
    .filter((p) => !mineOnly || p.owner === me)
    .filter((p) => includeDonors || group === "Funding" || p.sources.some((s) => s !== "donor"));

  function drop(status: Status) {
    const p = people.find((x) => x.id === dragging);
    if (p && p.status !== status) updatePerson(p.id, { status }, `Status → ${status}`);
    setDragging(null);
    setOver(null);
  }

  return (
    <>
      <PageHeader title="Pipeline" subtitle="Drag a card to change its status." />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All groups</option>
          {GROUPS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          Only mine
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={includeDonors} onChange={(e) => setIncludeDonors(e.target.checked)} />
          Include donor-only contacts
        </label>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const cards = visible
            .filter((p) => p.status === status)
            .sort((a, b) => (a.followUp ?? "9999").localeCompare(b.followUp ?? "9999"));
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                drop(status);
              }}
              className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 transition-colors ${
                over === status ? "border-brand bg-brand-soft" : "border-stone-200 bg-stone-100/70"
              }`}
            >
              <h2 className="flex items-center gap-2 px-1.5 pb-2 pt-1 text-sm font-semibold">
                <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
                {status}
                <span className="font-normal text-stone-400">{cards.length}</span>
              </h2>
              <div className="flex max-h-[calc(100vh-15rem)] flex-col gap-2 overflow-y-auto">
                {cards.map((p) => (
                  <Link
                    key={p.id}
                    href={`/people/${p.id}`}
                    draggable
                    onDragStart={() => setDragging(p.id)}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    className={`block rounded-lg border border-stone-200 bg-white p-2.5 text-sm shadow-xs hover:border-brand/50 ${
                      dragging === p.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="font-medium">{fullName(p)}</div>
                    <div className="truncate text-xs text-stone-500">{p.org || p.group}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <SourceBadges sources={p.sources} />
                      <span className="ml-auto">
                        <FollowUp date={p.followUp} />
                      </span>
                      {p.owner && <Avatar name={p.owner} size="sm" />}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
