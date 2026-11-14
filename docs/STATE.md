# Project state: Meta Pedigree

Current stage: 3 architecture
Last updated: 2026-11-14 by UGcraftist

## Gates
| Stage | Status | Approved by | Date | Artifact |
|---|---|---|---|---|
| 1 user-stories | passed | UGcraftist | 2026-11-14 | docs/product/stories.md |
| 2 requirements | passed | UGcraftist | 2026-11-14 | docs/product/requirements.md, docs/design/ux.md |
| 3 architecture | in progress | | | docs/decisions/, docs/design/ |
| 4 plan | not started | | | docs/project/plan.md |
| 5 implementation | not started | | | |
| 6 quality-review | not started | | | docs/design/performance.md |
| 7 release-retro | not started | | | docs/project/releases/<version>.md |

## Open questions (blocking the current gate)
- Q9 party field list (factions, alliances, elections, ideology) before the schema freezes → [product/stories.md](product/stories.md#open-questions-and-assumptions)
- Stage-3 menu decisions: stack, database, API style, auth, deployment (see `docs/STATE.md` next turn) → docs/decisions/

## Resolved (recorded in stories.md, ux.md, changes.md)
- Q1 scope: US/EU embodied-AI companies, ≤100 orgs, persons as collected; production target is political parties, so the model stays domain-neutral (US-024, FR-011/FR-024 party slots).
- Q2 data model: deferred to stage 3 (schema decision record); data requirements written in stage 2.
- Q3 views: pedigree tree, timeline and relation network all ship in v1 (CR-001 option B keeps the network view).
- Art direction: D1 档案桌 (UGcraftist, 2026-11-14).
- S-01 is one canvas with a view switcher; no-source facts are allowed in the R1 test set, always labelled `无来源`.
- URL state: carried in the address bar, minimal set only (UGcraftist, 2026-11-14).
- Team: one developer (UGcraftist), ≈40 h/week confirmed; **R1 ≈ 2026-12-13, full Must scope** (CR-001 option B); preview 2026-11-18 internal only.
- Vocabulary: user-facing "数据录入与核验" (P4 renamed 数据编辑); "策展" is an alias only.
- Stage-1 gate approved by UGcraftist; US-001–US-024 agreed; Q8 assumptions accepted, revisit trigger = first real interview with P1–P3.

Changes: project/changes.md · Risks: project/risks.md
