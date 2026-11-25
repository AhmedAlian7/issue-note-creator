# Graph Report - issue-note-creator  (2026-11-25)

## Corpus Check
- 178 files · ~169,669 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 652 nodes · 1530 edges · 41 communities (32 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80cd8192`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `ar` - 55 edges
2. `authorize()` - 27 edges
3. `guard()` - 24 edges
4. `currentUser()` - 22 edges
5. `allowed()` - 21 edges
6. `compilerOptions` - 16 edges
7. `PendingLink()` - 15 edges
8. `scripts` - 14 edges
9. `PendingIndicator()` - 12 edges
10. `renderNotePdf()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `compareNote()` --calls--> `renderNotePdf()`  [EXTRACTED]
  scripts/pdf-comparison.ts → src/pdf/render-note-pdf.ts
- `Login()` --calls--> `currentUser()`  [EXTRACTED]
  src/app/login/page.tsx → src/server/session.ts
- `workbook()` --calls--> `sheet()`  [INFERRED]
  src/server/reports/export.ts → src/pdf/note-template.ts
- `Catalog()` --calls--> `listCatalog()`  [EXTRACTED]
  src/app/admin/[section]/page.tsx → src/server/catalog-list.ts
- `GET()` --calls--> `currentUser()`  [EXTRACTED]
  src/app/api/notes/[id]/pdf/route.ts → src/server/session.ts

## Import Cycles
- None detected.

## Communities (41 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (45): GET(), aliases, customerInput, draftTimestamp, id, name, noteInput, optionalText (+37 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (17): dependencies, exceljs, @fontsource-variable/cairo, next, @node-rs/argon2, nodemailer, pdf-lib, pdfjs-dist (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (43): Catalog, defaults, Entry, Extraction, Extractor, phrase, score, Transcriber (+35 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (40): Chart(), FeedRefresh(), Dashboard(), GET(), Frequency, Bucket, Item, ReportNote (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (24): asset(), box(), cache, centers, date, escape(), fields, font() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): AI voice matching design, Architecture and tech stack, Core features: creating a note, Delivery phases, risks and decisions, features for more automation and ease, Overview, Owner features: reports and dashboard, Roles and permissions (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.36
Nodes (7): addressOf(), Mail, MailAttachment, MailResult, resend(), sendMail(), smtp()

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (7): Deploy for free, Prerequisites, Run checks, Run locally, Run locally against Neon, Voice drafts, Warehouse Issue Note Creator

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (7): Coding rules, Definition of Done, Folder layout, graphify, Interface, Local development, Repository guide

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 13 - "Community 13"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 14 - "Community 14"
Cohesion: 0.50
Nodes (3): For /graphify explain, For /graphify path, graphify reference: query, path, explain

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (5): Images and footer, Page and table geometry, Rendering and comparison, Text, Warehouse issue note template

### Community 28 - "Community 28"
Cohesion: 0.40
Nodes (4): إنشاء إذن صرف, التأكيد والمشاركة, دليل أمين المخزن, مراجعة البنود

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (28): thresholds, base, company, defaultCompany, defaultSchedule, field, frequencies, reportSchedule (+20 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (21): 1. Create the Neon database, 2. Create the Cloudflare API token, 3. Create the Resend key, 4. Create the Netlify site, 5. Create the first account, 6. Migrate existing data, 7. Connect GitHub Actions, 8. Verify the live site (+13 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (21): devDependencies, @axe-core/playwright, dotenv, esbuild, eslint, eslint-config-next, eslint-config-prettier, pixelmatch (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (14): scripts, ai:eval, build, db:migrate-pdfs, db:seed, dev, format, lint (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (7): engines, node, name, packageManager, private, type, version

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (61): VoiceResult, CatalogForm(), Entity, RecordFields, StateButton(), useMutation(), metadata, RootLayout() (+53 more)

### Community 38 - "Community 38"
Cohesion: 0.40
Nodes (4): Color palette, Italian Home Furniture — Website Branding Brief, Logo and photography, Typography and layout

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (23): WorkspaceLayout(), POST(), POST(), changeCatalog(), listCatalog(), listUsers(), Action, Actor (+15 more)

### Community 45 - "Community 45"
Cohesion: 0.07
Nodes (22): Navigation(), SubmitButton(), Wordmark(), loginInput, username, identify(), signIn(), signOut() (+14 more)

## Knowledge Gaps
- **243 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `type` (+238 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ar` connect `Community 37` to `Community 0`, `Community 3`, `Community 5`, `Community 6`, `Community 42`, `Community 45`, `Community 29`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `authorize()` connect `Community 42` to `Community 0`, `Community 29`, `Community 3`, `Community 37`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `currentUser()` connect `Community 42` to `Community 0`, `Community 5`, `Community 37`, `Community 45`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _243 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07380520266182698 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._