"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { FileUp, HandCoins, Pencil, UserPlus, X } from "lucide-react";
import { csvToObjects } from "@/lib/csv";
import { today } from "@/lib/format";
import { addGift, createPerson, importContactRows, importDonorRows, updatePerson, useDB } from "@/lib/store";
import type { Group, Person } from "@/lib/types";
import { btnPrimary, btnSecondary, GroupSelect, inputCls, OwnerSelect } from "./ui";

export function Dialog({
  trigger,
  title,
  wide = false,
  children,
}: {
  trigger: ReactNode;
  title: string;
  wide?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <>
      {/* stopPropagation: triggers and dialogs can sit inside clickable table rows. */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {trigger}
      </span>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.stopPropagation()}
        className={`m-auto w-full rounded-xl border border-stone-200 p-0 shadow-xl backdrop:bg-ink/40 ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={close} className="text-stone-400 hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {open && <div className="p-5">{children(close)}</div>}
      </dialog>
    </>
  );
}

export function AddPersonDialog() {
  return (
    <Dialog
      title="Add a person"
      trigger={
        <button className={btnPrimary}>
          <UserPlus className="size-4" /> Add person
        </button>
      }
    >
      {(close) => <AddPersonForm onDone={close} />}
    </Dialog>
  );
}

function AddPersonForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const { me } = useDB();
  const [group, setGroup] = useState<Group>("Educational Organizations");
  const [owner, setOwner] = useState<string | null>(me);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const id = createPerson({
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email"),
      phone: get("phone"),
      org: get("org"),
      role: get("role"),
      context: get("context"),
      group,
      owner,
    });
    onDone();
    router.push(`/people/${id}`);
  }

  const field = (name: string, label: string, props: Record<string, unknown> = {}) => (
    <label className="block text-sm">
      <span className="text-stone-600">{label}</span>
      <input name={name} className={`${inputCls} mt-1 w-full`} {...props} />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field("firstName", "First name", { required: true, autoFocus: true })}
        {field("lastName", "Last name")}
        {field("email", "Email", { type: "email" })}
        {field("phone", "Phone", { type: "tel" })}
        {field("org", "Organization")}
        {field("role", "Their role")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-stone-600">Group</span>
          <GroupSelect value={group} onChange={setGroup} className={`${inputCls} mt-1 w-full`} />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">ASC point of contact</span>
          <OwnerSelect value={owner} onChange={setOwner} className={`${inputCls} mt-1 w-full`} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-stone-600">Where did we meet them? What&rsquo;s the opportunity?</span>
        <textarea name="context" rows={3} className={`${inputCls} mt-1 h-auto w-full py-2`} />
      </label>
      <p className="text-xs text-stone-500">Starts as New with a follow-up due in one week.</p>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className={btnSecondary} onClick={onDone}>
          Cancel
        </button>
        <button className={btnPrimary}>Add person</button>
      </div>
    </form>
  );
}

const IMPORTS = {
  contacts: {
    title: "Import contact form responses",
    sheet: "contact form sheet",
    required: "email",
    run: importContactRows,
  },
  donors: {
    title: "Import donations",
    sheet: "donor sheet",
    required: "amount",
    run: importDonorRows,
  },
};
type ImportKind = keyof typeof IMPORTS;

export function ImportDialog({ kind }: { kind: ImportKind }) {
  return (
    <Dialog
      title={IMPORTS[kind].title}
      trigger={
        <button className={btnSecondary}>
          <FileUp className="size-4" /> Import from Sheet
        </button>
      }
    >
      {(close) => <ImportForm kind={kind} onDone={close} />}
    </Dialog>
  );
}

function ImportForm({ kind, onDone }: { kind: ImportKind; onDone: () => void }) {
  const config = IMPORTS[kind];
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const rows = text ? csvToObjects(text) : [];
  const valid = rows.length > 0 && "email" in rows[0] && config.required in rows[0];

  return (
    <div className="space-y-3 text-sm">
      <ol className="list-decimal space-y-1 pl-5 text-stone-600">
        <li>Open the {config.sheet} in Google Sheets.</li>
        <li>
          <b>File → Download → Comma-separated values (.csv)</b>
        </li>
        <li>Choose that file below. Rows already imported are skipped, so re-importing is safe.</li>
      </ol>
      <input
        type="file"
        accept=".csv,text/csv"
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-brand-dark"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          setResult(null);
          setText(file ? await file.text() : "");
        }}
      />
      {text && (
        <p className={valid ? "text-stone-600" : "text-accent"}>
          {valid
            ? `Found ${rows.length} rows.`
            : `This file needs “Email” and “${config.required}” columns. Is it the ${config.sheet}?`}
        </p>
      )}
      {result && <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">{result}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button className={btnSecondary} onClick={onDone}>
          {result ? "Done" : "Cancel"}
        </button>
        {!result && (
          <button
            className={btnPrimary}
            disabled={!valid}
            onClick={() => {
              const r = config.run(rows);
              setResult(
                kind === "donors"
                  ? `Added ${r.added} new donors, ${r.merged} gifts to existing people, skipped ${r.skipped}.`
                  : `Added ${r.added} new, attached ${r.merged} to existing people, skipped ${r.skipped}.`,
              );
            }}
          >
            Import
          </button>
        )}
      </div>
    </div>
  );
}

export function EditPersonDialog({ person }: { person: Person }) {
  return (
    <Dialog
      title="Edit contact details"
      trigger={
        <button className={btnSecondary}>
          <Pencil className="size-4" /> Edit
        </button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const get = (k: string) => String(f.get(k) ?? "").trim();
            updatePerson(
              person.id,
              {
                firstName: get("firstName"),
                lastName: get("lastName"),
                email: get("email"),
                phone: get("phone"),
                org: get("org"),
                role: get("role"),
              },
              "Edited contact details",
            );
            close();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field name="firstName" label="First name" defaultValue={person.firstName} required />
            <Field name="lastName" label="Last name" defaultValue={person.lastName} />
            <Field name="email" label="Email" type="email" defaultValue={person.email} />
            <Field name="phone" label="Phone" type="tel" defaultValue={person.phone} />
            <Field name="org" label="Organization" defaultValue={person.org} />
            <Field name="role" label="Their role" defaultValue={person.role} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={btnSecondary} onClick={close}>
              Cancel
            </button>
            <button className={btnPrimary}>Save</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

const GIFT_METHODS = ["Card", "Check", "Cash", "Payment link", "Stock", "Other"];

export function RecordGiftDialog({ person }: { person: Person }) {
  const { people } = useDB();
  const campaigns = [...new Set(people.flatMap((p) => p.gifts.map((g) => g.campaign)))].sort();
  return (
    <Dialog
      title="Record a gift"
      trigger={
        <button className={btnSecondary}>
          <HandCoins className="size-4" /> Record gift
        </button>
      }
    >
      {(close) => (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const get = (k: string) => String(f.get(k) ?? "").trim();
            addGift(person.id, {
              amount: Number(get("amount")),
              date: get("date"),
              campaign: get("campaign") || "General",
              method: get("method"),
            });
            close();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field name="amount" label="Amount ($)" type="number" min="1" step="0.01" required autoFocus />
            <Field name="date" label="Date" type="date" defaultValue={today()} required />
            <Field name="campaign" label="Campaign" list="campaigns" placeholder="General" />
            <label className="block text-sm">
              <span className="text-stone-600">Method</span>
              <select name="method" className={`${inputCls} mt-1 w-full`}>
                {GIFT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <datalist id="campaigns">
            {campaigns.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={btnSecondary} onClick={close}>
              Cancel
            </button>
            <button className={btnPrimary}>Record gift</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="text-stone-600">{label}</span>
      <input className={`${inputCls} mt-1 w-full`} {...props} />
    </label>
  );
}
