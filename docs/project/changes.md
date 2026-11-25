# Changes

## Change requests

| ID | Raised by | Date | Description | Affects stage | Decision | Status |
|---|---|---|---|---|---|---|
| CR-002 | UGcraftist (from T-001 round-1 review) | 2026-11-14 | T-001 implemented Python/FastAPI in `api/` while DR-0002 fixed Node 22 + Fastify + `apps/` monorepo; T-001 also dropped `db/`, `seed/` and CI from its acceptance criteria. | 3 architecture, 4 plan, 5 implementation | **DR-0004 supersedes DR-0002's runtime and repo layout (Python 3.12 + FastAPI, `api/` + `web/`); T-001 rescoped: `db/`+`seed/` move to T-002, CI becomes T-022 (blocked on a git remote).** | decided 2026-11-14 |
| CR-001 | UGcraftist | 2026-11-14 | Solo developer with fixed dates (preview 2026-11-18, R1 2026-11-22/23). The stage-1 Must scope (20 FRs, 12 screens, incl. curation UI and three graph views) is roughly twice the realistic single-developer effort, so R1 must be re-cut. | 2 requirements, 4 plan | **B — keep the full Must scope; R1 target moves to ≈ 2026-12-13** (preview stays internal) | decided 2026-11-14 |
| CR-004 | Agent (per advisor verdict, T-006 review prep) | 2026-11-15 | No git remote: step 8 of `implementation/SKILL.md` cannot open a PR, so its PR review has nothing to comment on; T-022 (CI in `plan.md`) is blocked on the same cause. | 5 implementation, 6 quality-review | **Superseded by reality**: the remote was provided the same day (`UGcraftist/meta-pedigree`, pushed 2026-11-15) — the PR step is restored; branch review is kept only for the current round already in flight. T-022 unblocked. | decided 2026-11-15 (remote provided) |
| CR-005 | Agent (fresh-reviewer finding, T-005 round 1) | 2026-11-15 | T-005 acceptance said "sibling date bands render with shades", but `ux.md` S-01 means each **date carries a precision badge** (带 = carries; already shipped, TreeScreen.tsx:320-324). FR-003's year-only band is owned by T-010/T-011, and the T-005 row also claimed 'diff shade' that no requirement asks for. | 4 plan, 5 implementation | **Correct the AC, do not build the shade**: plan.md:59 reworded to the precision badge; T-005 scope clause drops 'diff shade', names the per-edge predicate text label (encoding + legend stays T-012). | **Decided 2026-11-15 (UGcraftist): corrected in place; no shade built.** |
| CR-006 | Agent (fresh-reviewer finding, round 1) | 2026-11-15 | DR-0006 **trigger 1, second half** fired ("daily schema edits during T-004/T-007"): 0002/0003/0004 applied 2026-11-15 and 0005 next; trigger 2 (CI) is not fired. Advisor review found **live drift**: `0003` drops `tree_edges`/`tree_nodes` with no grant in the file, `0004` re-grants `tree_nodes` only (`:54`), yet the app reads `tree_edges` as `authenticated` — so the dev DB holds a grant no committed file contains, invisible because `views_probe` runs as service_role. | 5 implementation | **Advisor (Claude Code, 2026-11-15) recommends staging, not a binary**: Phase 1 stay on the SQL editor for 0005 + `0006_write_rpc` (this week); Phase 2 move to CLI-tracked migrations as its own M2 task after T-022 and before any prod paste, via **DR-0008** (needs an owner-held DB password). Before 0005: run the `role_table_grants` drift query, commit 0005 (done, `54088d5`), any missing grant becomes its own repair migration; `make views-probe` must assert as `authenticated` + anon-denied on all three views; hidden-visibility fixture for 0005 gating. | **decided 2026-11-15 (UGcraftist): staged route accepted** — Phase 1 stays on the SQL editor (0005, `0006_write_rpc`); Phase 2 moves to CLI-tracked migrations as a new M2 task after T-022, via DR-0008 and an owner-held DB password. `role_table_grants` receipt: anon SELECT+write on all three views and authenticated ALL on views, from Supabase default privileges (not hand grants); 0005 revokes anon and leaves authenticated SELECT-only. **Landed 2026-11-19**: PR #4 merged into master; dev `make views-probe` green (24/5/24, 34 sourced facts, anon 401 on all three views); T-023 added to `plan.md` for the CLI-tracked phase 2. |

