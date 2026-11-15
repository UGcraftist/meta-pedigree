# Project state: Meta Pedigree

Current stage: 5 implementation — T-001, T-002 and T-003 done; T-004 read views + RPC surface next
Last updated: 2026-11-14 by UGcraftist

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
- T-002 **done**: `0001_init.sql` applied to `meta-pedigree-dev` from the SQL Editor (DR-0006 route, no `DATABASE_URL`); `make probe` 8/8 — anon denied on all four verbs (table GRANTs absent → 42501), service_role inserts/reads/updates/deletes its fixture. 13 pytest green. Branch `feat/T-002-supabase-schema` for review; PR step still substituted by branch review (no remote).
- T-003 **done**: `seed/data/010-orgs-us-eu.json` + `020-facts.json` — 24 orgs (10 US + 10 EU + DLR/MIT/Midea/Hyundai as parents the tree needs), 29 facts with sources (wiki/official + Reuters/KUKA/Agile press), 6 relation facts: Agile→Franka (2023-11-02), Franka→DLR, BD→MIT, Hyundai→BD (80%), Midea→KUKA. Imported to dev: 24 orgs / 29 facts / 27 sources. Data years cross-checked against Wikipedia/REST + web snippets.
- Next action: **T-004** — migration `0002_read_model` (`tree_nodes`/`tree_edges`/`org_detail` views, editor sees all tiers, anon sees public), RPC surface per api.md, then paste 0002 into the dev SQL editor (DR-0006).
- Supabase dev project: `https://gwjyptxnlhbzzzqbpwbg.supabase.co` (anon key in `web/.env.local`, gitignored). Prod project `uuujfqygazlmtmiyxnkc` exists but is not used until stage 7.

## Open questions (blocking the current gate)
- R2 auth (SSO + hosted accounts) is not designed yet: tracked as risk in risks.md, must close before the R2 public site.

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
