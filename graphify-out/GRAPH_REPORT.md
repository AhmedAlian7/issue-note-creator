# Graph Report - issue-note-creator  (2026-11-23)

## Corpus Check
- 152 files · ~58,413 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 600 nodes · 1363 edges · 37 communities (29 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb83911b`
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
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]

## God Nodes (most connected - your core abstractions)
1. `ar` - 44 edges
2. `authorize()` - 27 edges
3. `guard()` - 24 edges
4. `allowed()` - 19 edges
5. `currentUser()` - 18 edges
6. `compilerOptions` - 16 edges
7. `scripts` - 14 edges
8. `renderNotePdf()` - 12 edges
9. `What You Must Do When Invoked` - 11 edges
10. `Free cloud deployment` - 11 edges

## Surprising Connections (you probably didn't know these)
- `compareNote()` --calls--> `renderNotePdf()`  [EXTRACTED]
  scripts/pdf-comparison.ts → src/pdf/render-note-pdf.ts
- `NewProduct()` --calls--> `guard()`  [EXTRACTED]
  src/app/products/new/page.tsx → src/server/session.ts
- `workbook()` --calls--> `sheet()`  [INFERRED]
  src/server/reports/export.ts → src/pdf/note-template.ts
- `Catalog()` --calls--> `guard()`  [EXTRACTED]
  src/app/admin/[section]/page.tsx → src/server/session.ts
- `GET()` --calls--> `readPdf()`  [EXTRACTED]
  src/app/api/notes/[id]/pdf/route.ts → src/server/pdf-storage.ts

## Import Cycles
- None detected.

## Communities (37 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (38): CatalogForm(), Entity, RecordFields, StateButton(), useMutation(), metadata, RootLayout(), Home() (+30 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (37): dependencies, exceljs, next, @node-rs/argon2, nodemailer, pdf-lib, pdfjs-dist, playwright (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (53): Catalog, defaults, Entry, Extraction, Extractor, phrase, score, thresholds (+45 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (35): Chart(), FeedRefresh(), Dashboard(), GET(), GET(), Bucket, Item, ReportNote (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (24): asset(), box(), cache, centers, date, escape(), fields, font() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): AI voice matching design, Architecture and tech stack, Core features: creating a note, Delivery phases, risks and decisions, features for more automation and ease, Overview, Owner features: reports and dashboard, Roles and permissions (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (28): base, company, defaultCompany, defaultSchedule, field, frequencies, Frequency, reportSchedule (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): Deploy for free, Prerequisites, Run checks, Run locally, Voice drafts, Warehouse Issue Note Creator

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (6): Coding rules, Definition of Done, Folder layout, graphify, Local development, Repository guide

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
Cohesion: 0.36
Nodes (5): learnAlias(), POST, POST, aliasHandler(), body

### Community 29 - "Community 29"
Cohesion: 0.06
Nodes (64): Archive(), NotePage(), aliases, customerInput, draftTimestamp, id, name, noteInput (+56 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (19): VoiceResult, base, valid, capture(), FirstHelp(), LineCard(), Props, Props (+11 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (21): 1. Create the Neon database, 2. Create the Cloudflare API token, 3. Create the Resend key, 4. Create the Netlify site, 5. Create the first account, 6. Migrate existing data, 7. Connect GitHub Actions, 8. Verify the live site (+13 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (21): devDependencies, @axe-core/playwright, dotenv, esbuild, eslint, eslint-config-next, eslint-config-prettier, pixelmatch (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.36
Nodes (7): addressOf(), Mail, MailAttachment, MailResult, resend(), sendMail(), smtp()

### Community 34 - "Community 34"
Cohesion: 0.40
Nodes (3): env, require, url

## Knowledge Gaps
- **230 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `type` (+225 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ar` connect `Community 0` to `Community 3`, `Community 5`, `Community 6`, `Community 8`, `Community 28`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `authorize()` connect `Community 29` to `Community 0`, `Community 3`, `Community 28`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `guard()` connect `Community 8` to `Community 0`, `Community 5`, `Community 3`, `Community 29`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _230 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.060041407867494824 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._