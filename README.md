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
