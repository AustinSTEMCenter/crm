"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  HandCoins,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  RefreshCw,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { EditPersonDialog, RecordGiftDialog } from "@/components/dialogs";
import { EmailButton } from "@/components/email";
import {
  Avatar,
  btnPrimary,
  btnSecondary,
  cardCls,
  GroupSelect,
  inputCls,
  OwnerSelect,
  SourceBadges,
  StatusSelect,
} from "@/components/ui";
import { addDays, fmtDate, money, relativeDay, timeAgo, today } from "@/lib/format";
import { fullName, lastGift, lifetimeGiving } from "@/lib/people";
import { addNote, deletePerson, updatePerson, useDB } from "@/lib/store";
import { TOPIC_SHORT, type NoteKind, type Person } from "@/lib/types";

const KINDS: { kind: NoteKind; label: string; icon: LucideIcon }[] = [
  { kind: "note", label: "Note", icon: MessageSquare },
  { kind: "call", label: "Call", icon: PhoneCall },
  { kind: "email", label: "Email", icon: Mail },
  { kind: "meeting", label: "Meeting", icon: Users },
];

const NEXT_OPTIONS: { label: string; days: number | null }[] = [
  { label: "Keep", days: -1 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "None", days: null },
];

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { people } = useDB();
  const p = people.find((x) => x.id === id);

  if (!p) {
    return (
      <div className="py-20 text-center text-stone-500">
        That person doesn&rsquo;t exist (or the demo data was reset).{" "}
        <Link href="/people" className="text-brand underline">
          Back to everyone
        </Link>
      </div>
    );
  }

  const firstSubmission = p.submissions.reduce<string | null>((a, s) => (!a || s.submittedAt < a ? s.submittedAt : a), null);
  const created =
    firstSubmission === p.createdAt ? "website form" : p.sources.includes("staff") ? "staff entry" : "donor list";

  return (
    <>
      <Link href="/people" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-ink">
        <ArrowLeft className="size-4" /> Everyone
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={fullName(p)} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{fullName(p)}</h1>
            <SourceBadges sources={p.sources} />
          </div>
          {(p.org || p.role) && (
            <div className="text-stone-600">{[p.role, p.org].filter(Boolean).join(" · ")}</div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
            {p.email && (
              <EmailButton recipients={[p]}>
                <button className="flex items-center gap-1 hover:text-brand">
                  <Mail className="size-3.5" /> {p.email}
                </button>
              </EmailButton>
            )}
            {p.phone && (
              <a href={`tel:${p.phone}`} className="flex items-center gap-1 hover:text-brand">
                <Phone className="size-3.5" /> {p.phone}
              </a>
            )}
            <span>
              Added {fmtDate(p.createdAt)} via {created}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.email && (
            <EmailButton recipients={[p]}>
              <button className={btnPrimary}>
                <Mail className="size-4" /> Email
              </button>
            </EmailButton>
          )}
          <EditPersonDialog person={p} />
          <RecordGiftDialog person={p} />
          <button
            className={`${btnSecondary} px-2.5 text-stone-500 hover:text-accent`}
            aria-label="Delete person"
            title="Delete person"
            onClick={() => {
              if (!confirm(`Delete ${fullName(p)} and their history? This can't be undone.`)) return;
              deletePerson(p.id);
              router.push("/people");
            }}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Composer person={p} />
          <Timeline person={p} />
        </div>
        <aside className="space-y-6">
          <Details person={p} />
          {p.gifts.length > 0 && <Giving person={p} />}
        </aside>
      </div>
    </>
  );
}

