# Free cloud deployment

This guide moves the app from a laptop or Docker host to a hosted HTTPS address
that runs 24/7 for $0/month and needs no credit card. Nothing here is deployed
automatically: every step is manual and reversible.

## What runs where

| Part                | Service                  | Why                                                                     |
| ------------------- | ------------------------ | ----------------------------------------------------------------------- |
| Web app and API     | Netlify Free             | Runs Next.js server functions, gives HTTPS and a public URL.            |
| Database and PDFs   | Neon Free PostgreSQL     | Managed Postgres. Issued PDFs are stored as bytes in `PdfDocument`.      |
| PDF rendering       | Cloudflare Browser Run   | Renders the Arabic HTML template to PDF through a REST endpoint.        |
| Report email        | Resend Free              | Transactional email API. SMTP remains available as a fallback.          |
| Scheduled reports   | GitHub Actions           | Hourly call to the protected `/api/cron/reports` endpoint.              |
| Backups             | GitHub Actions           | Nightly `pg_dump` artifact, kept for 14 days.                           |

The request flow for an issued note is:

1. The keeper confirms the note in the browser.
2. Netlify runs the server action, which builds the HTML template.
3. The server posts the HTML to Cloudflare Browser Run and receives a PDF.
4. The PDF bytes are written to the `PdfDocument` table in Neon.
5. The note row and the PDF row commit in the same database transaction.

Nothing depends on the user's PC, a Docker volume, or a long-running worker.

## Verified free-tier limits

Checked on 2026-11-23 against the vendor documentation. Re-check before you rely
on them, because vendors change plans.

| Service                 | Free allowance                                                                                                       | Card required | Source                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| Netlify                 | 300 credits/month. Costs: 15 per production deploy, 10 per GB-hour of compute, 20 per GB bandwidth, 2 per 10k requests. | No            | <https://www.netlify.com/pricing/>                                |
| Neon                    | 1 GB storage per project (20 GB per account), 100 CU-hours per project, 5 GB egress per project, scale to zero after 5 minutes. Permanent free plan. | No            | <https://neon.com/pricing>                                        |
| Cloudflare Browser Run  | 10 browser minutes per day, 3 concurrent browsers, one new browser per 20 seconds, 60 second timeout.                | No            | <https://developers.cloudflare.com/browser-run/limits/>           |
| Resend                  | 3,000 emails/month, 100/day, 3 verified domains, 10 requests/second. Each BCC recipient counts as one email.          | No            | <https://resend.com/docs/knowledge-base/account-quotas-and-limits> |
| GitHub Actions          | Public repositories: free. Private repositories: $12 of included compute per month; usage stops when it is used up unless a payment method is added. | No | <https://docs.github.com/en/billing/concepts/product-billing/github-actions> |

### What those limits mean in practice

- **Netlify:** a deploy costs 15 credits, so 20 deploys already use the whole
  month. Deploy once, test on the live URL, and use deploy previews only when
  needed. Server functions are billed only while they run, not while idle.
- **Neon:** 100 CU-hours is roughly 0.25 CU running for 400 hours, which is far
  more than this app needs. Scale to zero adds about half a second to the first
  query after an idle period.
- **Cloudflare:** a note PDF takes a few seconds. 10 minutes per day is enough
  for dozens of notes. The 60 second browser timeout is the hard ceiling for one
  render, and Netlify stops a function at 60 seconds too.
- **Resend:** the schedule defaults to one report per period, so three reports
  per day at most, each with one recipient address per person in BCC.
- **GitHub Actions:** the hourly cron and the nightly backup are the only
  scheduled jobs. If the repository is private, keep an eye on the billing page;
  scheduled workflows also stop after 60 days without repository activity.

### Known limits and risks

- **Storage is the real ceiling.** Neon Free holds 1 GB of Postgres data. A note
  PDF is typically 100-300 KB, so roughly 3,000-8,000 issued notes fit. When the
  database is full, writes fail. Download old PDFs and delete them, or upgrade
  Neon, before that happens.
- **Cloudflare Browser Run is a shared free pool.** When the daily 10 minutes
  are used, rendering returns `429` until the next UTC day. Confirming a note
  then fails with an error instead of producing a PDF.
