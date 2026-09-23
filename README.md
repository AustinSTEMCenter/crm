# ASC CRM (demo)

A lightweight CRM for Austin STEM Center: website contact-form inquiries and donors in one
place, with owners, statuses, follow-up dates, an activity timeline, and email drafts.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS 4, Bun
- Clerk for Google-only sign-in (reuses the admin dashboard's Clerk app). The API also
  requires a verified `@austinstemcenter.org` email.
- Upstash Redis for shared data: one hash, `crm:people`, keyed by person id

## Local development

```bash
bun install
bun run dev
```

Create `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
```

## Loading data

The demo data is a snapshot of the contact form sheet and the donor list, exported as CSV
to `data/contact-sheet.csv` and `data/donors.csv`. `data/` holds real contact information.
It is gitignored and excluded from Vercel uploads, so never commit it.

```bash
bun scripts/seed.ts          # loads the CSVs into Redis if crm:people is empty
bun scripts/seed.ts --force  # replaces everything in crm:people
```

After that, use **Import from Sheet** on the Inquiries or Donors page to add new rows.
Rows that were already imported are skipped.

## Deploying

Set the four environment variables above in the Vercel project. The raw CSVs are not
needed there, because the app reads everything from Redis.

## Layout

- `app/(crm)/`: pages (Today, Inquiries, Donors, Everyone, Pipeline, person detail)
- `app/api/people/`: GET/POST for shared data (ASC accounts only)
- `lib/store.ts`: browser store with instant edits and background saves
- `lib/data.ts`: sheet import and merge logic
- `lib/server/`: Redis access and the ASC account check
- `proxy.ts`: sends signed-out visitors to `/sign-in`
