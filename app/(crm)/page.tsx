"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar, cardCls, Empty, FollowUp, PageHeader, SourceBadges, StatTile, StatusPill } from "@/components/ui";
import { addDays, daysFromToday, fmtDate, money, moneyCompact, timeAgo, today } from "@/lib/format";
import { fullName, isOverdue, lastActivity } from "@/lib/people";
import { updatePerson, useDB } from "@/lib/store";
import { TOPIC_SHORT } from "@/lib/types";

export default function TodayPage() {
  const { people, me } = useDB();
  const open = people.filter((p) => p.status !== "Closed" && p.followUp);

  const mine = open
    .filter((p) => p.owner === me && daysFromToday(p.followUp!) <= 7)
    .sort((a, b) => a.followUp!.localeCompare(b.followUp!));
  const unassigned = people
    .filter((p) => p.status === "New" && !p.owner)
    .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));

  const submissions = people
    .flatMap((p) => p.submissions.map((s) => ({ p, s })))
    .sort((a, b) => b.s.submittedAt.localeCompare(a.s.submittedAt));
  const gifts = people
    .flatMap((p) => p.gifts.map((g) => ({ p, g })))
    .sort((a, b) => b.g.date.localeCompare(a.g.date));

  const weekAgo = addDays(today(), -7);
  const yearAgo = addDays(today(), -365);
  const newThisWeek = submissions.filter(({ s }) => s.submittedAt.slice(0, 10) >= weekAgo).length;
  const overdue = people.filter(isOverdue);
  const raised = gifts.filter(({ g }) => g.date >= yearAgo);
  const hour = new Date().getHours();

  return (
    <>
      <PageHeader
        title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${me}`}
        subtitle={fmtDate(today())}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="New inquiries this week" value={String(newThisWeek)} detail={`${unassigned.length} waiting for an owner`} />
        <StatTile
          label="Overdue follow-ups"
          value={String(overdue.length)}
          detail={`${overdue.filter((p) => p.owner === me).length} of them yours`}
          tone={overdue.length ? "alert" : "default"}
        />
        <StatTile
          label="Your follow-ups this week"
          value={String(mine.length)}
          detail={`${mine.filter((p) => daysFromToday(p.followUp!) <= 0).length} due today or earlier`}
        />
        <StatTile
          label="Raised, last 12 months"
          value={moneyCompact(raised.reduce((s, { g }) => s + g.amount, 0))}
          detail={`${new Set(raised.map(({ p }) => p.id)).size} donors · ${raised.length} gifts`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className={cardCls}>
            <SectionHead title="Your follow-ups" hint="Overdue and due in the next 7 days" />
            {mine.length === 0 ? (
              <Empty>Nothing due. Nice.</Empty>
            ) : (
              <ul className="divide-y divide-stone-100">
                {mine.map((p) => {
                  const lastNote = p.notes.at(-1);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={fullName(p)} />
                      <Link href={`/people/${p.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium hover:underline">{fullName(p)}</span>
                          <StatusPill status={p.status} />
                        </div>
                        <div className="truncate text-sm text-stone-500">
                          {p.org && `${p.org} · `}
                          {lastNote ? lastNote.text : p.group}
                        </div>
                      </Link>
                      <div className="text-right text-sm">
                        <FollowUp date={p.followUp} />
                        <button
                          className="block text-xs text-stone-400 hover:text-brand"
                          onClick={() =>
                            updatePerson(p.id, { followUp: addDays(today(), 7) }, "Snoozed follow-up 1 week")
                          }
                        >
                          Snooze 1 wk
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={cardCls}>
            <SectionHead title="Needs an owner" hint="New inquiries nobody has claimed" href="/inquiries" />
            {unassigned.length === 0 ? (
              <Empty>Every new inquiry has an owner.</Empty>
            ) : (
              <ul className="divide-y divide-stone-100">
                {unassigned.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/people/${p.id}`} className="min-w-0 flex-1">
                      <div className="font-medium hover:underline">{fullName(p)}</div>
                      <div className="truncate text-sm text-stone-500">{p.submissions.at(-1)?.message}</div>
                    </Link>
                    <FollowUp date={p.followUp} />
                    <button
                      className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium hover:border-brand hover:text-brand"
                      onClick={() => updatePerson(p.id, { owner: me }, `${me} took ownership`)}
                    >
                      Take it
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className={cardCls}>
            <SectionHead title="Latest inquiries" href="/inquiries" />
            <ul className="divide-y divide-stone-100">
              {submissions.slice(0, 5).map(({ p, s }) => (
                <li key={s.id}>
                  <Link href={`/people/${p.id}`} className="block px-4 py-3 hover:bg-stone-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{fullName(p)}</span>
                      <span className="text-xs text-stone-400">{timeAgo(s.submittedAt)}</span>
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-brand">{TOPIC_SHORT[s.topic] ?? s.topic}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-stone-600">{s.message}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={cardCls}>
            <SectionHead title="Recent gifts" href="/donors" />
            <ul className="divide-y divide-stone-100">
              {gifts.slice(0, 6).map(({ p, g }) => (
                <li key={g.id}>
                  <Link href={`/people/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {p.org || fullName(p)}
                        {p.sources.length > 1 && <SourceBadges sources={p.sources.filter((s) => s !== "donor")} />}
                      </div>
                      <div className="text-xs text-stone-500">
                        {g.campaign} · {fmtDate(g.date, false)}
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{money(g.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function SectionHead({ title, hint, href }: { title: string; hint?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-stone-500">{hint}</p>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          View all <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
