"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { updateMany, useDB } from "@/lib/store";
import { STATUSES, type Person, type Status } from "@/lib/types";
import { EmailButton } from "./email";
import { btnPrimary } from "./ui";

/** Row selection for tables. Selected ids that are filtered out stay selected. */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (ids: string[]) =>
    setSelected((s) => (ids.every((id) => s.has(id)) ? new Set() : new Set(ids)));
  return { selected, toggle, toggleAll, clear: () => setSelected(new Set()) };
}

export function SelectCell({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <td className="w-10 py-2.5 pl-4" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" className="size-4 accent-brand" checked={checked} onChange={onChange} aria-label={label} />
    </td>
  );
}

const barSelect = "h-8 rounded-md border border-brand/30 bg-white px-2 text-sm outline-none";

export function BulkBar({ people, onClear }: { people: Person[]; onClear: () => void }) {
  const { team } = useDB();
  if (!people.length) return null;
  const ids = people.map((p) => p.id);
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm">
      <span className="font-medium text-brand-dark">{people.length} selected</span>
      <EmailButton recipients={people}>
        <button className={`${btnPrimary} h-8`}>
          <Mail className="size-4" /> Email
        </button>
      </EmailButton>
      <select
        className={barSelect}
        value=""
        onChange={(e) => {
          const owner = e.target.value === "none" ? null : e.target.value;
          updateMany(ids, { owner }, `Owner → ${owner ?? "Unassigned"}`);
        }}
      >
        <option value="" disabled>
          Assign to…
        </option>
        <option value="none">Unassigned</option>
        {team.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <select
        className={barSelect}
        value=""
        onChange={(e) => {
          const status = e.target.value as Status;
          updateMany(ids, { status }, `Status → ${status}`);
        }}
      >
        <option value="" disabled>
          Set status…
        </option>
        {STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <button onClick={onClear} className="ml-auto flex items-center gap-1 text-stone-500 hover:text-ink">
        <X className="size-4" /> Clear
      </button>
    </div>
  );
}