- **Resend needs a verified domain** to send to arbitrary recipients. Without
  one, use the Resend test sender only for your own address, or keep SMTP.
- **Netlify Free credits are not overage-billed**, because no payment method is
  attached. When the credits are used, the site is limited until the next cycle.
- **The `pg-boss` worker is gone.** Reports now depend on the GitHub Actions
  cron. If that workflow is disabled, no scheduled report is sent.
- **No PWA manifest or service worker exists in the repository.** The app is
  usable on a phone through the browser and HTTPS, but it cannot be installed
  as an offline app. Adding that is separate work.

## Accounts to create

Create these in order. Use the same email address so you can find them later.

1. **GitHub** account that owns this repository.
2. **Neon** account at <https://neon.com/signup>, sign in with GitHub.
3. **Cloudflare** account at <https://dash.cloudflare.com/sign-up>.
4. **Resend** account at <https://resend.com/signup>.
5. **Netlify** account at <https://app.netlify.com/signup>, sign in with GitHub.

Keep a note of the login email for each one. None of these steps asks for a
card. If a screen asks for card details, stop and check that you are on a free
plan before continuing.

## Environment variables

Set these in Netlify under **Site configuration > Environment variables**. Mark
every secret as a secret value.

| Variable                | Required | Value                                                                 |
| ----------------------- | -------- | --------------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | Neon pooled connection string, with `?sslmode=require`.                |
| `SESSION_SECRET`        | Yes      | Long random string. Signs report PDF links. Rotating it invalidates old links. |
| `APP_BASE_URL`          | Yes      | Public site URL, for example `https://issue-notes.netlify.app`.        |
| `TZ`                    | Yes      | `Africa/Cairo`.                                                        |
| `PDF_RENDERER`          | Yes      | `cloudflare`.                                                          |
| `CLOUDFLARE_ACCOUNT_ID` | Yes      | Account ID from the Cloudflare dashboard URL.                          |
| `CLOUDFLARE_API_TOKEN`  | Yes      | Token with the Browser Rendering permission.                           |
| `RESEND_API_KEY`        | Yes      | Resend API key.                                                        |
| `MAIL_FROM`             | Yes      | Verified sender, for example `warehouse@your-domain.com`.               |
| `CRON_SECRET`           | Yes      | Random string. The cron workflow sends it as a bearer token.            |
| `GROQ_API_KEY`          | For voice| Groq key used by transcription and parsing.                            |
| `TRANSCRIBE_MODEL`      | For voice| `whisper-large-v3`.                                                    |
| `PARSE_MODEL`           | For voice| `openai/gpt-oss-120b`.                                                 |
| `AI_PROVIDER`           | No       | Leave unset in production. `fake` is for tests only.                    |
| `PDF_STORAGE_DIR`       | No       | **Leave unset in production.** Setting it switches to filesystem storage. |
| `SMTP_*`                | No       | Only when you want SMTP instead of Resend.                             |

Generate random secrets with Node.js:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Run it twice: once for `SESSION_SECRET`, once for `CRON_SECRET`.

`DATABASE_URL` for Neon looks like this:

