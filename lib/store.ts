"use client";

// Browser-side view of the shared CRM data. Edits apply instantly, then save to the
// server (Upstash Redis via /api/people) one person at a time.
import { useSyncExternalStore } from "react";
import { mergeContactRows, mergeDonorRows, uid } from "./data";
import { addDays, today } from "./format";
import type { DB, Gift, Note, Person } from "./types";

const EMPTY: DB = { people: [], me: "", team: [], status: "loading" };

let db: DB = EMPTY;
let pendingSaves = 0;
/** Bumped on every local edit so an in-flight refresh can't overwrite newer data. */
let version = 0;
/** Changes whose save failed, retried before the next refresh. */
const unsaved = { upsert: new Map<string, Person>(), remove: new Set<string>() };
const listeners = new Set<() => void>();

function set(next: DB) {
  db = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export const useDB = () => useSyncExternalStore(subscribe, () => db, () => EMPTY);

/** False during SSR and hydration, true once the browser store is readable. */
export const useHydrated = () =>
  useSyncExternalStore(subscribe, () => true, () => false);

/** Load (or reload) everything from the server. Skipped while saves are in flight. */
export async function refresh() {
  if (unsaved.upsert.size || unsaved.remove.size) {
    const upsert = [...unsaved.upsert.values()];
    const remove = [...unsaved.remove];
    unsaved.upsert.clear();
    unsaved.remove.clear();
    save(upsert, remove);
    return;
  }
  if (pendingSaves > 0) return;
  const startedAt = version;
  try {
    const res = await fetch("/api/people", { cache: "no-store" });
    if (res.status === 403) return set({ ...db, status: "forbidden" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Pick<DB, "people" | "me" | "team">;
    if (pendingSaves > 0 || version !== startedAt) return;
    set({ ...db, ...data, status: "ready" });
  } catch {
    if (db.status === "loading") set({ ...db, status: "error" });
  }
}

/** Apply changes locally, then persist the changed people. */
function write(people: Person[], upsert: Person[], remove: string[] = []) {
  version++;
  set({ ...db, people });
  save(upsert, remove);
}

function save(upsert: Person[], remove: string[]) {
  pendingSaves++;
  fetch("/api/people", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ upsert, remove }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (db.saveError && !unsaved.upsert.size && !unsaved.remove.size) set({ ...db, saveError: false });
    })
    .catch(() => {
      // Keep the latest version of each failed change; refresh() retries them.
      upsert.forEach((p) => unsaved.upsert.set(p.id, p));
      remove.forEach((id) => {
        unsaved.remove.add(id);
        unsaved.upsert.delete(id);
      });
      set({ ...db, saveError: true });
    })
    .finally(() => pendingSaves--);
}

function mapPeople(ids: string[], fn: (p: Person) => Person) {
  const wanted = new Set(ids);
  const changed: Person[] = [];
  const people = db.people.map((p) => {
    if (!wanted.has(p.id)) return p;
    const next = fn(p);
    changed.push(next);
    return next;
  });
  write(people, changed);
}

function logEntry(kind: Note["kind"], text: string): Note {
  return { id: uid(), at: new Date().toISOString(), author: db.me, kind, text };
}

export function updatePerson(id: string, patch: Partial<Person>, log?: string) {
  mapPeople([id], (p) => ({
    ...p,
    ...patch,
    notes: log ? [...p.notes, logEntry("update", log)] : p.notes,
  }));
}

export function addNote(id: string, kind: Note["kind"], text: string, followUp?: string | null) {
  mapPeople([id], (p) => ({
    ...p,
    notes: [...p.notes, logEntry(kind, text)],
    ...(followUp !== undefined ? { followUp } : {}),
  }));
}

/** Apply the same change to several people, logging it on each timeline. */
export function updateMany(ids: string[], patch: Partial<Person>, log: string) {
  mapPeople(ids, (p) => ({ ...p, ...patch, notes: [...p.notes, logEntry("update", log)] }));
}

/** Log an email on each recipient's timeline, optionally setting their next follow-up. */
export function logEmail(ids: string[], text: string, followUp?: string | null) {
  mapPeople(ids, (p) => ({
    ...p,
    notes: [...p.notes, logEntry("email", text)],
    ...(followUp !== undefined ? { followUp } : {}),
  }));
}

export function addGift(id: string, gift: Omit<Gift, "id">) {
  mapPeople([id], (p) => ({
    ...p,
    gifts: [{ ...gift, id: uid() }, ...p.gifts].sort((a, b) => b.date.localeCompare(a.date)),
    sources: p.sources.includes("donor") ? p.sources : [...p.sources, "donor"],
  }));
}

export function deletePerson(id: string) {
  write(
    db.people.filter((p) => p.id !== id),
    [],
    [id],
  );
}

export type NewPerson = Pick<
  Person,
  "firstName" | "lastName" | "email" | "phone" | "org" | "role" | "group" | "owner"
> & { context: string };

export function createPerson(input: NewPerson): string {
  const { context, ...fields } = input;
  const person: Person = {
    ...fields,
    id: uid(),
    status: "New",
    followUp: addDays(today(), 7),
    createdAt: new Date().toISOString(),
    sources: ["staff"],
    submissions: [],
    gifts: [],
    notes: context ? [logEntry("note", context)] : [],
  };
  write([person, ...db.people], [person]);
  return person.id;
}

/** Run a sheet merge against current data and save only the people it touched. */
function importRows(merge: typeof mergeContactRows, rows: Record<string, string>[]) {
  const before = new Set(db.people);
  const { people, ...counts } = merge(db.people, rows);
  write(
    people,
    people.filter((p) => !before.has(p)),
  );
  return counts;
}

export const importContactRows = (rows: Record<string, string>[]) => importRows(mergeContactRows, rows);
export const importDonorRows = (rows: Record<string, string>[]) => importRows(mergeDonorRows, rows);
