# Project state: Meta Pedigree

Current stage: 5 implementation — T-001–T-008 all merged into master 2026-11-19 (PR #1–#6); next T-009 (shared URL-state hook)
Last updated: 2026-11-19 by UGcraftist (PR #5–#6 merged; T-007/T-008 done)

## Gates
| Stage | Status | Approved by | Date | Artifact |
|---|---|---|---|---|
| 1 user-stories | passed | UGcraftist | 2026-11-14 | docs/product/stories.md |
| 2 requirements | passed | UGcraftist | 2026-11-14 | docs/product/requirements.md, docs/design/ux.md |
| 3 architecture | passed | UGcraftist | 2026-11-14 | docs/decisions/, docs/design/ |
| 4 plan | passed | UGcraftist | 2026-11-14 | docs/project/plan.md |
| 5 implementation | in progress | | | |
| 6 quality-review | not started | | | docs/design/performance.md |
| 7 release-retro | not started | | | docs/project/releases/<version>.md |

## Current focus
- **M1 walking skeleton → internal preview 2026-11-18**: T-001…T-006 (tree over 20 seed orgs + URL state). Then M2 → R1 Must 2026-12-13.
- T-001 **merged** (review round 3: no blocking comments; `f0c89ba`). Branch `chore/T-001-scaffold` kept for audit. No git remote yet, so the PR step was substituted by branch review (flagged).
- T-002 **done**: `0001_init.sql` applied to `meta-pedigree-dev` from the SQL Editor (DR-0006 route, no `DATABASE_URL`); `make probe` 8/8 — anon denied on all four verbs (table GRANTs absent → 42501), service_role inserts/reads/updates/deletes its fixture. 13 pytest green. Branch `feat/T-002-supabase-schema`, PR #1 open.
- T-003 **done**: `seed/data/010-orgs-us-eu.json` + `020-facts.json` — 24 orgs (10 US + 10 EU + DLR/MIT/Midea/Hyundai as parents the tree needs), 29 facts with sources (wiki/official + Reuters/KUKA/Agile press), 6 relation facts: Agile→Franka (2023-11-02), Franka→DLR, BD→MIT, Hyundai→BD (80%), Midea→KUKA. Imported to dev: 24 orgs / 29 facts / 27 sources. Data years cross-checked against Wikipedia/REST + web snippets.
- T-004 **done**: `0002_read_model` + `0003_tree_direction` pasted to dev; `tree_edges`/`tree_nodes`/`org_detail` views live; `api.md` rewritten as the PostgREST contract. `0004_tree_nodes_dedup` **applied 2026-11-15** (min-depth dedupe + restored grants); `make views-probe` green: tree_nodes 24 rows / 24 distinct orgs, tree_edges 5, org_detail 24 orgs with 34 sourced facts; anon still refused on all three views (42501).
- T-005 **merged** (PR #3, 2026-11-19): S-01 tree screen — editor login gate, component-packed SVG/D3 tree (24 orgs readable at 1260px), expand/collapse, year/precision labels, multi-parent badge, table view (24 rows, no duplicates after client-side dedupe), light/dark theme toggle; verified with real Chromium screenshots (local build/preview/, not committed). CR-005 decided 2026-11-15 (AC corrected, no shade built); round-2 re-review pending.
- T-006 **merged** (PR #4, 2026-11-19): S-02 minimal detail drawer reads `org_detail` (facts + sources + locator + `无来源`), full `subject · predicate · object` triple from 0005 (subject first even when the viewed org is the object end; no tail for object-less facts), `?focus=<id>` in the address bar via `history.replaceState`, reload restores focus, `Esc`/× closes and clears the param, copy-link button, unknown/stale id dropped with a one-line banner; focused node highlighted. Verified in real Chromium on the earlier commit: deep link → Boston Dynamics drawer with 3 sourced facts; click MIT → URL + drawer switch; Esc → param cleared; bogus uuid → banner + param removed; copy → `已复制`. 25 vitest tests (urlState, format, layout, triple). Round 2 changes requested 2026-11-15; 0005 NOT yet applied to dev.
- **Review debt (open)**: T-004/T-005/T-006 were never independently reviewed before round 1. Round 2: `changes requested` on `e526e11` → fixes on `9b4a969` → **reviewer approve** 2026-11-15 (S1–S6 non-blocking, applied). S-01/S-02 scope; S-03 is T-011, not built. **0005 applied 2026-11-19; `make views-probe` green** (24/5/24, BD `controlled_by` ends, founded object null, anon 401 on all three views). Person approval of PR #4 given; all four PRs merged 2026-11-19.
- T-007 **merged** (PR #5, 2026-11-19): `0006_write_rpc` — `upsert_fact` (embedded `sources[]` in one transaction, registry/date/amount validation, dangling id named), `submit_fact` (source-or-explicit-none, old revision superseded, one `audit_log` row, TH-02 rollback), `upsert_stance`, `merge_source` (normalized-URL equality), `ensure_app_user`; SECURITY DEFINER + pinned `search_path`, execute only to `authenticated`. Applied to dev; `make write-probe` **33/33 green** (anon+readonly denied with row counts unchanged, editor write→publish→audit, rollback, FR-008 read-back).
- T-008 **merged** (PR #6, 2026-11-19): quality gate is real — `make check` = structure + pytest + ESLint + `tsc -b` + vitest, credential-free (`make setup` = `.venv` + `npm ci`); ESLint 9 flat + Prettier config in `web/`; strengthened layout test + new `treeData` tests (mutation-verified); `views-probe` now asserts live response shapes (DR-0007:48). **CR-008 decided** (timeline-scale test → T-011 AC; RPC negatives/rollback stay in `write-probe` with the CI gap recorded; `Depends on` fixed). Fresh review: **agree, no blocking, two-way door**. Open follow-ups: repo-wide Prettier pass + `format:check` gate; dependency advisories in the pre-existing vitest 2.1.9 subtree.
- Next action: **T-009** — shared URL-state hook (view/focus/t/filters/compare in the address bar, unknown id degrades gracefully), branch off `master`.
- Supabase dev project: `https://gwjyptxnlhbzzzqbpwbg.supabase.co` (anon key in `web/.env.local`, gitignored). Prod project `uuujfqygazlmtmiyxnkc` exists but is not used until stage 7.

## Open questions (blocking the current gate)
- R2 auth (SSO + hosted accounts) is not designed yet: tracked as risk in risks.md, must close before the R2 public site.
- T-005/T-006 gate: CR-005 decided 2026-11-15 (T-005 AC corrected, no shade built); **CR-006 decided 2026-11-15 (staged route accepted)** — SQL editor stays for 0005/0006, CLI move becomes a new M2 task (DR-0008). 0005 now also revokes anon on the three views and normalises authenticated to SELECT-only (default-privileges drift found by `role_table_grants`). The round touches an auth-adjacent read view, so a person approved PR #4 before merge (one-way door); all PRs merged 2026-11-19.

## Resolved (recorded in stories.md, ux.md, changes.md)
- Q1 scope: US/EU embodied-AI companies, ≤100 orgs, persons as collected; production target is political parties, so the model stays domain-neutral (US-024, FR-011/FR-024 party slots).
- Q2 data model: deferred to stage 3; **DR-0003** now fixes it (fact-centered, registry-driven, five time precisions).
- T-001 review: **CR-002 + DR-0004** — backend runtime is Python 3.12 + FastAPI (`api/` + `web/`); T-001 rescoped, CI = T-022 (needs remote).
- Stack/shape: **DR-0002** accepted (modular monolith, React SPA, PostgreSQL + recursive CTE, REST/OpenAPI), all menu defaults, 2026-11-14.
- S-10 mockup: elements accepted, pixel layout provisional (revise after the real screen exists).
- Q3 views: pedigree tree, timeline and relation network all ship in v1 (CR-001 option B keeps the network view).
- Stage-3 gate approved 2026-11-14 (UGcraftist, \"确认 接受例外\"): DR-0002/DR-0003, architecture, data model, API+OpenAPI, security. Exception accepted: single admin credential holder (template asks two); R1 auth = single editor bearer token.
- Art direction: D1 档案桌 (UGcraftist, 2026-11-14).
- S-01 is one canvas with a view switcher; no-source facts are allowed in the R1 test set, always labelled `无来源`.
- URL state: carried in the address bar, minimal set only (UGcraftist, 2026-11-14).
- Stage-4 gate approved 2026-11-14 (UGcraftist, "批准"): plan.md M1→preview 11-18, M2→R1 12-13.
- Team: one developer (UGcraftist), ≈40 h/week confirmed; **R1 ≈ 2026-12-13, full Must scope** (CR-001 option B); preview 2026-11-18 internal only.
- Vocabulary: user-facing "数据录入与核验" (P4 renamed 数据编辑); "策展" is an alias only.
- Stage-1 gate approved by UGcraftist; US-001–US-024 agreed; Q8 assumptions accepted, revisit trigger = first real interview with P1–P3.

Changes: project/changes.md · Risks: project/risks.md
