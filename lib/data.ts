// Pure data helpers shared by the browser store and server scripts.
import { addDays, isoDate, today } from "./format";
import { TOPIC_GROUP, type Gift, type Person } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const ALLOWED_EMAIL_DOMAIN = "austinstemcenter.org";

/** Emails from our own domain are internal test submissions. */
const isInternal = (email: string) => email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);

const squish = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Merge rows from the contact form sheet (CSV, keyed by lower-cased header) into people.
 * Matches by email; new people start as New with a follow-up 1 week after submitting.
 */
export function mergeContactRows(existingPeople: Person[], rows: Record<string, string>[]) {
  const people = [...existingPeople];
  const fresh: Person[] = [];
  const byEmail = new Map(people.map((p, i) => [p.email.toLowerCase(), i]));
  let added = 0;
  let merged = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = (row["email"] ?? "").trim();
    const first = (row["first name"] ?? "").trim();
    if ((!email && !first) || isInternal(email)) {
      skipped++;
      continue;
    }
    const parsed = new Date(row["submitted"] ?? row["timestamp"] ?? "");
    const submittedAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    const topic = (row["topic"] ?? "").trim();
    const org = (row["organization or school"] ?? "").trim();
    const submission = {
      id: uid(),
      submittedAt,
      topic,
      heardAbout: (row["heard about us"] ?? "").trim(),
      message: (row["message"] ?? "").trim(),
      form: (row["form"] ?? "").trim() || "contact",
      clickupTaskId: (row["clickup task id"] ?? "").trim() || undefined,
    };
    // Same topic + message from the same person = already imported. Whitespace is ignored
    // because Sheets exports keep line breaks that older snapshots collapsed to spaces.
    const isDupe = (p: Person) =>
      p.submissions.some(
        (s) => s.topic === submission.topic && squish(s.message) === squish(submission.message),
      );

    const idx = email ? byEmail.get(email.toLowerCase()) : undefined;
    if (idx !== undefined) {
      const p = people[idx];
      if (isDupe(p)) {
        skipped++;
        continue;
      }
      people[idx] = {
        ...p,
        org: p.org || org,
        submissions: [...p.submissions, submission],
        sources: p.sources.includes("inquiry") ? p.sources : [...p.sources, "inquiry"],
      };
      merged++;
      continue;
    }

    const existing = email ? fresh.find((p) => p.email.toLowerCase() === email.toLowerCase()) : undefined;
    if (existing) {
      if (isDupe(existing)) {
        skipped++;
        continue;
      }
      existing.submissions.push(submission);
      existing.org ||= org;
      merged++;
      continue;
    }
    fresh.push({
      id: uid(),
      firstName: first,
      lastName: (row["last name"] ?? "").trim(),
      email,
      phone: (row["phone"] ?? "").trim(),
      org,
      role: "",
      group: TOPIC_GROUP[topic] ?? "Unsorted",
      status: "New",
      owner: null,
      followUp: addDays(isoDate(new Date(submittedAt)), 7),
      createdAt: submittedAt,
      sources: ["inquiry"],
      submissions: [submission],
      gifts: [],
      notes: [],
    });
    added++;
  }

  return { people: [...fresh.reverse(), ...people], added, merged, skipped };
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

const METHOD_LABEL: Record<string, string> = { card: "Card", link: "Payment link" };

/**
 * Merge rows from the donor sheet (date, amount, refunded, name, email, payment_method).
 * Matches by email; each row is one gift, net of refunds.
 */
export function mergeDonorRows(existingPeople: Person[], rows: Record<string, string>[]) {
  const people = [...existingPeople];
  const byEmail = new Map(people.map((p, i) => [p.email.toLowerCase(), i]));
  let added = 0;
  let merged = 0;
  let skipped = 0;
  const yearAgo = addDays(today(), -365);

  for (const row of rows) {
    const email = (row["email"] ?? "").trim();
    const date = (row["date"] ?? "").trim().slice(0, 10);
    const amount = Number(row["amount"]) - (Number(row["refunded"]) || 0);
    if (!email || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(amount > 0)) {
      skipped++;
      continue;
    }
    const method = (row["payment_method"] ?? "").trim();
    const gift: Gift = {
      id: uid(),
      date,
      amount,
      campaign: row["campaign"]?.trim() || (date === "2026-08-22" ? "Grand Opening" : "General"),
      method: METHOD_LABEL[method] ?? method,
      ref: [row["date"], row["amount"], method].join("|"),
    };

    const key = email.toLowerCase();
    const idx = byEmail.get(key);
    if (idx === undefined) {
      const { firstName, lastName } = splitName(row["name"] ?? "");
      people.push({
        id: uid(),
        firstName: firstName || email,
        lastName,
        email,
        phone: "",
        org: "",
        role: "",
        group: "Funding",
        status: "Active",
        owner: null,
        followUp: null,
        createdAt: new Date(`${date}T12:00:00`).toISOString(),
        sources: ["donor"],
        submissions: [],
        gifts: [gift],
        notes: [],
      });
      byEmail.set(key, people.length - 1);
      added++;
      continue;
    }

    const p = people[idx];
    if (p.gifts.some((g) => g.ref === gift.ref)) {
      skipped++;
      continue;
    }
    const gifts = [...p.gifts, gift].sort((a, b) => b.date.localeCompare(a.date));
    const donorOnly = !p.sources.some((s) => s !== "donor");
    people[idx] = {
      ...p,
      gifts,
      sources: p.sources.includes("donor") ? p.sources : [...p.sources, "donor"],
      status: donorOnly ? (gifts[0].date >= yearAgo ? "Active" : "Needs Renewal") : p.status,
    };
    merged++;
  }

  return { people, added, merged, skipped };
}

