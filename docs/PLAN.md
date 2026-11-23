# Warehouse Issue Notes App – Plan

Nov 21, 2026

## Overview

The goal is to cut a warehouse issue note from a WhatsApp message plus a Word file to one voice recording, one tap to confirm and one PDF, in under a minute.

**Today:** the warehouse keeper messages you the items, you retype them into Word, print or export, and forward the file to the buyer's WhatsApp Business group.

**Target:** the keeper speaks the items into the app, AI maps them to your product list and the customer, the keeper confirms on one screen, and the app produces a PDF identical to your current template (note number, date, customer, item table, signature line, footer with QR code) ready to share to WhatsApp.

**Success measures**

- Note created in under 60 seconds from opening the app.
- At least 90% of spoken items matched correctly without manual edits after the first month.
- Zero involvement from you in creating routine notes.
- No duplicate or missing note numbers.

## Roles and permissions

Three roles cover the process; each user logs in with a phone number or PIN, so the keeper never types a password.

| Role | Main job | Can do | Cannot do |
| --- | --- | --- | --- |
| Admin / data manager | Keeps master data clean | Add, edit, archive products; manage customers and destinations; manage users | See financial insights unless granted |
| Warehouse keeper | Creates notes | Record by voice, review, edit, confirm, print or share notes; see own recent notes; add a new product when the voice match finds none | Edit or delete existing products; delete confirmed notes |
| Owner | Oversees everything | Dashboard, report settings, email schedule, user management, void or reissue any note, view audit log | Nothing is blocked |

**Rules that protect the data**

- A confirmed note is locked. Changes create a new version and the old one stays visible as superseded.
- Voiding a note needs the owner or admin and a reason.
- Every action is logged with user and time.

## Core features: creating a note

The keeper's screen has one giant microphone button; everything else is secondary.

1. **Open the app and tap the mic.** Hold or tap to start, tap again to stop. A text box is available as a fallback.
2. **Speak naturally in Egyptian Arabic**, for example: "MENON, one Sydney three-seater, one Sydney two-seater, four Sydney armchairs, eighteen Noble chairs for Karma Hotel."
3. **AI builds a draft note.** It picks the customer, matches each item to the product list, extracts quantities and puts the destination in the notes column.
4. **Review screen.** Each line shows the matched product name, quantity and notes. Confident matches are green; uncertain ones are yellow with the top 3 alternatives as tap-to-choose chips; unmatched ones are red: the app says the product does not exist and shows an Add as new product button with a short form pre-filled with the spoken name; once saved, the line is matched automatically.
5. **Edit anything.** Change quantity with plus and minus buttons, swap a product, edit notes, delete or add a line by voice or search, change the customer.
6. **Confirm.** The app assigns the next number automatically (continuing from 972) and stamps today's date.
7. **PDF is generated** and shown as a preview, with Share to WhatsApp, Print and Download buttons.

**PDF requirements**

- Pixel-matched to your attached template: logo and watermark, RTL Arabic layout, customer, number, date, 10-row table with serial, item, quantity and notes, receipt statement, signature lines for approver, storekeeper and driver, and the footer with website, phone and QR code.
- If a note has more than 10 lines, it continues onto a second page automatically with the same note number and "page 1 of 2".
- Destination notes such as the hotel name print in red like the current template.
- Saved permanently and searchable by number, customer and date.

## Owner features: reports and dashboard

The owner gets automatic email reports and a mobile-friendly dashboard, with no manual exporting.

**Automatic email reports**

| Report | When | Contents |
| --- | --- | --- |
| Daily | End of day, time you choose (default 8 PM) | Notes issued today, per customer, per product, total units, PDF attached or linked |
| Weekly | Start of week, day and time you choose | Totals vs previous week, top customers and products, busiest day |
| Monthly | First day of month | Full summary, trends, customer ranking, slow-moving products, Excel export attached |

