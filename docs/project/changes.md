# Changes

## Change requests

| ID | Raised by | Date | Description | Affects stage | Decision | Status |
|---|---|---|---|---|---|---|
| CR-001 | UGcraftist | 2026-11-14 | Solo developer with fixed dates (preview 2026-11-18, R1 2026-11-22/23). The stage-1 Must scope (20 FRs, 12 screens, incl. curator UI and three graph views) is roughly twice the realistic single-developer effort, so R1 must be re-cut. | 2 requirements, 4 plan | Options A/B/C below; product owner picks | proposed |

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

**Q9 dependency:** the party field list is still open. Under A the party slots ship empty in R1 regardless (FR-024), so Q9 can land during stage 3 without blocking implementation.

## Change log

- 2026-11-14: project initialized with the team workflow.
- 2026-11-14: CR-001 raised (solo-developer schedule vs. Must scope).