```
postgresql://USER:PASSWORD@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Use the **pooled** host, the one containing `-pooler`. Serverless functions open
many short connections, and the pooler prevents connection exhaustion.

## Step-by-step deployment

### 1. Create the Neon database

1. Sign in to Neon and choose **New project**.
2. Pick a region close to your users, for example Frankfurt or AWS eu-central-1.
3. Open **Connection details**, select the pooled connection, and copy the
   string.
4. Apply the schema from your machine:

```sh
$env:DATABASE_URL = "postgresql://...-pooler.../neondb?sslmode=require"
pnpm exec prisma migrate deploy
```

`prisma migrate deploy` only applies migrations. It never drops data.

### 2. Create the Cloudflare API token

1. Open <https://dash.cloudflare.com/profile/api-tokens>.
2. Choose **Create Token > Custom token**.
3. Add the account permission for **Browser Rendering > Edit**.
4. Restrict the token to your account, create it, and copy the value once.
5. Copy the account ID from the dashboard URL: the hex string after
   `dash.cloudflare.com/`.

Test the token before deploying:

```sh
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/browser-run/pdf" `
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"html":"<h1>test</h1>"}' --output test.pdf
```

A non-zero `test.pdf` means rendering works. An error here means the app cannot
issue notes, so fix it before continuing.

### 3. Create the Resend key

1. Sign in to Resend and add your domain under **Domains**.
2. Add the DNS records it shows, then wait for verification.
3. Create an API key with sending permission and copy it.

Without a verified domain, Resend only delivers to the account owner's address.
For a quick trial, set `MAIL_FROM` to `onboarding@resend.dev` and send only to
yourself.

### 4. Create the Netlify site

1. In Netlify choose **Add new site > Import an existing project**.
2. Connect GitHub and pick this repository and the `main` branch.
3. Netlify reads `netlify.toml`: build command `pnpm build`, Node 22.15.
4. Add every environment variable from the table above before the first deploy.
5. Deploy. The first build installs dependencies, runs `prisma generate` from
   `postinstall`, and publishes the site.

If the build fails on a missing PDF asset, check that
`outputFileTracingIncludes` in `next.config.ts` still lists `./src/pdf/**/*` and
that `netlify.toml` still includes `src/pdf/**/*`.

### 5. Create the first account

The seed script creates demo users with generated PINs. For a real deployment,
run it once against Neon and then change the PINs, or create the owner through
your normal process:

```sh
$env:DATABASE_URL = "postgresql://...neon.../neondb?sslmode=require"
pnpm db:seed
```

The seed prints the phone numbers and PINs. Save them, sign in, and change the
PINs immediately. Do not commit the output.

### 6. Migrate existing data

If the current production data lives in Docker PostgreSQL:

```sh
# 1. Dump the old database.
docker exec issue-note-creator-db-1 pg_dump -U issue_notes -Fc issue_notes > issue-notes.dump

# 2. Restore into Neon. Use the direct (non-pooled) host for the restore.
pg_restore --no-owner --no-privileges --dbname "postgresql://...direct.../neondb?sslmode=require" issue-notes.dump
# No local PostgreSQL tools? Run the same command in a container:
# docker run --rm -i postgres:17 pg_restore --no-owner --no-privileges `
#   --dbname "postgresql://...direct.../neondb?sslmode=require" < issue-notes.dump

# 3. Copy the PDF files from the volume into Postgres.
$env:DATABASE_URL = "postgresql://...direct.../neondb?sslmode=require"
$env:PDF_STORAGE_DIR = "\\?\D:\path\to\pdf-volume"   # folder that holds the PDFs
pnpm db:migrate-pdfs --dry-run
pnpm db:migrate-pdfs
```

`db:migrate-pdfs` copies each `pdfPath` file into `PdfDocument` and is safe to
rerun. It exits with a non-zero code when a file is missing, so you can see which
notes need attention. Run it before removing `PDF_STORAGE_DIR` from the old
environment. Do not point two live apps at the same database.

### 7. Connect GitHub Actions

Add repository secrets under **Settings > Secrets and variables > Actions**:

| Secret                | Used by                          |
| --------------------- | -------------------------------- |
| `APP_BASE_URL`        | `cron-reports.yml`               |
| `CRON_SECRET`         | `cron-reports.yml`               |
| `DATABASE_URL`        | `backup.yml`                     |
| `NETLIFY_AUTH_TOKEN`  | `deploy.yml`, optional           |
| `NETLIFY_SITE_ID`     | `deploy.yml`, optional           |

Then run the workflows once by hand:

1. **Scheduled reports** > **Run workflow**. Expect HTTP 200 and a JSON body with
   `"ok": true`.
2. **Database backup** > **Run workflow**. Expect a dump artifact.

The deploy workflow is optional. Netlify already deploys on push. Keep the
workflow for the migration step if you prefer one button that applies migrations
and deploys together.

### 8. Verify the live site

Walk through this list on a phone and on a desktop:

1. Sign in as OWNER, ADMIN and KEEPER. Each role sees only its own screens.
2. Create a customer and a product.
3. Record a voice draft (allow the microphone), then correct the transcript.
4. Confirm a note. The number is sequential and a PDF appears.
5. Download the PDF. Arabic text is connected and right-aligned, the QR code and
   footer are present.
6. Amend the note. The new version gets a new PDF; the old version is still
   downloadable.
7. Void a note. It cannot be edited and stays visible in the archive.
8. Open the dashboard and change the date range.
9. Send a test report from Settings. Check the email and the PDF attachment.
10. Open a report PDF link, then confirm an expired or edited link is rejected.

## Scheduled reports

The GitHub Actions workflow calls the endpoint every hour at minute 7. The
endpoint reads the saved schedule in `Africa/Cairo`, sends what is due, and
records the period in `ReportLog` so a second call cannot send the same report.

- Daily and weekly reports run on the configured time and weekday.
- Monthly reports run on the configured day. A day that does not exist in a
  given month, such as 31 in April, is skipped for that month; pick a day from 1
  to 28 if every month must send.
- Failed sends are retried after ten minutes, up to five attempts per run.
- The endpoint returns `503` when `CRON_SECRET` is unset and `401` for a wrong
  token, so an unauthenticated caller cannot trigger email.

To test by hand:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" https://your-site.netlify.app/api/cron/reports
```