function Composer({ person }: { person: Person }) {
  const [kind, setKind] = useState<NoteKind>("call");
  const [text, setText] = useState("");
  const [next, setNext] = useState<number | null>(7);

  return (
    <form
      className={`${cardCls} p-4`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        const followUp = next === -1 ? undefined : next === null ? null : addDays(today(), next);
        addNote(person.id, kind, text.trim(), followUp);
        setText("");
      }}
    >
      <div className="mb-2 flex gap-1">
        {KINDS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm ${
              kind === k ? "bg-brand-soft font-medium text-brand-dark" : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={kind === "note" ? "Add a note…" : `What happened on the ${kind}?`}
        className={`${inputCls} h-auto w-full py-2`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-stone-500">Next follow-up:</span>
        {NEXT_OPTIONS.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setNext(o.days)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              next === o.days ? "border-brand bg-brand text-white" : "border-stone-300 text-stone-600 hover:border-brand"
            }`}
          >
            {o.label}
          </button>
        ))}
        <button className={`${btnPrimary} ml-auto`} disabled={!text.trim()}>
          Log {KINDS.find((k) => k.kind === kind)?.label.toLowerCase()}
        </button>
      </div>
    </form>
  );
}

type Item = { at: string; key: string; node: ReactNode; icon: LucideIcon; tone: string };

function Timeline({ person: p }: { person: Person }) {
  const items: Item[] = [
    ...p.submissions.map((s) => ({
      at: s.submittedAt,
      key: s.id,
      icon: Inbox,
      tone: "bg-brand text-white",
      node: (
        <>
          <Meta>
            Submitted the contact form · <b className="font-medium text-ink">{TOPIC_SHORT[s.topic] ?? s.topic}</b>
            {s.heardAbout && ` · heard via ${s.heardAbout}`}
            {s.clickupTaskId && (
              <>
                {" · "}
                <a
                  href={`https://app.clickup.com/t/${s.clickupTaskId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline"
                >
                  Open in ClickUp
                </a>
              </>
            )}
          </Meta>
          <p className="mt-1.5 whitespace-pre-line rounded-lg bg-stone-50 px-3 py-2 text-sm leading-relaxed">
            {s.message}
          </p>
        </>
      ),
    })),
    ...p.gifts.map((g) => ({
      at: `${g.date}T12:00:00`,
      key: g.id,
      icon: HandCoins,
      tone: "bg-gold text-ink",
      node: (
        <Meta>
          Gave <b className="font-semibold text-ink">{money(g.amount)}</b> · {g.campaign} · {g.method}
        </Meta>
      ),
    })),
    ...p.notes.map((n) => {
      const k = KINDS.find((x) => x.kind === n.kind);
      if (n.kind === "update")
        return {
          at: n.at,
          key: n.id,
          icon: RefreshCw,
          tone: "bg-stone-100 text-stone-500",
          node: (
            <Meta>
              {n.author}: {n.text}
            </Meta>
          ),
        };
      return {
        at: n.at,
        key: n.id,
        icon: k?.icon ?? MessageSquare,
        tone: "bg-stone-200 text-ink",
        node: (
          <>
            <Meta>
              <b className="font-medium text-ink">{n.author}</b>{" "}
              {n.kind === "email" ? "sent an email" : n.kind === "note" ? "logged a note" : `logged a ${n.kind}`}
            </Meta>
            <p
              className={`mt-1 whitespace-pre-line text-sm ${
                n.kind === "email" ? "line-clamp-6 rounded-lg bg-stone-50 px-3 py-2" : ""
              }`}
            >
              {n.text}
            </p>
          </>
        ),
      };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className={`${cardCls} p-4`}>
      <h2 className="mb-4 font-semibold">Activity</h2>
      {items.length === 0 && <p className="text-sm text-stone-400">Nothing logged yet.</p>}
      <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-3.5 before:top-2 before:w-px before:bg-stone-200">
        {items.map(({ key, at, icon: Icon, tone, node }) => (
          <li key={key} className="relative flex gap-3">
            <span className={`z-10 flex size-7 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              {node}
              <div className="mt-0.5 text-xs text-stone-400" title={fmtDate(at)}>
                {timeAgo(at)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const Meta = ({ children }: { children: ReactNode }) => <div className="text-sm text-stone-600">{children}</div>;

function Details({ person: p }: { person: Person }) {
  const row = (label: string, control: ReactNode) => (
    <label className="block text-sm">
      <span className="text-xs text-stone-500">{label}</span>
      <div className="mt-1">{control}</div>
    </label>
  );
  const full = `${inputCls} w-full`;
  return (
    <section className={`${cardCls} space-y-3 p-4`}>
      {row(
        "Status",
        <StatusSelect className={full} value={p.status} onChange={(status) => updatePerson(p.id, { status }, `Status → ${status}`)} />,
      )}
      {row(
        "ASC point of contact",
        <OwnerSelect
          className={full}
          value={p.owner}
          onChange={(owner) => updatePerson(p.id, { owner }, `Owner → ${owner ?? "Unassigned"}`)}
        />,
      )}
      {row(
        "Group",
        <GroupSelect className={full} value={p.group} onChange={(group) => updatePerson(p.id, { group }, `Group → ${group}`)} />,
      )}
      {row(
        "Next follow-up",
        <div className="flex items-center gap-2">
          <input
            type="date"
            className={full}
            value={p.followUp ?? ""}
            onChange={(e) =>
              updatePerson(
                p.id,
                { followUp: e.target.value || null },
                e.target.value ? `Follow-up → ${fmtDate(e.target.value)}` : "Cleared follow-up",
              )
            }
          />
        </div>,
      )}
      {p.followUp && (
        <p className="flex items-center gap-1.5 text-xs text-stone-500">
          <CalendarClock className="size-3.5" /> {relativeDay(p.followUp)}
        </p>
      )}
    </section>
  );
}

function Giving({ person: p }: { person: Person }) {
  const largest = Math.max(...p.gifts.map((g) => g.amount));
  const first = p.gifts.reduce((a, g) => (g.date < a.date ? g : a));
  const stats: [string, string][] = [
    ["Lifetime", money(lifetimeGiving(p))],
    ["Gifts", String(p.gifts.length)],
    ["Largest", money(largest)],
    ["First gift", fmtDate(first.date)],
    ["Last gift", fmtDate(lastGift(p)!.date)],
  ];
  return (
    <section className={`${cardCls} p-4`}>
      <h2 className="mb-3 font-semibold">Giving</h2>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        {stats.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-stone-500">{k}</dt>
            <dd className="text-right font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