| CR-008 | Agent (advisor review of the T-008 plan, 2026-11-19) | 2026-11-19 | T-008 的验收标准有三处与现实冲突：`timeline scale` 属 M2 的 T-011；"pytest RPC 负例"与 DR-0005:25（pytest 只保留种子校验）冲突，且该行引用的 `db/verify.sql` 已不存在；"至少一个测试断言 SQL 回滚"只能在需要凭据的 `write-probe` 里跑，进不了 CI（DR-0006:38）。另外 T-008 的 `Depends on` 写成 T-004，但它测试的树屏/抽屉实际落在 T-005/T-006。 | 4 plan, 5 implementation | **修正 AC，不新建能力**：时间轴刻度移入 T-011 AC（不是删除）；RPC 负例与回滚保留在 `write-probe`，并在 T-008 AC 注明 CI 缺口（T-023 前不得声称覆盖）；T-008 补 DR-0007:48 的契约形状断言（`views-probe` 对真实响应）；`Depends on` 改为 T-005, T-006。lint/typecheck 不算偏离（DR-0002:39 已要求），仅在 PR 的 Deviations 说明。 | **decided 2026-11-19 (UGcraftist): 四项全部接受** — 时间轴刻度进 T-011 AC；RPC 负例/回滚留在 `write-probe` 并注明 CI 缺口；T-008 补契约形状断言；`Depends on` 改为 T-005, T-006。 |

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
- 2026-11-15: **CR-004 resolved** — remote `UGcraftist/meta-pedigree` provided and pushed; PR step restored (branch review kept for the round already running). T-022 unblocked.
- 2026-11-15: **DR-0007 accepted by UGcraftist** — committed OpenAPI retired; `api.md` is the single contract source, PostgREST generates the document at runtime; openapi.yaml removed, structure.yml rendered.
- 2026-11-19: **0005 applied, views-probe green** — `0005_org_detail_subject` pasted to `meta-pedigree-dev`; probe: tree_nodes 24 / tree_edges 5 / org_detail 24, Boston Dynamics `controlled_by` ends resolved, `founded` object null, anon 401 on all three views. Probe hardening: anon check queries `?limit=1` (tree_edges has no `id` column), optional authenticated sign-in via `SUPABASE_EDITOR_EMAIL/PASSWORD`, authenticated read asserted for all three views when creds are present.
- 2026-11-15: **CR-005 decided** — UGcraftist accepted the corrected T-005 AC; the shade is not built (the AC change is in the plan already).
- 2026-11-15: **CR-006 raised** — DR-0006 trigger #2 fired (0002/0003/0004 applied same day, 0005 next); migration route awaits UGcraftist.
- 2026-11-15: **CR-004 raised** — no git remote → step 8 PR review substituted by fresh-reviewer branch review; notes stored as `docs(review):` commits on the branch; T-022 (CI) stays blocked until a remote exists. Awaiting UGcraftist.
- 2026-11-15: found deviation recorded (history not rewritten): T-005 was committed on `feat/T-004-read-model` rather than its own branch (one-branch-per-task rule broken at the time).
- 2026-11-15: migration numbering corrected — T-007 uses `0006_write_rpc`, T-013 uses `0007_search` (`0003_tree_direction` / `0004_tree_nodes_dedup` already exist; DR-0006's >5-migration revisit trigger fires after T-007).
- 2026-11-15: T-002 in progress — `supabase/migrations/0001_init.sql`, `seed/` importer + validation, `api/` (FastAPI) removed per DR-0005; docs (architecture layout, data-model table names/keys, security RLS) updated in the same branch. Supabase **dev** project connected (URL + anon key); **prod** project also created by the owner on 2026-11-15 but stays unused until stage 7.

## Implementation log (stage 5)
- 2026-11-25: **T-009 manual browser check (StrictMode fix re-checked)** (written record, implementation/SKILL:49)** — Chromium (ego-browser) against vite :5173, signed in as the dev editor via a Supabase password grant (session injected, password never typed into the page). Verified: `?view=timeline&t=2015-2024&f=region:eu` renders the tree with three notices (view → T-011, t → T-011, f → T-013) and the params preserved; clicking Franka Emika wrote `?view=timeline&focus=<uuid>&t=2015-2024&f=region:eu&compare=bad` (canonical order, readable `f=`); the notices survived the focus write; Esc cleared focus and kept view/t/f **and** the `#section` hash; `?focus=does-not-exist` showed "链接里的对象 does-not-exist …" and rewrote the URL without it; `?focus=a&focus=b&compare=x,y,z,w` showed the duplicate-key and compare-cap notices; the table toggle changed no URL parameter. The clipboard itself cannot be read in this headless Chromium (`readText` never settles), so `writeText` was temporarily replaced in the page: it received `http://localhost:5173/?focus=<uuid>` and the button switched to `已复制`. StrictMode re-check after the review fix: a synthetic `popstate` (replaceState to another focus + dispatch) moved the drawer from Franka Emika to Boston Dynamics, so the hook keeps its port subscription through the double mount.
- 2026-11-15: **CR-006 decided (staged)** — owner accepted Phase 1 SQL editor + Phase 2 CLI task (DR-0008); `role_table_grants` showed Supabase default privileges had given anon SELECT/write on all three views and authenticated ALL, so 0005 now revokes anon and grants authenticated SELECT-only.
- 2026-11-15: **T-006 round-1 fixes** — `supabase/migrations/0005_org_detail_subject.sql` (both fact ends resolved server-side and gated on the counterpart's visibility; grant + comment re-issued); drawer renders the full `subject · predicate · object` triple (`web/src/features/tree/triple.ts`, 7 vitest cases; round-2 review added the object-side regression); TreeScreen zoom effect dropped on unmount (`on('.zoom', null)`); the ResizeObserver effect now re-subscribes on `[table]`; `seed/views_probe.mjs` asserts the seeded `Boston Dynamics · controlled_by · Hyundai Motor Group` ends plus a no-object `founded` fact, and anon 401. **Not yet applied** — UGcraftist must paste it to the Supabase SQL editor, then `make views-probe` runs.

- 2026-11-19: **T-007 review rounds 2–4** — rollback probe moved after a source insert (the old assertion could
  never fail); counts via Content-Range; registry-end rule documented and covered both ways; sources store the
  normalized URL, and 0006 backfills pre-existing raw-URL rows (seed importer stores URLs verbatim — follow-up:
  normalize in `seed/importer.py`, T-014's path or a small task).
- 2026-11-19: **T-007 plan corrected** (advisor: change) — `ensure_app_user()` added (nothing else provisions
  `app_users`, so the audit FK would fail on the first real call); `upsert_fact` nests `sources[]` and dedupes
  by `normalize_url` (the schema had no source write path); predicate validation now checks
  `relation_types.is_active` + `subject_kinds`/`object_kinds` instead of repeating table CHECKs; `attrs` vs
  `attrs_schema` deferral stated; denial assertions accept 403/42501/404 **and** assert row counts unchanged;
  credentials docs extended with editor/readonly accounts; CR-007 raised for the plan AC wording.

## CR-009 — ux.md's URL-state sketch contradicts its own route decision (proposed 2026-11-25)

**Raised by:** agent (advisor review of the T-009 plan), owner of the affected doc: UGcraftist (stage-2 gate approved, `STATE.md`).

**Problem.** `ux.md` S-09 shows `#/org/ORG-eu-012?view=tree&...` while the same section decides
"every screen stays on one route, no per-screen routing"; `ORG-eu-012` is a human-readable id no requirement
asks for (FR-004 is about conflicting values), and it is the string S-09's copy button is defined to copy.
The T-009 AC also cited NFR-005 (availability) where it meant FR-023.

**Decision (proposed).** One CR carrying all five corrections:

1. hash route → query string on the single route (`/?focus=<uuid>&view=tree&t=…&f=…&compare=<uuid>`);
2. `ORG-eu-012` → object UUIDs for focus and compare;
3. delete "Stable human-readable IDs (FR-004)" — no FR asks for readable ids;
4. record the history rule: `replaceState`, no history entry in M1 (back-button view history is M2, FR-024/T-012),
   and `view` is `tree|timeline|network` only (the table is NFR-009's alternative rendering, not a view);
5. `plan.md` T-009 AC: NFR-005 → FR-023/FR-027, and the T-009 row's decision-record
   column DR-0001 → DR-0002 + `ux.md:115` (the URL-state decision lives there, not in
   the wireframes-instead-of-Figma record).

**Status:** proposed — waiting for UGcraftist. The T-009 PR contains the `ux.md`/`plan.md` wording so the
change is visible, but must not merge before this CR is decided.

## CR-007 — T-007 acceptance wording drifts from the corrected write contract (decided 2026-11-19)

**Why.** The advisor review of the T-007 plan (`0006_write_rpc`) found the plan's acceptance criteria
(`plan.md` §T-007) no longer match what the corrected contract does, and that one requirement row is
attributed to the wrong task. Both came from files the plan already cited; this is a plan-text defect,
not a new requirement.

1. **AC bullet 1** says `submit_fact` does “关闭旧修订 → 插入新修订 → 写 audit_log”. The implementation
   inserts the new revision in `upsert_fact` (a draft must exist before anyone can publish it) and
   `submit_fact` then requires a source or `no_source`, supersedes the old revision, publishes, and writes
   one audit row with `from_status`/`to_status`. Proposed wording is in the PR.
2. **AC bullet 1 / `api.md`** imply `in_review` in R1. FR-031 is *Won't (R1) · R2* (`requirements.md`), so
   R1 collapses the state: `submit_fact` publishes directly; `in_review` stays in the schema for R2.
   Recorded in `api.md` and the audit summary already.
3. **Requirement row**: `T-007` lists FR-014 (same-name orgs stay separate until a curator decides), but
   nothing in T-007 creates orgs — `merge_source` dedupes *sources*. FR-014 belongs to T-014 (S-10 UI),
   which already lists it. Proposed: drop FR-014 from the T-007 row.

**Recommendation.** Accept all three: reword AC bullet 1 as above, note the R1 `in_review` collapse, and
remove FR-014 from the T-007 row (T-014 keeps it). The code already follows the corrected contract.

**Status:** accepted by UGcraftist 2026-11-19 (all three); `plan.md` T-007 row and AC now carry the corrected
wording, FR-014 stays only on T-014. `api.md`/`data-model.md`/`security.md` were already updated with the
corrected contract in the same PR, so plan and contract now agree. PR #5 may merge only after the
stage-5 step-8 review is clean and UGcraftist approves the merge (one-way door).
