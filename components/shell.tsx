"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useClerk } from "@clerk/nextjs";
import { CalendarCheck, HandCoins, Inbox, KanbanSquare, LogOut, Users } from "lucide-react";
import { refresh, useDB, useHydrated } from "@/lib/store";
import { Avatar } from "./ui";

const NAV = [
  { href: "/", label: "Today", icon: CalendarCheck },
  { href: "/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/donors", label: "Donors", icon: HandCoins },
  { href: "/people", label: "Everyone", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const db = useDB();
  const { signOut } = useClerk();
  const newCount = db.people.filter((p) => p.status === "New" && p.sources.includes("inquiry")).length;

  // Load shared data, then pick up teammates' changes on focus and every 30s.
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const timer = setInterval(onFocus, 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, []);

  const signOutToSignIn = () => void signOut({ redirectUrl: "/sign-in" });

  if (hydrated && db.status === "forbidden") {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">This CRM is for ASC staff</h1>
        <p className="text-sm text-stone-500">Sign in with your austinstemcenter.org Google account to continue.</p>
        <button onClick={signOutToSignIn} className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium">
          Use a different account
        </button>
      </Centered>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-brand-dark text-white">
        <div className="px-5 pb-6 pt-5">
          <div className="text-lg font-bold tracking-tight">
            ASC <span className="font-normal text-white/70">CRM</span>
          </div>
          <div className="text-xs text-white/50">Austin STEM Center</div>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  active ? "bg-white/15 font-medium text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                <span className="flex-1">{label}</span>
                {href === "/inquiries" && hydrated && newCount > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5">
                    {newCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3 border-t border-white/10 p-4 text-xs">
          {db.saveError && (
            <div role="alert" className="rounded-md bg-accent px-2.5 py-2 font-medium text-white">
              Some changes haven&rsquo;t saved yet. Retrying automatically…
            </div>
          )}
          <p className="text-white/50">Demo · contact form and donor data as of Sep 23, 2026. Changes are shared with the team.</p>
          {db.me && (
            <div className="flex items-center gap-2">
              <Avatar name={db.me} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm text-white/90">{db.me}</span>
              <button onClick={signOutToSignIn} className="text-white/60 hover:text-white" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-7">
        {!hydrated || db.status === "loading" ? (
          <p className="py-20 text-center text-sm text-stone-400">Loading…</p>
        ) : db.status === "error" ? (
          <p className="py-20 text-center text-sm text-accent">Couldn&rsquo;t load CRM data. Refresh the page to try again.</p>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">{children}</div>;
}
