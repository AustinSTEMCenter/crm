"use client";

import { useState, type ReactNode } from "react";
import { Copy, ExternalLink, Mail } from "lucide-react";
import { addDays, money, today } from "@/lib/format";
import { lastGift } from "@/lib/people";
import { logEmail, useDB } from "@/lib/store";
import { TOPIC_SHORT, type Person } from "@/lib/types";
import { Dialog } from "./dialogs";
import { btnPrimary, btnSecondary, inputCls } from "./ui";

// Draft copy — review wording with the team before real use.
const TEMPLATES = {
  reply: {
    label: "Reply to inquiry",
    subject: () => "Thanks for reaching out to Austin STEM Center",
    body: (p: Person | null) => {
      const topic = p?.submissions.at(-1)?.topic;
      const about = topic ? ` about ${(TOPIC_SHORT[topic] ?? topic).toLowerCase()}` : "";
      return `Thanks for getting in touch${about}! I'd love to help.\n\n`;
    },
  },
  thanks: {
    label: "Donor thank-you",
    subject: () => "Thank you for supporting Austin STEM Center",
    body: (p: Person | null) => {
      const gift = p && lastGift(p);
      const amount = gift ? ` of ${money(gift.amount)}` : "";
      return `Thank you so much for your generous gift${amount}. Your support helps us bring hands-on STEM to kids across Austin.\n\n`;
    },
  },
  followup: {
    label: "Follow-up",
    subject: () => "Following up from Austin STEM Center",
    body: () => "I wanted to follow up on your note and see if you had any questions.\n\n",
  },
  blank: {
    label: "Blank",
    subject: () => "",
    body: () => "",
  },
};
type TemplateId = keyof typeof TEMPLATES;

const FOLLOW_UPS: { label: string; days: number | null | undefined }[] = [
  { label: "Keep as is", days: undefined },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "Clear", days: null },
];

function defaultTemplate(recipients: Person[]): TemplateId {
  if (recipients.every((p) => p.gifts.length && !p.submissions.length)) return "thanks";
  if (recipients.some((p) => p.status === "New" && p.submissions.length)) return "reply";
  return "followup";
}

/** Button/link that opens the composer for one or more people. */
export function EmailButton({ recipients, children }: { recipients: Person[]; children: ReactNode }) {
  const title =
    recipients.length === 1
      ? `Email ${recipients[0].firstName} ${recipients[0].lastName}`.trim()
      : `Email ${recipients.length} people`;
  return (
    <Dialog title={title} trigger={children} wide>
      {(close) => <Composer recipients={recipients} onDone={close} />}
    </Dialog>
  );
}

function Composer({ recipients, onDone }: { recipients: Person[]; onDone: () => void }) {
  const { me } = useDB();
  const single = recipients.length === 1 ? recipients[0] : null;
  const withEmail = recipients.filter((p) => p.email);
  const addresses = withEmail.map((p) => p.email);

  const fill = (id: TemplateId) => {
    const t = TEMPLATES[id];
    const greeting = `Hi ${single?.firstName || "there"},\n\n`;
    const signature = `Best,\n${me}\nAustin STEM Center\naustinstemcenter.org`;
    return { subject: t.subject(), body: id === "blank" ? "" : greeting + t.body(single) + signature };
  };

  const [template, setTemplate] = useState<TemplateId>(() => defaultTemplate(recipients));
  const [draft, setDraft] = useState(() => fill(template));
  const [followUp, setFollowUp] = useState<number | null | undefined>(single ? 7 : undefined);
  const [copied, setCopied] = useState(false);

  // Several recipients go in BCC so donors don't see each other's addresses.
  const enc = encodeURIComponent;
  const recipientsParam = `${single ? "to" : "bcc"}=${enc(addresses.join(","))}`;
  const content = `su=${enc(draft.subject)}&body=${enc(draft.body)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${recipientsParam}&${content}`;
  const mailtoUrl = single
    ? `mailto:${addresses[0]}?subject=${enc(draft.subject)}&body=${enc(draft.body)}`
    : `mailto:?bcc=${addresses.join(",")}&subject=${enc(draft.subject)}&body=${enc(draft.body)}`;

  function log() {
    const due = followUp === undefined ? undefined : followUp === null ? null : addDays(today(), followUp);
    logEmail(
      withEmail.map((p) => p.id),
      `Subject: ${draft.subject || "(no subject)"}\n\n${draft.body}`,
      due,
    );
    onDone();
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2">
        <span className="w-16 shrink-0 pt-1.5 text-stone-500">{single ? "To" : "Bcc"}</span>
        <div className="min-w-0 flex-1">
          <div className="max-h-20 overflow-y-auto rounded-md bg-stone-50 px-2.5 py-1.5 text-stone-700">
            {addresses.join(", ") || <span className="text-accent">No email address on file</span>}
          </div>
          {recipients.length > withEmail.length && (
            <p className="mt-1 text-xs text-stone-500">
              {recipients.length - withEmail.length} selected people have no email and were left out.
            </p>
          )}
        </div>
      </div>
      <label className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-stone-500">Template</span>
        <select
          className={`${inputCls} flex-1`}
          value={template}
          onChange={(e) => {
            const id = e.target.value as TemplateId;
            setTemplate(id);
            setDraft(fill(id));
          }}
        >
          {Object.entries(TEMPLATES).map(([id, t]) => (
            <option key={id} value={id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-stone-500">Subject</span>
        <input
          className={`${inputCls} flex-1`}
          value={draft.subject}
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
        />
      </label>
      <textarea
        rows={10}
        className={`${inputCls} h-auto w-full py-2 leading-relaxed`}
        value={draft.body}
        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
      />
      <label className="flex items-center gap-2">
        <span className="text-stone-500">Next follow-up</span>
        <select
          className={inputCls}
          value={followUp === undefined ? "keep" : String(followUp)}
          onChange={(e) => {
            const v = e.target.value;
            setFollowUp(v === "keep" ? undefined : v === "null" ? null : Number(v));
          }}
        >
          {FOLLOW_UPS.map((o) => (
            <option key={o.label} value={o.days === undefined ? "keep" : String(o.days)}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-stone-500">
        Opens a pre-filled draft for you to review and send. The email is logged on{" "}
        {single ? "their timeline" : "each person's timeline"}.
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {!single && (
          <button
            type="button"
            className={`${btnSecondary} mr-auto`}
            onClick={async () => {
              await navigator.clipboard.writeText(addresses.join(", "));
              setCopied(true);
            }}
          >
            <Copy className="size-4" /> {copied ? "Copied" : "Copy addresses"}
          </button>
        )}
        <a href={mailtoUrl} onClick={log} className={btnSecondary}>
          <Mail className="size-4" /> Mail app
        </a>
        <a
          href={gmailUrl}
          target="_blank"
          rel="noreferrer"
          onClick={log}
          className={`${btnPrimary} ${addresses.length ? "" : "pointer-events-none opacity-50"}`}
        >
          <ExternalLink className="size-4" /> Open in Gmail
        </a>
      </div>
    </div>
  );
}
