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

For local reports run `docker compose up -d db mailhog`. MailHog accepts SMTP on localhost:1025 and displays messages at http://localhost:8025. Set a random SESSION_SECRET for signed PDF links. Compose defaults to the mailhog hostname, with SMTP_HOST available for external SMTP. Apply migrations with `pnpm exec prisma migrate deploy` before starting the app.

- `src/app/` contains App Router pages, layouts and route handlers.
- `src/server/` contains services and business logic. Keep it free of UI code.
- `src/lib/` contains shared utilities, Zod schemas and `i18n.ts`.
- `src/pdf/` contains PDF templates and rendering.
- `src/ai/` contains the voice pipeline.
- `prisma/` contains the schema and future migrations.
- `tests/unit/` contains Vitest tests. `tests/e2e/` contains Playwright tests.
- `reference/` points to the original files in `references/`. Treat both as read-only.

## Interface

- Use the Italin wordmark, self-hosted Cairo and the color tokens in `src/app/globals.css`.
- Keep signed-in navigation in `src/app/brand/`. Check the sidebar on desktop and the top-bar menu on mobile. Run Playwright once with the default mobile profile and once with `E2E_DESKTOP=1`.
- Keep the [Arabic keeper guide](docs/KEEPER-GUIDE.md) aligned with the controls in the app.

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
