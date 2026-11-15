# DR-0006 迁移用 SQL 编辑器逐个应用；唯一特权密钥是 service_role（不用 DATABASE_URL）

Status: accepted
Date: 2026-11-15
Category: operations, security, migration
Reversibility: easy（随时可改用直连 + CLI，见 Revisit triggers）
Decided by: UGcraftist（沿用其既有项目做法）
Related: DR-0005, T-002, security.md

## Context

DR-0005 写的是"种子导入仍用 Python，连 `DATABASE_URL`"。落地时发现三件事：

1. 本机没有 `psql`，也没有 Supabase CLI（`npx supabase` 可装，但要额外工具链）；
2. 迁移只有一份（`supabase/migrations/0001_init.sql`），为它维护一条直连通道的收益很低；
3. 用户已有成熟做法：**迁移在控制台 SQL 编辑器里粘贴，按项目各存一份命名查询；特权密钥只留 service_role，放进本机 git-ignored 的 env；RLS 用 Node 脚本走 REST 证明（anon 被拒、service_role 自建自删 fixture）**。

直连带密码的另一个代价是**凭据覆盖面**：`DATABASE_URL` 里的 postgres 角色能 DDL、能读 `auth` schema；而 service_role 只能经 PostgREST 读写暴露的表，做不了 DDL，也碰不到 `auth.users`。

## Decision

- **迁移应用**：把 `supabase/migrations/NNNN_*.sql` 全文粘贴进 Supabase 控制台 SQL 编辑器执行；每个项目保存为命名查询（`<project>:<file>`），作为"已应用"的人读记录。dev 与 prod 各自粘贴同一份文件。
- **唯一特权密钥**：`SUPABASE_SERVICE_ROLE_KEY`，只存在编辑者本机 `.env`（git 忽略）与 Supabase 控制台；用于种子导入与 RLS 探针，**不进前端、不进 CI、不进仓库**。取消 `DATABASE_URL`。
- **种子导入**：`seed/importer.py` 改为通过 PostgREST 写入（`Prefer: resolution=merge-duplicates`），不再依赖 psycopg；依赖表顺序 upsert，幂等，失败重跑。
- **RLS 证明**：`seed/rls_probe.mjs` 走 REST：anon 的读与写必须被拒（本项目撤回了 anon 的表权限，返回 401/403；若只撤策略不撤权限，UPDATE/DELETE 会返回 200 + 0 行——探针把两种都判为拒绝）；service_role 建/读/改/删自己的 fixture 行。`make probe`。
- **前端与 CI**：只持有 anon key（公开安全，RLS 兜底）。

## 两条路线的比较（用户提问的直接回答）

| 维度 | 本决定：SQL 编辑器 + service_role | 直连：`DATABASE_URL` + psql/CLI |
|---|---|---|
| 迁移应用 | 手工粘贴，每项目一次；无自动 ledger | `supabase db push` / `psql -f`，可脚本化、可 CI |
| 特权凭据 | 1 个（service_role），只能走 REST | 1 个（postgres 密码），能 DDL、读 auth schema |
| 泄露后的爆炸半径 | 改/删数据；不能改 schema、不能建函数 | 改数据 **+ 改 schema + 读 auth.users + 装扩展** |
| 吊销 | 控制台 rotate service_role，前端不受影响 | 重置数据库密码；需同步所有使用方 |
| Postgres 网络暴露 | 仍经 Supabase pooler 可达（直连端口也在），差别不在这里 | 同上；"关闭公网"不成立，真正的差别是**谁持有能 DDL 的凭据** |
| 漂移检测 | 靠人比对命名查询；prod 重放前无法自动 diff | `supabase db diff --linked` 可在发布前比对 dev/prod |
| CI | 无法自动应用迁移；集成测试只能读 anon | 可应用迁移 + 跑 SQL/RLS 测试 |
| SQL 层测试 | 无（只有 REST 路径测试） | pgTAP 可测策略本身、覆盖未暴露的表 |
| 本机准备 | 零（有浏览器即可） | 装 psql 或 CLI；本机当前两者都缺 |

**结论**：R1 规模（一份迁移、单编辑者、无 CI）下，本决定胜在凭据面窄、零工具链；直连胜在可重复与可验证，但那部分价值要等迁移变多或 CI 出现才兑现。

## Revisit triggers（直连何时值得）

出现任一条，就新开决策记录改用直连（并把 `DATABASE_URL` 作为第二个凭据登记）：

1. 迁移文件超过 5 份，或 T-004/T-007 期间需要每天改 schema；
2. T-022 CI 需要自动应用迁移并跑集成测试（届时 CI 用**专用低权角色**，不用 postgres）；
3. stage 7 发布前需要 dev↔prod schema diff 兜底；
4. 需要 SQL 级策略测试（pgTAP）或 `EXPLAIN ANALYZE` 性能分析。

## Perspective review

| Perspective | Reviewer | Verdict | Notes |
|---|---|---|---|
| Backend | UGcraftist | agree | REST upsert 足够种子导入；失去跨表事务，用"全量校验后写入 + 幂等重跑"补偿 |
| Security | UGcraftist | agree | 特权面从"能 DDL 的 DB 密码"缩到"只能读写暴露表的 REST 密钥"；探针覆盖 anon 拒绝与 service_role 可用 |
| Operations | UGcraftist | agree | 手工步骤靠命名查询留痕；迁移数量增长时按 Revisit triggers 升级 |

## Consequences

- **好**：仓库与 CI 中永不需要 DB 密码；密钥只有一个且可单独轮换；RLS 用与生产相同的 REST 路径证明。
- **坏**：迁移应用不可脚本化、无自动 ledger、无事务化导入；prod 部署多一步手工粘贴，遗忘即漂移。
- **补偿**：迁移文件是唯一来源，命名查询名带项目前缀；发布检查单（stage 7）增加"比对 dev/prod 命名查询清单"；`seed/importer.py` 先整体校验再写，失败可安全重跑。
- **对 DR-0005 的修正**：其"种子导入连 `DATABASE_URL`"一句由本条取代；其余不变。
