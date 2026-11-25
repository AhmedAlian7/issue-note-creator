# Warehouse Issue Note Creator

An Egyptian Arabic, right-to-left warehouse app for drafting issue notes by voice or by hand, reviewing inventory lines, and sharing numbered PDFs. Owners can manage the catalogue, review the archive and schedule reports. See the [Arabic keeper guide](docs/KEEPER-GUIDE.md).

## Prerequisites

- Node.js 24 or Node.js 22.15 or newer in the 22.x line
- pnpm 11.25.0, as pinned in `package.json`
- Docker with Compose running locally

## Run locally

From the repository root, copy `.env.example` to `.env` if you do not already have one. In PowerShell, use `Copy-Item .env.example .env`. In Bash, use `cp .env.example .env`. The example connects to the Compose PostgreSQL database on port 5432.

```sh
pnpm install --frozen-lockfile
docker compose up -d --wait db
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

Open [the sign-in page](http://localhost:3000/login). The local seed provisions the owner (`ayman`), admin (`ahmed`), and warehouse keeper (`mahmoud`). Each account sets its PIN on first sign-in. Rerunning the seed preserves existing accounts and PINs.

Press Ctrl+C to stop Next.js. Use `docker compose stop db` to stop PostgreSQL and keep its data.

Confirmed PDFs are stored in PostgreSQL in the `PdfDocument` table. For local Docker, set `PDF_STORAGE_DIR` in `.env` to keep them on the `note-pdfs` volume mounted at `/data/pdfs` instead. Leave `PDF_STORAGE_DIR` empty in serverless production so PDFs are stored in the database. To copy existing filesystem PDFs into the database, run `pnpm db:migrate-pdfs` with `PDF_STORAGE_DIR` pointing at the folder; add `--dry-run` to preview.

## Run locally against Neon

Use the hosted database from your machine while keeping tests on local PostgreSQL.

1. In `.env`, set `DATABASE_URL` to the Neon **pooled** connection string (the host contains `-pooler`). Use `sslmode=verify-full` and keep any other parameters from Neon:

   ```
   DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full
   DATABASE_URL_TEST=postgresql://issue_notes:local_dev_only@localhost:5432/issue_notes?schema=public
   ```

2. Apply migrations once through the **direct** host, not the pooler. Neon's pooler can drop the advisory locks that Prisma migrations rely on:

   ```sh
   $env:DATABASE_URL = "postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
   pnpm exec prisma migrate deploy
   Remove-Item Env:DATABASE_URL
   ```

   The direct host is the same string without `-pooler`. Clearing the shell override lets `pnpm dev` use the pooled URL in `.env`.

3. Start the app with `pnpm dev`. The first database request after an idle period can take a few seconds while Neon resumes the compute.

4. Run tests: `pnpm test`. The runner reads `DATABASE_URL_TEST` and creates its throwaway database there, so it never creates or drops databases on Neon. Start the local database first with `docker compose up -d db`.

`docker compose up --build` still forces the container to the Compose database, because the container reaches PostgreSQL by service name. Use `pnpm dev` on the host for Neon.

Never point `DATABASE_URL_TEST` at Neon: the test runner runs `CREATE DATABASE` and `DROP DATABASE ... WITH (FORCE)`.

## Deploy for free

`docs/FREE_CLOUD_DEPLOYMENT.md` explains the $0 hosting setup: Netlify Free for the app, Neon Free PostgreSQL for data and PDFs, Cloudflare Browser Run for PDF rendering, Resend Free for report email, and GitHub Actions for the hourly report cron and nightly backup. It lists verified free-tier limits, required environment variables, migration steps, rollback and a feature checklist.

## Voice drafts

Use the microphone in **مساحة العمل** to start a voice draft. The microphone requires HTTPS or localhost. Set `GROQ_API_KEY`, `TRANSCRIBE_MODEL` and `PARSE_MODEL` in the server environment using the model defaults in `.env.example`.

`POST /api/voice/parse` accepts an audio/webm or audio/mp4 request body up to 10 MiB, or JSON containing a `transcript` string. The response includes the transcript, verified draft and recording ID. Each account can submit ten requests per minute per app process. The owner can configure the `voiceThresholds` setting with numeric `green` and `yellow` values (defaults 0.85 and 0.6).

To save a correction, POST JSON such as `{"alias":"كرسي نوبيل"}` to `/api/products/[id]/aliases` or `/api/customers/[id]/aliases`. Both endpoints use the signed-in session.

Run `pnpm ai:eval` for a live extraction and matching evaluation against the transcript fixtures. It skips when the API key is absent. The automated test suite uses fake providers.

## Run checks

Keep PostgreSQL running. The unit and browser test commands create a temporary database, apply migrations, and remove the database and its PDFs when the run finishes. The test database user needs permission to create databases.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Stop the development server before running Playwright. Playwright starts its own server on port 3100.

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

The default browser profile is mobile. Run the same suite at desktop widths with `E2E_DESKTOP=1 pnpm test:e2e` in Bash or `$env:E2E_DESKTOP = "1"; pnpm test:e2e` in PowerShell.
