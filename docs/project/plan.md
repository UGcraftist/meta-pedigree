# Plan: Meta Pedigree

Estimate scale: **days, 1 day ≈ 6 h of focused work** (chosen for one developer; capacity is tracked in the same unit below).

Milestones follow the release slices in requirements.md. M1 is the walking skeleton plus the internal preview (2026-11-18); M2 delivers full Must scope for R1 (2026-12-13, CR-001 option B).

## Milestones

| ID | Goal | Includes | Target date | Status |
|---|---|---|---|---|
| M1 | Walking skeleton + internal preview: tree view over 20 seed orgs, URL state, runnable locally | T-001…T-006 | 2026-11-19 | done (T-001–T-006 merged into master via PR #1–#4) |
| M2 | R1: all Must scope — timeline, focus/provenance, search/filter, missing markers, entry & verify station, party fixture | T-010…T-024 | 2026-12-13 | planned |

## Tasks

| ID | Task | Milestone | Assignee | Requirement | Design (S-/API/TH-) | decision record | Estimate | Depends on | Status |
|---|---|---|---|---|---|---|---|---|---|
| T-001 | Scaffold repo per code organization: `api/` (FastAPI, `/healthz`, pytest), `web/` (Vite/React skeleton), venv bootstrap, README run/test; `db/`+`seed/` land in T-002, CI in T-022 (CR-002) | M1 | UGcraftist | NFR-07 | — | DR-0002, DR-0004 | 0.5 | — | done |
| T-002 | `supabase/migrations/*.sql` core schema (orgs, persons, facts, sources, fact_sources, relation_types, stance_axes, stances, audit_log, app_users) + RLS; Python seed importer via service_role → PostgREST（DR-0006）; `api/` removed | M1 | none | FR-003,009,010,011,014 | data-model.md | DR-0003, DR-0005, DR-0006 | 0.75 | T-001 | done |
| T-003 | Research + seed 20 orgs (tree skeleton for preview) from sources into seed JSON; validation script. **Done:** 24 orgs (20 target + DLR/MIT/Midea/Hyundai as pedigree parents), 29 sourced facts, 27 sources; `make seed` imported | M1 | none | FR-024 | — | — | 0.5 | T-002 | done |
| T-004 | Read views per `api.md`: `tree_nodes`/`tree_edges`, `org_detail` (facts+sources JSON); `api.md` 改写为 PostgREST 契约（OpenAPI 由 PostgREST 自动生成，不提交）; migration `0002_read_model` | M1 | none | — | api.md | DR-0005 | 0.5 | T-002 | done |
| T-005 | S-01 tree screen: SVG/D3 render, expand/collapse, view switcher stub, per-edge predicate text label (visual encoding + legend is T-012). **In review (round 2: approve on the shared commit, PR #3 open; CR-005 decided):** login gate (email/password), component-packed D3 layout, year labels, multi-parent badge, table view, light/dark theme toggle; verified in a real browser (screenshots under `build/preview/`, not committed) | M1 | none | FR-013,025,026 | S-01 | DR-0001 | 0.75 | T-004 | done (merged via PR #3) |
| T-006 | S-07 minimal detail drawer + URL state (node focus in address bar, copyable). **In review (round 2 approved by the reviewer on 9b4a969; person approval pending after 0005 + views-probe):** `org_detail` drawer (facts/sources/`无来源`), `?focus=` deep link restores on reload, Esc clears, unknown id banner, copy link, focused-node highlight | M1 | none | FR-023(partial) | S-01, S-07 | DR-0001 | 0.25 | T-005 | done (merged via PR #4) |
| T-007 | Write path: RPC `upsert_fact`（内嵌 `sources[]` 同事务写来源）、`submit_fact`（源或显式无源 → 旧修订 superseded → published → 一条 audit 记 old→new + actor）、`upsert_stance`、`merge_source`（归一化 URL 相等才合并）；`ensure_app_user` 保证审计 FK 可写；全部 `security definer` + pinned `search_path`，execute 只给 authenticated；migration `write_rpc`（编号见 data-model.md 台账）; 新增 `make write-probe` | M1 | none | FR-006,007,008,009,017 | data-model.md, TH-02 | DR-0003, DR-0005 | 1.0 | T-002 | done |
| T-008 | Test ladder: lint（ESLint 9 flat，0 error；Prettier 已配置但未进 gate，待独立 `chore(format)` 提交后启用）+ typecheck（`tsc -b`，与 `npm run build` 共用）+ vitest（树布局/D3 布局/URL 状态/api 去重）+ pytest 种子校验；`make setup && make check` 从干净 checkout 通过且无需凭据；契约形状由 `views-probe` 对真实响应断言（DR-0007:48），RPC 负例与回滚在 `write-probe`（DR-0005:25）。**Deviations:** lint/typecheck 是 DR-0002:39 已有的要求、不需 CR；时间轴刻度测试移交 T-011（CR-008） | M1 | none | NFR-07 | — | DR-0002, DR-0005, DR-0007 | 0.5 | T-005, T-006 | done |
| T-009 | Shared URL-state hook：`?view=&focus=&t=&f=&compare=` 走查询串（单路由，哈希不动）；纯解析/序列化 + 注入 `HistoryPort`，读 → 订阅（popstate）→ 写回（`replaceState`，串未变不写）可单测；未实现的 `t`/`f`/`view=timeline\|network` 原样保留并提示，无法解析的参数连键带原值丢弃；`view` 仅 tree\|timeline\|network（表格是同一视图的替代渲染，不进 URL） | M1 | none | FR-023, FR-027 | S-01 | DR-0002 + ux.md § URL state | 0.5 | T-005, T-006 | done |
| T-010 | S-07 object detail (orgs): migration `detail_contract`（按台账编号）给 `org_detail` 增加 `status`/`conflict_key`/事实源的四字段 `author`/`page`/`published_at`/`accessed_at`，并把 fact JSON 抽到 `facts_for(uuid)` 供 T-024 复用；抽屉按 `conflict_key` 分组、disputed 并列（无主列、按 `start_date nulls last, id`）、一行式引文（author→title→url 的降级顺序）、`无来源` 无引文按钮、年份用纯函数 `precisionSpan` 显示区间；夹具（disputed 对、无源、作者/页码/访问日期）同 PR | M2 | none | FR-001,002,003,004,005 | S-07 | DR-0003, DR-0007 | 1.5 | T-006 | todo |
| T-024 | S-07 person detail + role timeline: 人物详情屏，读取 `org_detail` 同源的 `facts_for`/`object_detail`（`kind='person'`），角色按时间排列、缺口可见（FR-017）；person fixture（1 人 2 段角色）同 PR。CR-010 从 T-010 移入 | M2 | none | FR-017 | S-07 | DR-0003, DR-0007 | 1.0 | T-010 | todo |
| T-011 | S-03 timeline screen: episodes grouped, anchor years, year-band rendering, stable enter from S-01/S-04 | M2 | none | FR-003,025 | S-03 | DR-0001 | 1.5 | T-005 | todo |
| T-012 | S-04 focus view: chain highlight + dim rest, restore previous view on Esc, relation legend | M2 | none | FR-012,013,021 | S-04 | DR-0001 | 1.0 | T-011 | todo |
| T-013 | S-05 search + combined filters (PostgREST `search_orgs`, pg_trgm), persisted in URL, missing counts separate; migration `search`（编号见 data-model.md 台账） | M2 | none | FR-005,023,024 | S-05 | DR-0001 | 0.5 | T-010 | todo |
| T-014 | S-10 entry & verify station UI: create/edit org/person/fact/relation/source, registry-typed relation, stance axes, validation naming dangling ids, audit trail, merge decision; calls T-007 RPCs | M2 | none | FR-006,007,008,009,014 | S-10 | DR-0003, DR-0005 | 2.0 | T-007 | todo |
| T-015 | Share/export: URL snapshot + PNG/SVG export with source appendix, CSV/JSON subset export (Should — build only after Must is green) | M2 | none | FR-027,028 (Should) | S-06 | DR-0001 | 1.0 | T-012 | todo |
| T-016 | S-08 error/empty states (empty tree, no results, failed save) | M2 | none | — | S-08 | DR-0001 | 0.5 | T-013 | todo |
| T-017 | Expand seeds to 100 orgs + persons + relations; party fixture (FR-011 fields, China/US axes); data quality run（FR-017 的人物屏在 T-024；as-of per fact 见 CR-010） | M2 | none | FR-010,011,024 | — | DR-0003 | 2.0 | T-014 | todo |
| T-018 | Security: Supabase Auth invite (single editor), RLS editor policies + negative tests (anon denied), audit actor from JWT, headers per TH-01…TH-05, log hygiene | M2 | none | NFR-08 | TH-01…TH-08 | DR-0005 | 0.5 | T-007 | todo |
| T-019 | Deploy: Cloudflare Pages (`wrangler pages deploy`, env vars) + Supabase project (dev/prod separation, backup/restore runbook) | M2 | none | NFR-07 | — | DR-0005 | 0.5 | T-018 | todo |
| T-020 | NFR validation: perf at 100 orgs (pan/zoom ≥30 fps), WCAG AA contrast, target browsers | M2 | none | NFR-02…06, FR-026 | — | — | 0.5 | T-017 | todo |
| T-021 | Review passes (stage 6 on two walkthroughs: first-time visitor, data editor) + fixes | M2 | none | — | — | — | 2.0 | T-020 | todo |
| T-022 | CI pipeline (GitHub Actions: build, typecheck, `make check`); also needed for Cloudflare Pages Git integration; remote exists now (`github.com/UGcraftist/meta-pedigree`, PR #1–#4) so CR-004/T-022 are unblocked | M1 | none | NFR-07 | — | DR-0004, DR-0005 | 0.25 | T-001 | todo |
| T-023 | CLI-tracked migrations (CR-006 phase 2): adopt `supabase` CLI migration history for dev/prod, DR-0008, prod paste runbook; needs an owner-held DB password; starts after T-022 and before any prod migration | M2 | UGcraftist | NFR-07 | — | DR-0006, DR-0008 | 1.0 | T-022 | todo |

### T-001 acceptance criteria (rescoped by CR-002)
- `api/`, `web/` exist per DR-0004 code layout; `GET /healthz` returns 200 + version; `make test` green; `make venv` works from a clean checkout (self-bootstraps pip).
- `web/` compiles (`npm run build`).
- Root `README.md` has run, build, test and deploy steps that a stranger can follow.
- `db/` + `seed/` are T-002; CI is T-022 (remote now exists).

### T-002 acceptance criteria
- dev 空库从 SQL 编辑器应用 `0001_init.sql` 后 `make probe` 全绿（anon 写被拒、service_role 自建自删）；ER 与 `data-model.md` 一致。
- 种子导入器拒绝悬空 id 并点名（FR-006 规则）；导入器从 JSON 运行、只需 service_role、不需要部署。

### T-003 acceptance criteria
- 20 orgs with at least one sourced fact each load; every fact carries source + as-of or is explicitly `无来源`.

### T-004 acceptance criteria
- PostgREST 视图 `tree_nodes`/`tree_edges` 与 `org_detail` 返回关系类型、时间带、事实、来源、关系；与 `api.md` 一致（DR-0007）。
- 视图只向普通读者返回已发布行（R1 由 RLS 控制；R2 打开 anon 只读）。

### T-005 acceptance criteria
- Tree renders 20+ orgs with expand/collapse; each node carries its founded year + precision badge (`ux.md` S-01: "每个日期带 precision badge" — 带 is the verb "carries", not a date-band shade; FR-003's year-only band belongs to T-010/T-011); click a node → focus; URL updates (T-006).

### T-006 acceptance criteria
- Reload with a node id in the URL restores that focus; address bar state is copyable and pasteable.
- 抽屉把每条事实渲染成 `subject · 谓词 · object`：**始终 subject 在前**，查看对象端（如 Boston Dynamics 的 `controlled_by`）也不反转；无 object 的事实（`founded`）只渲染 subject 与谓词，不追加隐藏对象尾巴；被 visibility 过滤的一端显示显式占位且不可导航；person 端不可导航（S-07 的人物屏尚未做，T-024；S-02 是树视图）。
- `triple.test.ts` 覆盖：对象端查看、无 object、隐藏对象、隐藏 subject、person 不可导航。

### T-007 acceptance criteria
- `upsert_fact` 在单事务里落库（校验注册表 `is_active`、subject/object kind 兼容、两端 id 必须存在并命名悬空 id、日期/精度配对、amount 只属于 `controlled_by`；payload 内嵌 `sources[]` 时同事务写 `sources` + `fact_sources`，按 `normalize_url` 去重）。
- `submit_fact`：要求"来源或显式无来源"，否则拒绝且不留半写；通过则旧修订置 `superseded`、本行 `published`、写一条 audit（`from_status`/`to_status` + actor id/email），失败全部回滚（TH-02）。R1 折叠 `in_review`（FR-031 属 R2，见 `api.md`）。
- RLS 负例：anon 与只读用户写操作被拒；只有 `app_metadata.role='editor'` 可写。`make write-probe` 用**第二个非 editor 测试账号**验证（anon 拒 ≠ 只读用户拒），接受 403/42501 或 404，并在每次拒绝后断言行数未变。
- FR-008：发布后用 editor JWT 重读 `org_detail`，断言新事实可见（`views_probe` 的 authenticated 路径即漂移探测器）。
- `merge_source` 归一化正例（相同 → 合并）与负例（路径不同 → 拒绝、不删行）各有测试，按 `api.md` 的归一化规则；合并是单次审计的 one-way 操作。

### T-008 acceptance criteria
- `make setup && make check` 在干净 checkout 通过、不需要任何密钥：structure check + pytest（种子校验）+ ESLint（0 error）+ `tsc -b` + vitest（树布局/D3 布局/URL 状态/api 去重）。
- 契约形状由 `make views-probe` 断言真实响应（`tree_nodes`/`tree_edges`/`org_detail` 的字段与可空性），而不是提交的手写 OpenAPI（DR-0007:48）。
- SQL 层负例与回滚由 `make write-probe` 断言（DR-0005:25：pytest 只保留种子校验；`db/verify.sql` 已不存在）。**已知缺口**：该探针需要 service_role 与账号，进不了 CI（DR-0006:38），T-023 前不得声称 CI 覆盖回滚。

### T-009 acceptance criteria
- 视图/聚焦/时间窗/筛选/对比组写进 URL（查询串、单路由）；canonical 序列化固定参数顺序、省略默认值；复制链接复制 canonical 串而不是原始地址栏；哈希原样保留（FR-023/FR-027）。
- 未知 id 或无法解析的参数不崩溃、不猜测：连键带原值丢弃并提示；`t`/`f` 与 `view=timeline|network` 属于尚未实现的控件时原样保留并提示（FR-023；原 NFR-05 引用有误，见 CR-009）。
- 读 → 订阅（popstate）→ 写回（`replaceState`，串未变则不写）通过注入的 `HistoryPort` 单测覆盖；浏览器内手测记录在 PR 与 changes.md 的 implementation log。

### T-010 acceptance criteria
- 每条事实显示来源（author/page/published_at/accessed_at 四字段分别标注"出版/访问"）+ locator，或显式 `无来源`；复制引文粘贴为一行（author → title → url 的降级顺序，无空括号、无换行），`quote` 不进入引文（NFR-008）。
- 冲突：同一 `conflict_key` 的多行事实并列显示，**无主列**、无"主来源"样式，各自带值/来源/`无来源`；组内按 `start_date nulls last, id`；组标题复用 `triple.ts` 的 subject-first 渲染；disputed 组来自真实夹具（`founded` 两说，各一来源）。
- 年/月精度按 `precisionSpan(date, precision) → {from, to}` 显示为区间（如 1998 全年），不出现静默按日的点；组织自身的 `founded_date` 同样处理。
- 设计状态覆盖 `ux.md` S-07 的 sourced / no source / conflicting values / missing fields 四态，外加 loading/error/长内容/1024px；3 行冲突组在 1024px 不溢出。
- `views-probe` 断言至少一条非空 `author`/`locator`/`accessed_at`、一条 `status='disputed'`、一个大小 2 的 `conflict_key` 组（断言必须能失败）。

### T-024 acceptance criteria
- 人物详情列出全部角色（职位/组织/起止/精度/来源），按时间排序且时间缺口可见（最新角色附 as-of，过期标 "last confirmed <year>"，FR-019）；person fixture（1 人 2 段角色）同 PR。
- 人物屏与组织详情共用同一 fact JSON（`facts_for`），不重复解析；`无来源`/冲突规则与 T-010 一致。

### T-011 acceptance criteria
- Timeline shows 3–4 episodes; a year-only event renders as a band, not a point; entering from the tree lands on the same node in the timeline; at 100 orgs it stays interactive (no full relayout on scroll).
- 时间轴刻度：年份带与年份标签在 vitest 中有断言（由 T-008 移交，CR-008）。

### T-012 acceptance criteria
- Click an org → its lineage chain highlighted, rest dimmed; Esc restores the exact previous view (pan/zoom/filters); each of the five relation types has its own encoding in the legend.

### T-013 acceptance criteria
- Two filters combine; reload reproduces the filtered view; missing values reported as "missing: N", never 0; search by alias jumps to focus without losing scroll position.

### T-014 acceptance criteria
- Save a relation to a non-existent org → rejected, bad id named; edit a relation → object history lists editor, time, old → new; edits appear after refresh with no rebuild; add a new relation type via registry → it renders and filters without a deploy; same-name orgs stay separate until a merge decision is recorded; **mark one of two conflicting facts `disputed` through the station** (FR-004's authoring path; R1 has no such path until this task).

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

## Change log

- 2026-11-14: CR-003（DR-0005）平台切换为 Supabase + Cloudflare Pages，取消应用服务器。
  T-002/T-004/T-007/T-014/T-018/T-019 范围相应改写；补上原先缺号的 T-007…T-009 任务与验收标准（计划表曾引用它们却没有行）；T-022 同时是 Pages Git 集成的依赖。