- Recipients are configurable (several emails, for example you and an accountant).
- Reports are skipped or marked "no activity" on days without notes, as you prefer.
- Each email includes a link that opens the matching dashboard view.

**Dashboard**

- Today's notes with status, and a live feed as the keeper creates them.
- Charts: units issued by day, by product, by customer, and by destination.
- Top and slow-moving products, customer ranking, average notes per day.
- Searchable archive of all notes with filters (date, customer, product, number) and PDF re-download.
- Export to Excel or CSV.

**Configuration (owner only)**

- Report schedule and recipients, company details on the PDF (logo, phone, website, QR code target).
- Note numbering (starting number, prefix), customers list, users and roles.
- AI settings such as confidence threshold for auto-accept.

## features for more automation and ease

The first group makes the note faster; the second removes work for you; the third protects the business.

**Faster note creation**

- **Duplicate last note:** one tap to reuse a recurring order, then change quantities.
- **Customer shortcuts:** the keeper's home screen shows the customers he used most as big buttons.
- **Quantity by voice corrections:** say "change the Noble chairs to 20" or "remove the second line" to edit by voice. IMPORTANT\
the user can edit the generated note easily (edit & add new rows & delete some rows)
- **Multiple speakers and pauses:** recording can be paused and resumed so the keeper can load goods while talking. Important
- **Offline mode:** record and queue notes when the warehouse has weak signal; they sync automatically.
- **Arabic-first, large-button interface** with icons, so anyone can use it without training.

**Less work for you**

- **One-tap WhatsApp sharing:** the PDF opens in the phone's share sheet, so it reaches the buyer's WhatsApp group in a couple of taps (manual at first). Later: WhatsApp Business API to send it automatically.
- **Reissue and amend:** edit a confirmed note with a logged reason and a new version, instead of starting over.

**Business control**

- **Anomaly alerts:** warn when a quantity is unusually high for a product or when the same note looks duplicated.
- **Customer statements:** list all notes issued to a customer for any period, ready to send.

## AI voice matching design

Accuracy comes from using AI for understanding speech only, and constraining every answer to your own product and customer lists.

1. **Speech to text.** Use a speech model that handles Egyptian Arabic and mixed Arabic and English words. Send it a hint list of your product and customer names to improve recognition.
2. **Structured extraction.** An LLM receives the transcript plus the full product and customer lists and must return JSON only: customer, and lines with product ID, quantity and notes. It cannot invent products: anything not in the list comes back as unmatched, with the spoken name.
3. **Fuzzy matching safety net.** The returned names are checked against the list with Arabic-aware text matching (normalising spelling such as alef and taa marbuta variants) and each line gets a confidence score.
4. **Confidence routing.** High confidence shows green; medium shows the top 3 candidates; low is flagged for manual selection. The keeper always confirms before a note exists.
5. **Learning aliases.** When the keeper corrects a match, the app saves the spoken phrase as an alias of that product, so the same mistake does not repeat.

**Product list design for good matching**

- Each product has a name, optional aliases (for example, "sydney 3-seater" and "ثلاثية سيدني"), category, and unit.
- Quantities spoken as Arabic words or digits are both accepted.
- Customers have aliases and a default destination or WhatsApp group. With about 5 customers and 20 to 30 products, both full lists fit in every AI request.

**Cost and privacy:** a typical note is under 30 seconds of audio and one short LLM call, so cost per note is very low. Audio can be deleted right after transcription; only the transcript is kept for audit.

## Architecture and tech stack

A single backend serves all three roles and calls the AI, PDF and email services, so your factory data stays in one database.

&#91;embedded content: system architecture · 3 apps, 1 API, 4 services\]

Every request from the keeper, admin or owner goes through the API; the API alone talks to the database, AI service and PDF generator, and the scheduled jobs send the owner's emails.

**Recommended stack (built for AI-agent coding)**

