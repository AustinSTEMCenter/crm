// One-time load of the sheet snapshots (data/*.csv, gitignored) into the shared Redis store.
// Usage: bun scripts/seed.ts [--force]   (bun reads .env.local for the KV_* credentials)
import { readFileSync } from "node:fs";
import { Redis } from "@upstash/redis";
import { csvToObjects } from "../lib/csv";
import { mergeContactRows, mergeDonorRows } from "../lib/data";

const KEY = "crm:people";
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

const existing = await redis.hlen(KEY);
if (existing > 0 && !process.argv.includes("--force")) {
  console.log(`${KEY} already has ${existing} people; pass --force to replace them.`);
  process.exit(0);
}

const read = (file: string) => csvToObjects(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"));
const contacts = mergeContactRows([], read("contact-sheet.csv"));
const donors = mergeDonorRows(contacts.people, read("donors.csv"));

await redis.del(KEY);
await redis.hset(KEY, Object.fromEntries(donors.people.map((p) => [p.id, p])));
console.log(
  `Loaded ${donors.people.length} people: contacts +${contacts.added} (${contacts.skipped} skipped), donors +${donors.added} new / ${donors.merged} merged gifts.`,
);
