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
- Q9: party-domain attribute list (factions, alliances, elections, ideology axes, legal status) → [product/stories.md](product/stories.md#open-questions-and-assumptions). The reserved slots are drafted in requirements.md; Q9 confirms their exact fields.
- Art direction: no brand or design assets exist yet; three directions are proposed in ux.md and one must be picked → [design/ux.md](design/ux.md)
- Test-set data sources: which public sources, licence terms and refresh cadence for the ≤100-org set → [product/requirements.md](product/requirements.md)
- Effort: team size and weekly hours are unmeasured, so the "Must fits ~60% of effort" check is open → [product/requirements.md](product/requirements.md#assumptions-and-dependencies)

## Resolved (recorded in stories.md)
- Q1 scope: US/EU embodied-AI companies, ≤100 orgs, persons as collected; production target is political parties, so the model must stay domain-neutral (US-024).
- Q2 data model: stage 2 writes data requirements including party-domain reserved slots; the schema decision record is stage 3.
- Q3 views: pedigree tree, timeline and relation network all ship in v1.
- Stage-1 gate: approved by UGcraftist 2026-11-14; US-001–US-024 agreed; Q8 assumptions accepted with a revisit trigger.

Changes: project/changes.md · Risks: project/risks.md
