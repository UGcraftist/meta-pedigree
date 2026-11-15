# Changes

## Change requests

| ID | Raised by | Date | Description | Affects stage | Decision | Status |
|---|---|---|---|---|---|---|
| CR-002 | UGcraftist (from T-001 round-1 review) | 2026-11-14 | T-001 implemented Python/FastAPI in `api/` while DR-0002 fixed Node 22 + Fastify + `apps/` monorepo; T-001 also dropped `db/`, `seed/` and CI from its acceptance criteria. | 3 architecture, 4 plan, 5 implementation | **DR-0004 supersedes DR-0002's runtime and repo layout (Python 3.12 + FastAPI, `api/` + `web/`); T-001 rescoped: `db/`+`seed/` move to T-002, CI becomes T-022 (blocked on a git remote).** | decided 2026-11-14 |
| CR-001 | UGcraftist | 2026-11-14 | Solo developer with fixed dates (preview 2026-11-18, R1 2026-11-22/23). The stage-1 Must scope (20 FRs, 12 screens, incl. curation UI and three graph views) is roughly twice the realistic single-developer effort, so R1 must be re-cut. | 2 requirements, 4 plan | **B — keep the full Must scope; R1 target moves to ≈ 2026-12-13** (preview stays internal) | decided 2026-11-14 |

### CR-001 detail — R1 re-cut options

**Inputs.** One developer, part-time; ~9 calendar days to R1. Realistic focused effort available: **≈40–50 h** (assumption: evenings + weekend; if it is less, even option A is tight). Curating 100 orgs is itself ~15–20 h (A-01), so the seed for the preview is 40 orgs.

**Effort model by item (solo, includes review + fix time):**

| Item | FRs | Hours |
|---|---|---|
| Repo scaffold, data loading, deploy | FR-031 | 5 |
| Tree view (focus, branch, five relations) | FR-005, FR-006, FR-012 | 10 |
| Detail panel, sources, citation copy | FR-001–004 | 5 |
| Timeline (time brush, precision bands, ranges) | FR-012–014 | 8 |
| Search + filters | FR-016, FR-025 | 6 |
| Relation network view | FR-007, FR-011 | 8 |
| Comparison | FR-008, FR-009 | 6 |
| Export (PNG/SVG, CSV/JSON, citation appendix) | FR-019, FR-020 | 6 |
| Curator UI incl. registry and audit trail | FR-015, FR-021, FR-022 | 15 |
| States, empty/error, a11y fallback tables | FR-023, FR-030 | 6 |
| Seed 40 orgs (data curation counts as effort) | — | 12 |
| Review, fixes, deploy | — | 6 |

**Options:**

| Option | R1 content | Hours (est.) | R1 date |
|---|---|---|---|
| **A (recommended)** | Tree + timeline + focus + detail/source + missing markers + search/filter + share URL + PNG export + deploy; seed 40 orgs. Defer to R2: network view (S-04), comparison polish (S-08), curator UI (S-10 → data edited as JSON/YAML in R1), SVG/CSV/JSON export. | ≈50–55 | 2026-11-22/23 |
| B | Full stage-1 Must scope as written (3 views + curator UI + export) | ≈90–100 | needs ~2026-12-13 |
| C | Tree view only (fastest; drops timeline, which contradicts Q3) | ≈30–35 | 2026-11-22 |

**Consequences if A is chosen:** Q3 ("three views in v1") is amended — the network view becomes an R2 view, recorded here as the amendment; S-10 curator UI moves to R2 and R1 editing is file-based; S-08 comparison keeps only the basic two-object mode. Preview 2026-11-18 would show tree view + 40 seed orgs, read-only, with detail and sources working.

**Q9 dependency:** the party field list is still open. Under A and B the party slots ship empty in R1 regardless (FR-024), so Q9 can land during stage 3 without blocking implementation.

**Decision 2026-11-14 (UGcraftist): Option B.** Rationale: the owner is available ≈40 h/week and time is no longer the binding constraint, so no Must item is cut — the network view (S-04, Q3) and the curation UI (S-10) stay in R1. Consequence: R1 target moves to ≈ 2026-12-13; the 2026-11-18 preview is an internal demo (tree view + seed orgs, read-only), not a public release. Option A stays here as the fallback if the time budget turns out lower than confirmed.

**Q9 dependency for B:** none blocking; party slots stay empty in R1.

## Change log

- 2026-11-14: project initialized with the team workflow.
- 2026-11-14: CR-001 raised (solo-developer schedule vs. Must scope).
- 2026-11-14: CR-001 decided by UGcraftist — option B, full scope, R1 ≈ 2026-12-13; preview 2026-11-18 internal.
- 2026-11-14: **CR-003 raised and decided** by UGcraftist — platform switch: data/API on Supabase (PostgreSQL + PostgREST + Auth + RLS), frontend on Cloudflare Pages; **no application server in R1**. Recorded in DR-0005 (supersedes DR-0002/DR-0004 runtime and deploy sections). Trigger: no local PostgreSQL/Docker, solo maintainer.

## Affected docs
- docs/decisions/0005-supabase-cloudflare-platform.md — new
- docs/decisions/0002-stack-and-system-shape.md, 0004-python-fastapi-backend.md — status updated (superseded in part / wholly)
- docs/design/architecture.md — containers and flows rewritten
- docs/project/plan.md — T-002/T-004/T-007/T-014/T-018/T-019 rescoped; missing T-007…T-009 rows added
- 2026-11-15: T-002 in progress — `supabase/migrations/0001_init.sql`, `seed/` importer + validation, `api/` (FastAPI) removed per DR-0005; docs (architecture layout, data-model table names/keys, security RLS) updated in the same branch. Supabase **dev** project connected (URL + anon key); **prod** project also created by the owner on 2026-11-15 but stays unused until stage 7.
