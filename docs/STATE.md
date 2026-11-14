# Project state: Meta Pedigree

Current stage: 2 requirements
Last updated: 2026-11-14 by UGcraftist

## Gates
| Stage | Status | Approved by | Date | Artifact |
|---|---|---|---|---|
| 1 user-stories | passed | UGcraftist | 2026-11-14 | docs/product/stories.md |
| 2 requirements | in progress | | | docs/product/requirements.md, docs/design/ux.md |
| 3 architecture | not started | | | docs/decisions/, docs/design/ |
| 4 plan | not started | | | docs/project/plan.md |
| 5 implementation | not started | | | |
| 6 quality-review | not started | | | docs/design/performance.md |
| 7 release-retro | not started | | | docs/project/releases/<version>.md |

## Open questions (blocking the current gate)
<!-- Each question lives in the doc it is about, with its owner. List it here as one line with a link. -->
- CR-001: pick the R1 re-cut (A recommended / B / C) → [project/changes.md](project/changes.md#cr-001-detail--r1-re-cut-options)
- Wireframes S-01–S-10, S-12 are `in review`; gate approval flips them to `ready` (DR-0001) → [design/ux.md](design/ux.md)
- Q9 party field list (factions, alliances, elections, ideology) before stage 3 freezes the schema → [product/stories.md](product/stories.md#open-questions-and-assumptions)

## Resolved (recorded in stories.md, ux.md, changes.md)
- Q1 scope: US/EU embodied-AI companies, ≤100 orgs, persons as collected; production target is political parties, so the model stays domain-neutral (US-024, FR-011/FR-024 party slots).
- Q2 data model: deferred to stage 3 (schema decision record); data requirements written in stage 2.
- Q3 views: pedigree tree, timeline and relation network — amended by CR-001 if option A is chosen.
- Art direction: D1 档案桌 (UGcraftist, 2026-11-14).
- S-01 is one canvas with a view switcher; no-source facts are allowed in the R1 test set, always labelled `无来源`.
- URL state: carried in the address bar, minimal set only (UGcraftist, 2026-11-14).
- Team: one developer (UGcraftist); preview 2026-11-18, R1 2026-11-22/23. A-07 closed and turned into a constraint.
- Stage-1 gate approved by UGcraftist; US-001–US-024 agreed; Q8 assumptions accepted, revisit trigger = first real interview with P1–P3.

Changes: project/changes.md · Risks: project/risks.md
