# Shared context
## Now  (rewrite this section each time; keep it under 30 lines)
- Stage and skill step: stage 5, T-022 CI (M1), branch `feat/T-022-ci` off master. Advisor verdict **change** was docs-only: T-022 had no AC, its row cited NFR-07 (not a requirement id; home is NFR-011/NFR-006), and "passes in CI" is only true once the check is required — that is an owner/repo-admin step.
- Applied: plan T-022 AC (job `check` = setup+check+build; no probes/secrets/deploy; `web/.env.test`; failure-provable; required check named `check`; README), row requirement fixed, workflow `.github/workflows/ci.yml` (node from `.nvmrc`, npm/pip caches with correct lock paths, pinned majors, timeout, PR-only concurrency cancel, `permissions: contents: read`), `make typecheck` `--force` (T-008 follow-up), README CI section, `changes.md` owner step.
- T-010 (PR #9) is stalled on the 0008 paste (user offline from Supabase); its round-2 review is running. This CI branch is independent (two-way door) and touches no DB.
- Evidence to collect: clean-checkout `git clone . /tmp/mp-ci && make setup && make check` (no `.env`/`.env.local`), and the failure proof (scratch broken import → `check` red) — the latter only meaningful in CI once pushed.
- Owner steps: enable required check `check` on `master`; paste 0008 for PR #9.
- Open questions: none for CI; T-023 (migration CI) stays blocked on DR-0008/T-022.

## Journal  (append one line per step, newest last; never edit old lines)
- 2026-11-15 stage 5 step 8: proposed proceeding to T-007 while T-006 was self-reviewed only → advisor: not asked
- 2026-11-15 advisor plumbing: Claude Code reads OK, writes denied under `dontAsk` → fixed with user-level `permissions.allow: ["Write(.advisor/**)","Edit(.advisor/**)"]`; Edit append to `.advisor/log.md` verified; log.md is Claude-Code-owned, context.md executor-owned
- 2026-11-15 stage 5 step 8 debt + T-007 plan → advisor: **change** (review scope S-03 wrong; 0003_write_rpc collides; `make write-probe` absent; second non-editor user needed; search_path + merge_source normalization undefined; CR missing from changes.md) → all applied in ee667cd + 135744d; CR-004 raised; fresh-reviewer branch review started (also flags T-013's 0004_search collision → 0006_search)
- 2026-11-19 CR-008: proposed then **decided** — UGcraftist accepted all four items (timeline scale -> T-011 AC; RPC negatives/rollback stay in write-probe with CI gap noted; contract shape in views-probe; Depends on T-005/T-006)
- 2026-11-19 T-008 plan → advisor: **change** (layout tests already exist — strengthen, don't duplicate; DR-0007:48 contract-shape obligation unhomed; `make check` fails on clean checkout before `make venv`; CR-008 needs 4 items incl. T-011 AC + Depends on) → all applied on `feat/T-008-test-ladder`; CR-008 proposed to UGcraftist; PR opened
- 2026-11-15 fix plan (openapi retire / migration numbering / org_detail sides / shades AC) → advisor: **change** — shades AC is an overclaim (ux.md:92 带 = verb), don't build; don't assign migration numbers in 3 files (ledger only); DR-0007 must stay proposed + name DR-0002/0004 supersession; org_detail needs visibility gating + SQL-side names + full triple; bugs go to stories.md as BUG- items; STATE overclaim must go. Applied: STATE/plan in review statuses, T-005 AC corrected (this commit); open DR-0007 + CR-004/005/006 await UGcraftist
- 2026-11-25 T-009 plan → advisor: **change** (CR-009 for the ux.md hash route; t/f/view notices not silent; injected HistoryPort so read→subscribe→write is testable; view=table not a URL view; copy from canonical state, keep hash, getAll for duplicates, no manual decode, compare sanitise) → all applied; PR opened
- 2026-11-25 T-009 review round 1 → reviewer: **change** (StrictMode port subscription, plan decision column, door label) → all fixed with tests + live re-check; round-2 review requested
- 2026-11-25 CR-009 decided by UGcraftist (all five items); T-009 PR waits only on the round-2 review
- 2026-11-25 T-009 review round 2 → reviewer: **agree** (no blocking; nits: stale notices after write, port test cannot catch a leaking stop(), network notice T-011, docs citations) → nit-fix branch opened
- 2026-11-25 T-009 merged via PR #7 (merge commit a84e41b); STATE updated on master (1776c54)
- 2026-11-25 T-010 plan → advisor: **change** (0008 not 0007; conflict_key from raw triple; no revision_of; privileges re-issued; as_of ≠ coalesce; S-02→S-07 + DR fix; fixture; FR-004 authoring; probe assertions) → CR-010 raised with a person-path choice; migration blocked on the owner

