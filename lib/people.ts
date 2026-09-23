import { daysFromToday } from "./format";
import type { Person } from "./types";

export const fullName = (p: Person) => `${p.firstName} ${p.lastName}`.trim();

export const lifetimeGiving = (p: Person) => p.gifts.reduce((sum, g) => sum + g.amount, 0);

export const lastGift = (p: Person) =>
  p.gifts.reduce<Person["gifts"][number] | null>((a, g) => (!a || g.date > a.date ? g : a), null);

export const latestSubmission = (p: Person) =>
  p.submissions.reduce<Person["submissions"][number] | null>(
    (a, s) => (!a || s.submittedAt > a.submittedAt ? s : a),
    null,
  );

export function lastActivity(p: Person): string {
  const dates = [
    p.createdAt,
    ...p.submissions.map((s) => s.submittedAt),
    ...p.gifts.map((g) => g.date),
    ...p.notes.map((n) => n.at),
  ];
  return dates.reduce((a, b) => (b > a ? b : a));
}

export const isOverdue = (p: Person) =>
  p.followUp !== null && p.status !== "Closed" && daysFromToday(p.followUp) < 0;

export const isDonor = (p: Person) => p.gifts.length > 0;

export function matches(p: Person, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [fullName(p), p.email, p.org, p.phone].some((v) => v.toLowerCase().includes(q));
}
