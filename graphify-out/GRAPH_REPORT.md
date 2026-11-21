# Graph Report - issue-note-creator  (2026-11-21)

## Corpus Check
- 114 files · ~42,791 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 418 nodes · 824 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `769aeb97`
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
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]

## God Nodes (most connected - your core abstractions)
1. `ar` - 27 edges
2. `authorize()` - 26 edges
3. `guard()` - 17 edges
4. `compilerOptions` - 16 edges
5. `allowed()` - 15 edges
6. `currentUser()` - 14 edges
7. `scripts` - 13 edges
8. `What You Must Do When Invoked` - 11 edges
9. `/graphify` - 10 edges
10. `renderNotePdf()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `compareNote()` --calls--> `renderNotePdf()`  [EXTRACTED]
  scripts/pdf-comparison.ts → src/pdf/render-note-pdf.ts
- `NewProduct()` --calls--> `guard()`  [EXTRACTED]
  src/app/products/new/page.tsx → src/server/session.ts
- `VoicePage()` --calls--> `guard()`  [EXTRACTED]
  src/app/voice/page.tsx → src/server/session.ts
- `Catalog()` --calls--> `guard()`  [EXTRACTED]
  src/app/admin/[section]/page.tsx → src/server/session.ts
- `GET()` --calls--> `currentUser()`  [EXTRACTED]
  src/app/api/notes/[id]/pdf/route.ts → src/server/session.ts

## Import Cycles
- None detected.

## Communities (30 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (18): loginInput, signIn(), signOut(), accounts, customers, products, audit(), snapshot() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (12): dependencies, next, @node-rs/argon2, pdf-lib, pdfjs-dist, playwright, @prisma/adapter-pg, @prisma/client (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (38): Catalog, defaults, Entry, Extraction, Extractor, phrase, score, thresholds (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (19): Archive(), NotePage(), archiveStatus(), listNotes(), noteCatalog(), recentNotes(), NoteList(), listUsers() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (19): asset(), box(), cache, centers, date, escape(), fields, font() (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): AI voice matching design, Architecture and tech stack, Core features: creating a note, Delivery phases, risks and decisions, features for more automation and ease, Overview, Owner features: reports and dashboard, Roles and permissions (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (40): devDependencies, dotenv, esbuild, eslint, eslint-config-next, eslint-config-prettier, pixelmatch, @playwright/test (+32 more)

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (5): Prerequisites, Run checks, Run locally, Voice drafts, Warehouse Issue Note Creator

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

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (42): aliases, customerInput, draftTimestamp, id, name, noteInput, optionalText, phone (+34 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (27): VoiceResult, CatalogForm(), Entity, RecordFields, StateButton(), useMutation(), metadata, RootLayout() (+19 more)

## Knowledge Gaps
- **176 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `type` (+171 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ar` connect `Community 30` to `Community 0`, `Community 3`, `Community 5`, `Community 6`, `Community 29`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `authorize()` connect `Community 29` to `Community 0`, `Community 3`, `Community 5`, `Community 30`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _176 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07868852459016394 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._