# Plan: Meta Pedigree

Estimate scale: **days, 1 day ≈ 6 h of focused work** (chosen for one developer; capacity is tracked in the same unit below).

Milestones follow the release slices in requirements.md. M1 is the walking skeleton plus the internal preview (2026-11-18); M2 delivers full Must scope for R1 (2026-12-13, CR-001 option B).

## Milestones

| ID | Goal | Includes | Target date | Status |
|---|---|---|---|---|
| M1 | Walking skeleton + internal preview: tree view over 20 seed orgs, URL state, runnable locally | T-001…T-006 | 2026-11-18 | planned |
| M2 | R1: all Must scope — timeline, focus/provenance, search/filter, missing markers, entry & verify station, party fixture | T-010…T-021 | 2026-12-13 | planned |

## Tasks

| ID | Task | Milestone | Assignee | Requirement | Design (S-/API/TH-) | decision record | Estimate | Depends on | Status |
|---|---|---|---|---|---|---|---|---|---|
| T-001 | Scaffold repo per code organization: `api/` (FastAPI, `/healthz`, pytest), `web/` (Vite/React skeleton), venv bootstrap, README run/test; `db/`+`seed/` land in T-002, CI in T-022 (CR-002) | M1 | UGcraftist | NFR-07 | — | DR-0002, DR-0004 | 0.5 | — | done |
| T-002 | Migrations + core tables (orgs, persons, facts, fact_relations, sources, fact_sources, stance_axis, relation_type, revision, conflicts); seed importer CLI | M1 | none | FR-003,009,010,011,014 | data-model.md | DR-0003 | 0.75 | T-001 | todo |
| T-003 | Research + seed 20 orgs (tree skeleton for preview) from sources into seed JSON; validation script | M1 | none | FR-024 | — | — | 0.5 | T-002 | todo |
| T-004 | API read endpoints: `GET /tree` (root + children), `GET /entities/{id}` (facts+relations+sources) | M1 | none | — | api.md GET /tree, /entities/{id} | DR-0002 | 0.5 | T-002 | todo |
| T-005 | S-01 tree screen: SVG/D3 render, expand/collapse, view switcher stub, diff shade | M1 | none | FR-013,025,026 | S-01 | DR-0001 | 0.75 | T-004 | todo |
| T-006 | S-02 minimal detail drawer + URL state (node focus in address bar, copyable) | M1 | none | FR-023(partial) | S-01, S-02 | DR-0001 | 0.25 | T-005 | todo |
| T-010 | S-02 full detail: facts, sources + locator + as-of, citation copy, "无来源" label, conflicts side by side, person roles over time | M2 | none | FR-001,002,004,005,017 | S-02 | DR-0001 | 1.0 | T-006 | todo |
| T-011 | S-03 timeline screen: episodes grouped, anchor years, year-band rendering, stable enter from S-01/S-04 | M2 | none | FR-003,025 | S-03 | DR-0001 | 1.5 | T-005 | todo |
| T-012 | S-04 focus view: chain highlight + dim rest, restore previous view on Esc, relation legend | M2 | none | FR-012,013,021 | S-04 | DR-0001 | 1.0 | T-011 | todo |
| T-013 | S-05 search + combined filters, persisted in URL, missing counts separate | M2 | none | FR-005,023,024 | S-05 | DR-0001 | 0.5 | T-010 | todo |
| T-014 | S-10 entry & verify station: create/edit org/person/fact/relation/source, registry-typed relation, stance axes, validation naming dangling ids, audit trail, merge decision | M2 | none | FR-006,007,008,009,014 | S-10 | DR-0003 | 2.0 | T-002 | todo |
| T-015 | Share/export: URL snapshot + PNG/SVG export with source appendix, CSV/JSON subset export (Should — build only after Must is green) | M2 | none | FR-027,028 (Should) | S-06 | DR-0001 | 1.0 | T-012 | todo |
| T-016 | S-08 error/empty states (empty tree, no results, failed save) | M2 | none | — | S-08 | DR-0001 | 0.5 | T-013 | todo |
| T-017 | Expand seeds to 100 orgs + persons + relations; party fixture (FR-011 fields, China/US axes); data quality run | M2 | none | FR-010,011,024 | — | DR-0003 | 2.0 | T-014 | todo |
| T-018 | Security: bearer token middleware, audit actor, headers per TH-01…TH-05, log hygiene | M2 | none | NFR-08 | TH-01…TH-08 | DR-0002 | 0.5 | T-001 | todo |
| T-019 | Deploy + backups + restore runbook (local first, then hosted) | M2 | none | NFR-07 | — | — | 0.5 | T-018 | todo |
| T-020 | NFR validation: perf at 100 orgs (pan/zoom ≥30 fps), WCAG AA contrast, target browsers | M2 | none | NFR-02…06, FR-026 | — | — | 0.5 | T-017 | todo |
| T-021 | Review passes (stage 6 on two walkthroughs: first-time visitor, data editor) + fixes | M2 | none | — | — | — | 2.0 | T-020 | todo |
| T-022 | CI pipeline (GitHub Actions: build, typecheck, `make check`) once a git remote exists; blocked on remote (CR-002) | M1 | none | NFR-07 | — | DR-0004 | 0.25 | T-001 | blocked |