## Backups and restore

- **Automatic:** `backup.yml` dumps the database nightly at 02:17 UTC and keeps
  the artifact for 14 days.
- **Manual:** run the workflow, or `pg_dump --format=custom` against Neon.
- **Restore:** create a new Neon branch or database, run
  `pg_restore --no-owner --no-privileges`, then point `DATABASE_URL` at it and
  redeploy. PDFs live in the same database, so a database restore also restores
  every issued PDF.

Neon Free keeps 6 hours of history for instant restore, and one manual snapshot.
Take a manual snapshot before any migration you are unsure about.

## Rollback

The deployment is additive, so rolling back is safe:

1. In Netlify, open **Deploys**, pick the previous successful deploy, and choose
   **Publish deploy**. The site returns to the old build in seconds.
2. If the database change is the problem, restore the pre-migration dump into a
   new Neon branch and repoint `DATABASE_URL`.
3. To stop scheduled email, disable the **Scheduled reports** workflow in GitHub.
4. To go back to local hosting, set `PDF_STORAGE_DIR` again and run the app with
   Docker Compose. The `PdfDocument` rows stay in the database and are ignored by
   the filesystem driver; the old `pdfPath` files are untouched.

Nothing in this guide deletes the old database or the old PDF volume. Keep both
until the new site has run for a full week.

## Feature checklist

- [ ] Sign-in with PIN, signed session cookie, OWNER / ADMIN / KEEPER roles.
- [ ] Role-based access to settings, master data, notes and reports.
- [ ] Customers and products, including aliases and review flags.
- [ ] Arabic RTL layout on phone and desktop, 48x48 touch targets.
- [ ] Issue note creation, sequential numbering, DRAFT / CONFIRMED / VOIDED.
- [ ] Versions and audit log for every change.
- [ ] Arabic PDF with embedded fonts, QR code and footer.
- [ ] Historical PDF download for every confirmed version.
- [ ] Voice transcription and parsing with Groq.
- [ ] Daily, weekly and monthly email reports with PDF attachment.
- [ ] Dashboard with range selection and recent activity.
- [ ] WhatsApp share text for a confirmed note.
- [ ] Nightly database backup artifact.
- [ ] No card on file for any service.

## Troubleshooting

| Symptom                                   | Cause and fix                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| Note confirmation fails with `429`        | Cloudflare daily browser limit reached. Wait for the next UTC day.            |
| `CRON_SECRET is not configured` (503)     | Add `CRON_SECRET` in Netlify, then redeploy so the function sees it.           |
| Cron returns `401`                        | The GitHub secret and the Netlify value differ. Copy the same string to both.  |
| PDF download is 404 after migration       | The file was never copied. Run `pnpm db:migrate-pdfs` with `PDF_STORAGE_DIR`.  |
| Report email not delivered                | Check Resend domain verification and the 100/day quota. `MAIL_FROM` must match a verified sender. |
| Arabic text renders as boxes              | A font file is missing from the bundle. Check the `included_files` setting.    |
| Build fails on `prisma generate`          | `DATABASE_URL` is not set for the build environment. Prisma needs it at build time. |
| Slow first request after idle             | Neon resumed from scale to zero. Expected, about half a second.                |
