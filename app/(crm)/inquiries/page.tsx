"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Mail, Phone, Reply } from "lucide-react";
import { AddPersonDialog, ImportDialog } from "@/components/dialogs";
import { EmailButton } from "@/components/email";
import {
  cardCls,
  Empty,
  FollowUp,
  GroupSelect,
  inputCls,
  OwnerSelect,
  PageHeader,
  SourceBadges,
  StatusSelect,
} from "@/components/ui";
import { fmtDate, timeAgo } from "@/lib/format";
import { fullName, matches } from "@/lib/people";
import { updatePerson, useDB } from "@/lib/store";
import { TOPIC_SHORT } from "@/lib/types";

const TABS = ["Needs triage", "Unassigned", "All"] as const;
type Tab = (typeof TABS)[number];
const compactSelect = "h-8 w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 text-xs text-ink outline-none focus:border-brand";

export default function InquiriesPage() {
  const { people } = useDB();
  const [tab, setTab] = useState<Tab>("Needs triage");
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");

  const rows = people
    .flatMap((p) => p.submissions.map((s) => ({ p, s })))
    .filter(({ p, s }) => {
      if (tab === "Needs triage" && p.status !== "New") return false;
      if (tab === "Unassigned" && p.owner) return false;
      if (topic && s.topic !== topic) return false;
      return matches(p, query);
    })
    .sort((a, b) => b.s.submittedAt.localeCompare(a.s.submittedAt));

  const topics = [...new Set(people.flatMap((p) => p.submissions.map((s) => s.topic)))].filter(Boolean).sort();

  const counts: Record<Tab, number> = {
    "Needs triage": people.filter((p) => p.status === "New" && p.submissions.length).length,
    Unassigned: people.filter((p) => !p.owner && p.submissions.length).length,
    All: people.reduce((n, p) => n + p.submissions.length, 0),
  };

  return (
    <>
      <PageHeader
        title="Inquiries"
        subtitle="Everything that came in through the website contact form."
        actions={
          <>
            <ImportDialog kind="contacts" />
            <AddPersonDialog />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-brand text-white" : "text-stone-600 hover:text-ink"}`}
            >
              {t} <span className={tab === t ? "text-white/70" : "text-stone-400"}>{counts[t]}</span>
            </button>
          ))}
        </div>
        <select className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className={`${inputCls} w-64`}
          placeholder="Search name, email, org…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className={cardCls}>
            <Empty>{tab === "Needs triage" ? "Inbox zero — every inquiry has been triaged." : "No matches."}</Empty>
          </div>
        )}
        {rows.map(({ p, s }) => (
          <article key={s.id} className={`${cardCls} grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_15rem]`}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/people/${p.id}`} className="font-semibold hover:underline">
                  {fullName(p)}
                </Link>
                {p.org && <span className="text-sm text-stone-500">{p.org}</span>}
                {p.sources.length > 1 && <SourceBadges sources={p.sources} />}
                <span className="ml-auto text-xs text-stone-400" title={fmtDate(s.submittedAt)}>
                  {timeAgo(s.submittedAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
                <EmailButton recipients={[p]}>
                  <button className="flex items-center gap-1 hover:text-brand">
                    <Mail className="size-3.5" /> {p.email}
                  </button>
                </EmailButton>
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="flex items-center gap-1 hover:text-brand">
                    <Phone className="size-3.5" /> {p.phone}
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-brand-soft px-2 py-0.5 font-medium text-brand-dark">
                  {TOPIC_SHORT[s.topic] ?? (s.topic || "No topic")}
                </span>
                {s.heardAbout && (
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-stone-600">Heard via: {s.heardAbout}</span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{s.message}</p>
              {p.email && (
                <div className="mt-3">
                  <EmailButton recipients={[p]}>
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium hover:border-brand hover:text-brand">
                      <Reply className="size-3.5" /> Reply
                    </button>
                  </EmailButton>
                </div>
              )}
            </div>
            <div className="space-y-2 border-stone-100 text-xs md:border-l md:pl-4">
              <Field label="Status">
                <StatusSelect
                  className={compactSelect}
                  value={p.status}
                  onChange={(status) => updatePerson(p.id, { status }, `Status → ${status}`)}
                />
              </Field>
              <Field label="Owner">
                <OwnerSelect
                  className={compactSelect}
                  value={p.owner}
                  onChange={(owner) => updatePerson(p.id, { owner }, `Owner → ${owner ?? "Unassigned"}`)}
                />
              </Field>
              <Field label="Group">
                <GroupSelect
                  className={compactSelect}
                  value={p.group}
                  onChange={(group) => updatePerson(p.id, { group }, `Group → ${group}`)}
                />
              </Field>
              <Field label="Follow up">
                <span className="text-sm">
                  <FollowUp date={p.followUp} />
                </span>
              </Field>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
      <span className="text-stone-500">{label}</span>
      {children}
    </label>
  );
}
