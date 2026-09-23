import "server-only";
import { Redis } from "@upstash/redis";
import type { Person } from "../types";

// Shared with the admin dashboard's Upstash database; everything lives under "crm:".
const PEOPLE_KEY = "crm:people";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function getPeople(): Promise<Person[]> {
  const all = await redis.hgetall<Record<string, Person>>(PEOPLE_KEY);
  return Object.values(all ?? {});
}

/** Union two lists by id, keeping the incoming version of shared items. */
function unionById<T extends { id: string }>(stored: T[], incoming: T[]) {
  const ids = new Set(incoming.map((x) => x.id));
  return [...incoming, ...stored.filter((x) => !ids.has(x.id))];
}

/**
 * Save changed people. Fields like status/owner are last-write-wins, but notes, gifts,
 * and form submissions are merged so two teammates adding notes at once both keep theirs.
 */
export async function savePeople(upsert: Person[], remove: string[]) {
  if (upsert.length) {
    const stored = await redis.hmget<Record<string, Person>>(PEOPLE_KEY, ...upsert.map((p) => p.id));
    upsert = upsert.map((p) => {
      const prev = stored?.[p.id];
      if (!prev) return p;
      const notes = unionById(prev.notes, p.notes).sort((a, b) => a.at.localeCompare(b.at));
      const gifts = unionById(prev.gifts, p.gifts).sort((a, b) => b.date.localeCompare(a.date));
      return { ...p, notes, gifts, submissions: unionById(prev.submissions, p.submissions) };
    });
  }
  const pipeline = redis.pipeline();
  if (upsert.length) pipeline.hset(PEOPLE_KEY, Object.fromEntries(upsert.map((p) => [p.id, p])));
  if (remove.length) pipeline.hdel(PEOPLE_KEY, ...remove);
  if (upsert.length || remove.length) await pipeline.exec();
}