- **Language and app:** TypeScript end to end with Next.js (screens and API in one repo), so the agent works in one language with one set of types.
- **Database:** PostgreSQL with Prisma (schema as code, migrations and seed scripts).
- **Validation:** Zod schemas shared by the screens, the API and the AI output, so bad data is rejected everywhere.
- **Frontend:** mobile-first PWA with Tailwind and Arabic RTL layout, installable on the phone's home screen, using the browser's microphone recording.
- **AI:** a speech-to-text API that supports Egyptian Arabic, then an LLM with structured JSON output checked against the Zod schema and your product list.
- **PDF:** your template rebuilt as an HTML page with an embedded Arabic font, rendered to PDF with headless Chromium (Playwright) for exact RTL shaping and layout.
- **Scheduled reports:** an hourly GitHub Actions call to a protected `/api/cron/reports` endpoint, with `ReportLog` rows making each period idempotent, and email sent through Resend or Nodemailer.
- **Hosting:** Netlify Free for the Next.js app, Neon Free PostgreSQL for data and issued PDF bytes, and Cloudflare Browser Run for PDF rendering, with nightly database backups. See `docs/FREE_CLOUD_DEPLOYMENT.md`.

**Making the project easy for an AI coding agent (Codex)**

- An AGENTS.md file at the repo root: how to run, test and lint, the folder layout, naming rules, and where business logic lives.
- Small ordered tasks that follow the delivery phases, each with acceptance criteria, instead of one giant prompt.
- Checks the agent runs itself: type check, ESLint, Vitest unit tests and Playwright end-to-end tests of the note flow, also run in CI on every pull request.
- A golden PDF test: render a sample note and compare it with your approved template image so the layout cannot drift.
- AI test fixtures: recorded transcripts with the expected JSON lines, so matching logic is tested without calling the AI.
- Seed data (5 customers, 20 to 30 products) and one-command local setup with Docker Compose.
- You review and merge the pull requests; API keys stay in environment files, never in the repo.

**Main data tables**

| Table | Key fields |
| --- | --- |
| Product | name, aliases, category, active |
| Customer | name, aliases, default destination, WhatsApp group |
| IssueNote | number, date, customer, status, version, creator, PDF file |
| NoteLine | note, product, quantity, notes |
| Recording | note, transcript, match confidence |
| User | name, role, phone and PIN |
| AuditLog | who, what, when, old and new value |
| ReportSetting | frequency, time, recipients |

## Delivery phases, risks and decisions

Build the working note flow first, then the owner's reports, then the extras; each phase is usable on its own.

| Phase | Scope | You can use it when |
| --- | --- | --- |
| 1. Foundation | Login and roles, product and customer lists, manual note creation, numbering, exact PDF template | Notes can be created by typing, replacing Word |
| 2. Voice | Recording, transcription, AI matching, review and edit screen, alias learning | The keeper creates notes by voice |
| 3. Owner tools | Note archive, dashboard, daily, weekly and monthly email reports, settings | You stop receiving WhatsApp messages and get reports instead |
| 4. Extras | One-tap WhatsApp sharing, WhatsApp Business API sending, receiver signature, offline mode, owner notifications, costing integration | Based on what the team asks for after real use |

**Main risks and mitigations**

- **Arabic dialect and product names misheard:** hint lists, fuzzy matching, learned aliases and mandatory confirmation.
- **Template mismatch:** build the PDF from your Word file first and compare side by side before launch.
- **Weak signal in the warehouse:** offline queue and a typing fallback.
- **Wrong or duplicate numbers:** the server alone assigns numbers, in a transaction.
- **Keeper resistance:** a pilot week where he uses the app and Word runs in parallel.

**Decisions made**

- The keeper speaks Egyptian Arabic. Spoken product names are matched against the products in the database; if none matches, the app says so and asks him to add it as a new product.
- WhatsApp sending is manual at first (share the PDF); automatic sending through the WhatsApp Business API is a later integration.
- No stock tracking.
- Starting data is about 5 customers and 20 to 30 products.
- Report recipients and schedule come from the settings screen, set by the owner.
