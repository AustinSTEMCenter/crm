// Vocabulary follows plans/crm-plan-01.md (groups, statuses, ASC POC, follow-up dates).

export const STATUSES = [
  "New",
  "Exploring",
  "Pending",
  "Active",
  "Not Yet",
  "Needs Renewal",
  "Closed",
] as const;
export type Status = (typeof STATUSES)[number];

export const GROUPS = [
  "Educational Organizations",
  "Space Rental",
  "Partnerships / Sponsorships",
  "Programmatic Partners",
  "Funding",
  "Families",
  "Advisors",
  "People of Interest",
  "Vendors",
  "Unsorted",
] as const;
export type Group = (typeof GROUPS)[number];

// Options from the live /contact form (web/ascweb/components/contact-form.tsx).
export const TOPICS = [
  "Programs (field trips, camps, or after-school clubs)",
  "Facility rentals (event space or classrooms)",
  "Partnerships",
  "Interested parent",
  "Something else",
] as const;

export const HEARD_ABOUT = [
  "Friend or family",
  "My kid’s school or teacher",
  "Social media",
  "Google / search",
  "Flyer or poster",
  "Local news or event",
  "Other",
] as const;

// Topic → [CRM group, short label]. Includes older and newer wordings of the form's options.
const TOPIC_INFO: Record<string, [Group, string]> = {
  [TOPICS[0]]: ["Educational Organizations", "Programs"],
  [TOPICS[1]]: ["Space Rental", "Facility rental"],
  [TOPICS[2]]: ["Partnerships / Sponsorships", "Partnerships"],
  [TOPICS[3]]: ["Families", "Parent"],
  [TOPICS[4]]: ["Unsorted", "Other"],
  "School programs or field trips": ["Educational Organizations", "School programs"],
  "Programs for my child": ["Families", "Programs for my child"],
  "Facility rental": ["Space Rental", "Facility rental"],
  "Partnership or sponsorship": ["Partnerships / Sponsorships", "Partnerships"],
  "Volunteer, advisor, or project collaboration": ["People of Interest", "Volunteer / collaborate"],
  "General question or something else": ["Unsorted", "Other"],
};

export const TOPIC_GROUP: Record<string, Group> = Object.fromEntries(
  Object.entries(TOPIC_INFO).map(([t, [g]]) => [t, g]),
);
export const TOPIC_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(TOPIC_INFO).map(([t, [, s]]) => [t, s]),
);

export type Source = "inquiry" | "donor" | "staff";

export interface Submission {
  id: string;
  submittedAt: string;
  topic: string;
  heardAbout: string;
  message: string;
  form: string;
  clickupTaskId?: string;
}

export interface Gift {
  id: string;
  date: string;
  amount: number;
  campaign: string;
  method: string;
  /** Source-row key from the donor sheet, so re-imports don't duplicate gifts. */
  ref?: string;
}

export type NoteKind = "note" | "call" | "email" | "meeting" | "update";

export interface Note {
  id: string;
  at: string;
  author: string;
  kind: NoteKind;
  text: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  org: string;
  role: string;
  group: Group;
  status: Status;
  owner: string | null;
  /** YYYY-MM-DD — the "reach out by" date. */
  followUp: string | null;
  createdAt: string;
  sources: Source[];
  submissions: Submission[];
  gifts: Gift[];
  notes: Note[];
}

export interface DB {
  people: Person[];
  /** Signed-in user's name. */
  me: string;
  /** ASC team members who have signed in; used for owner pickers. */
  team: string[];
  status: "loading" | "ready" | "forbidden" | "error";
  saveError?: boolean;
}