### T-001 acceptance criteria (rescoped by CR-002)
- `api/`, `web/` exist per DR-0004 code layout; `GET /healthz` returns 200 + version; `make test` green; `make venv` works from a clean checkout (self-bootstraps pip).
- `web/` compiles (`npm run build`).
- Root `README.md` has run, build, test and deploy steps that a stranger can follow.
- `db/` + `seed/` are T-002; CI is T-022 (needs a git remote, which does not exist yet).

### T-002 acceptance criteria
- `db/migrate` applies cleanly on an empty database; ER matches `data-model.md`.
- Seed importer rejects dangling ids and names the offender (FR-006 rule); importer runs from JSON without a deploy.

### T-003 acceptance criteria
- 20 orgs with at least one sourced fact each load; every fact carries source + as-of or is explicitly `无来源`.

### T-004 acceptance criteria
- `GET /tree` returns root + children with relation types and time bands; `GET /entities/{id}` returns facts, sources, relations; both documented in `openapi.yaml`.

### T-005 acceptance criteria
- Tree renders 20 orgs with expand/collapse; sibling date bands render with shades; click a node → focus; URL updates (T-006).

### T-006 acceptance criteria
- Reload with a node id in the URL restores that focus; address bar state is copyable and pasteable.

### T-010 acceptance criteria
- Any fact detail shows source + locator + as-of or the `无来源` label; citation copy pastes as one line with locator; two conflicting sources render side by side; year-only renders as a band; person page lists roles in time order with gaps visible.

### T-011 acceptance criteria
- Timeline shows 3–4 episodes; a year-only event renders as a band, not a point; entering from the tree lands on the same node in the timeline; at 100 orgs it stays interactive (no full relayout on scroll).

### T-012 acceptance criteria
- Click an org → its lineage chain highlighted, rest dimmed; Esc restores the exact previous view (pan/zoom/filters); each of the five relation types has its own encoding in the legend.

### T-013 acceptance criteria
- Two filters combine; reload reproduces the filtered view; missing values reported as "missing: N", never 0; search by alias jumps to focus without losing scroll position.

### T-014 acceptance criteria
- Save a relation to a non-existent org → rejected, bad id named; edit a relation → object history lists editor, time, old → new; edits appear after refresh with no rebuild; add a new relation type via registry → it renders and filters without a deploy; same-name orgs stay separate until a merge decision is recorded.

### T-015 acceptance criteria
- Exported PNG contains the attribution appendix; CSV round-trips (export → import gives the same records).

### T-016 acceptance criteria
- Empty tree, no-results filter, failed save each show a plain-language message with a next action.

### T-017 acceptance criteria
- 100 orgs / ≤500 persons / ≤1500 relations load; enterprise fixture (fields null) and party fixture (FR-011 fields filled) both validate and render; data-as-of per fact recorded.

### T-018 acceptance criteria
- Requests without token → 401; missing token in logs absent; audit rows carry actor + timestamp; TH-01…TH-05 mitigations present.

### T-019 acceptance criteria
- One-command deploy; backup restore rehearsed once; runbook in `README.md` or a linked doc.

### T-020 acceptance criteria
- 100-org tree pan/zoom ≥ 30 fps measured; key text ≥ 4.5:1 contrast; current Chrome/Firefox/Safari pass the two walkthroughs.

### T-021 acceptance criteria
- Two walkthroughs completed with UGcraftist: first-time visitor finds the lineage chain in < 5 actions; data editor completes one edit without instructions; defects found are fixed or logged.

## Spikes

| ID | Question to answer | Time box | Assignee | Result | Done by |
|---|---|---|---|---|---|
| SP-001 | Which tree layout handles 100 orgs at 30 fps — D3 hierarchy vs custom SVG layout? | 0.25 day | none | — | — |
| SP-002 | Seed collection method: which sources, how to extract and validate 100 orgs without burning the month | 0.25 day | none | — | — |

## Critical path

T-001 → T-002 → T-004 → T-005 → T-011 → T-014 → T-017 → T-020 → T-021

Preview path (M1): T-001 → T-002 → T-003 → T-004 → T-005 → T-006 (2026-11-18).

## Capacity

| Person | Available (days ≈ 6 h) | Assigned (days) |
|---|---|---|
| UGcraftist | ≈ 26 (≈160 h over 4 weeks at ~40 h/week, 2026-11-16 → 2026-12-11) | 16.25 tasks + 0.5 spikes = 16.75, ≈100 h |

Result: ≈9.25 days (≈55 h) of buffer reserved for review passes (T-021), rework and data-collection surprises. Fits without cutting Must scope. Stretch (Should) work T-015 is scheduled only after Must is green.
