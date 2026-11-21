# Repository guide

Read `docs/PLAN.md` for the product requirements. Keep changes within the requested scope.

## Local development

Use Node.js 24 or Node.js 22.15 or newer in the 22.x line. Use the pnpm version pinned in `package.json`.

| Command                                 | Purpose                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                          | Install dependencies from the lockfile.                                                                                   |
| `docker compose up db`                  | Start local PostgreSQL on port 5432.                                                                                      |
| `pnpm dev`                              | Start Next.js at `http://localhost:3000`.                                                                                 |
| `docker compose up --build`             | Build and start both services in Docker. Stop any host dev server first to free port 3000.                                |
| `pnpm lint`                             | Run ESLint.                                                                                                               |
| `pnpm typecheck`                        | Generate route types and run the TypeScript compiler.                                                                     |
| `pnpm test`                             | Run Vitest unit tests once.                                                                                               |
| `pnpm exec playwright install chromium` | Install Chromium for end-to-end tests on this machine.                                                                    |
| `pnpm test:e2e`                         | Run Playwright against a dedicated dev server on port 3100. Stop any existing Next.js dev server for this checkout first. |
| `pnpm build`                            | Build the app for production.                                                                                             |
| `pnpm format`                           | Format supported files with Prettier.                                                                                     |
| `pnpm exec prisma validate`             | Validate the Prisma schema.                                                                                               |

Copy `.env.example` to `.env` for local integration settings. Its database URL connects to the Compose database from the host. The Compose app uses `db` as its database hostname. `TZ` defaults to `Africa/Cairo`.

## Folder layout

- `src/app/` contains App Router pages, layouts and route handlers.
- `src/server/` contains services and business logic. Keep it free of UI code.
- `src/lib/` contains shared utilities, Zod schemas and `i18n.ts`.
- `src/pdf/` contains PDF templates and rendering.
- `src/ai/` contains the voice pipeline.
- `prisma/` contains the schema and future migrations.
- `tests/unit/` contains Vitest tests. `tests/e2e/` contains Playwright tests.
- `reference/` points to the original files in `references/`. Treat both as read-only.

## Coding rules

- Use strict TypeScript and keep functions small and focused.
- Validate every API input with Zod at the API boundary, including body, path and query inputs.
- Keep business logic in `src/server/`. Components render and handle UI interactions. Route handlers validate input and call services.
- Write user-facing text in Arabic and keep it in `src/lib/i18n.ts`. Preserve RTL and mobile layouts with touch targets of at least 48 × 48 pixels.
- Keep secrets out of Git. `.env.example` contains only placeholders and local development defaults.
- Give each single logical change its own Git commit. Include any related tests and lockfile updates in that commit.

## Definition of Done

- The requested acceptance criteria are implemented and verified.
- Run `pnpm lint`, `pnpm typecheck` and `pnpm test` before declaring any task done. Run the build and applicable end-to-end tests for changes that affect them.
- Review the diff for unrelated changes, secrets and changes to reference files, then commit each logical change separately.
