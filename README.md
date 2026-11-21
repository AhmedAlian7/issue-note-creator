# Warehouse Issue Note Creator

An Arabic, right-to-left app for warehouse issue notes and master data.

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

Open [the sign-in page](http://localhost:3000/login). The first seed run prints the phone numbers and generated PINs for the demo owner, admin, and warehouse keeper. Save those credentials for local use. Rerunning the seed preserves existing demo accounts and their PINs.

Press Ctrl+C to stop Next.js. Use `docker compose stop db` to stop PostgreSQL and keep its data.

Confirmed PDFs use the `note-pdfs` Compose volume mounted at `/data/pdfs`. For host development, set `PDF_STORAGE_DIR` in `.env` to a writable directory. Back up the PDF volume alongside PostgreSQL to retain issued versions.

## Voice drafts

Open **إذن صرف بالصوت** from the workspace. The microphone requires HTTPS or localhost. Set `GROQ_API_KEY`, `TRANSCRIBE_MODEL` and `PARSE_MODEL` in the server environment using the model defaults in `.env.example`.

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
