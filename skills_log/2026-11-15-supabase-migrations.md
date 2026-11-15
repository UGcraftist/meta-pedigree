# Supabase 迁移复盘：为什么是四个 SQL、我做了什么、我错在哪

- 日期：2026-11-15（UTC）
- 分支：`feat/T-004-read-model`（HEAD `7ab4ec4`）
- 涉及：`supabase/migrations/0001_init.sql` … `0004_tree_nodes_dedup.sql`
- 验证工具：`make probe`（schema）、`make views-probe`（读模型）、anon 权限探测

---

## 1. 为什么需要这么多 SQL

三个结构性原因，每个都对应一个无法回避的约束：

### 1.1 云端 dev 库只能从 Dashboard 的 SQL Editor 执行（DR-0006）

Supabase dev 项目没有开放的 Postgres 直连通道给这个工作流用（`.env` 里只有 REST 的两个 key：anon 与 service_role；机器上也没有 `psql` / `supabase` CLI）。所以**任何 DDL 都必须有人手工粘贴到 Dashboard 执行**。迁移文件因此承担两个职责：

1. 可复制粘贴的**执行单元**（一次粘贴必须能整体成功或整体回滚）；
2. 数据库的**变更台账**——Dashboard 的迁移历史里每条对应一个文件，留痕、可回滚、可重放。

所以 "SQL 文件多" 的第一层原因是：**每个文件 = 一次人工粘贴 = 一条可追溯的数据库状态变更**。

### 1.2 数据模型本身要求先建表、后建视图（读模型）

R1 的 schema 不是一张表：24 个组织、32 条事实、27 个来源的领域模型里有枚举、注册表（`relation_types` / `stance_axes`）、实体（`orgs` / `persons`）、事实（`facts`，单一存储，关系/角色/事件都走它）、来源（`sources` / `fact_sources`）、立场（`stances`）、审计（`audit_log`），外加 RLS 策略、索引、触发器和授权。这必须原样落进 `0001_init.sql`，一次建成。

读模型（树视图）**不能**用 PostgREST 直查 `facts` 拼出树——PostgREST 不支持递归 CTE。所以需要视图 `tree_edges` / `tree_nodes` / `org_detail`，这是 `0002_read_model.sql` 的存在理由：把树形状在数据库里物化，前端一次请求拿到。用视图而不是 RPC 是因为 R1 只读、无写入，不需要 SECURITY DEFINER 的写路径（T-007 才需要）。

### 1.3 两个"建完才发现"的正确性缺口，各需要一次修复迁移

| 迁移 | 目的 | 为什么不能合进前一个 |
|---|---|---|
| `0001_init.sql` | 全量 schema + RLS | 基础 |
| `0002_read_model.sql` | 三张读模型视图 + 授权 | 依赖 0001 的表 |
| `0003_tree_direction.sql` | 修正 `tree_edges` 的父子极性 | 0002 假设"subject 永远是 parent"，但注册表里 `split_from` / `controlled_by` / `merged_into` 的 subject 是 **child**；这是评审时对照 `data-model.md` 发现的语义错误，不能悄悄改 0002，必须留下可追溯的修正记录 |
| `0004_tree_nodes_dedup.sql` | 消除 `tree_nodes` 的 fan-out（一个组织两行）+ 恢复授权 | 0003 用 `drop/create` 重建视图时把 `confirmed` 授权丢了（视图不继承表授权）；同时发现 Boston Dynamics / Franka 因双父边各出两行——这是 0002 递归写法本身的问题，只能在既有状态上修复 |

换句话说：**1 个基础 schema + 1 个读模型 + 2 个在验证中被发现的正确性修复**。修复之所以是独立文件而不是改历史，是为了让每条变更都能对上 Dashboard 的迁移台账，符合 DR-0006。

---

## 2. 我做了什么（逐文件）

### `0001_init.sql` — 核心 schema（T-002）
- 7 个枚举：`org_kind`、`fact_status`、`visibility`、`certainty`、`date_precision`、`source_kind`、`audit_action`。
- 辅助函数：`uuidv7()`（PG16 无内置，手写 48-bit 时间戳 + v7/variant 位）、`is_editor()`（读 JWT `app_metadata.role`）、`touch_updated_at()`、`check_stance_value()`。
- 表：`relation_types`、`stance_axes`、`orgs`、`persons`、`app_users`、`facts`、`sources`、`fact_sources`、`stances`、`audit_log`。
- 约束与触发器：精度标签与日期列的一致（`unknown ⇔ date is null`）、`facts_amount_scope`、周期顺序、审计表 append-only 触发器、各表 updated_at 触发器。
- 索引：subject/predicate、object（部分索引）、published 部分索引、可见性、URL 等。
- RLS：全部表启用，**只用 `is_editor()` 策略**（R1 无 anon 数据访问）；`revoke all … from anon, authenticated` 后按最小面授予 `authenticated`；写路径留给 T-007 的 RPC。

### `0002_read_model.sql` — 读模型（T-004）
- `tree_edges`：已发布（published + public）的 implied_parent 关系，归一化输出 parent/child。
- `tree_nodes`：从"不在任何边里当 child"的根出发递归，给每个可见组织算 depth、is_root、child_count、parent_count。
- `org_detail`：组织行 + 按时间排序的已发布事实 JSON（含每条事实的来源数组）。
- 全部 `security_invoker = true`，让底层表的 RLS 继续生效。

### `0003_tree_direction.sql` — 方向修正
- 用 `case` 把 `split_from` / `controlled_by` / `merged_into` 三条谓词反转成 parent→child，其余谓词（`acquired`、`parent_of`、`subsidiary_of`）保持原方向。
- 递归视图依赖 `tree_edges`，所以先 drop `tree_nodes` 再 drop `tree_edges`，按依赖顺序重建。

### `0004_tree_nodes_dedup.sql` — 去重 + 恢复授权
- 递归结果先 `group by id` 取 `min(depth)` 再 join，保证每个组织恰好一行，且渲染在它最浅的祖先链下面。
- 补 `grant select on public.tree_nodes to authenticated`（0003 的 drop/create 把授权丢了）。
- 我的 Web 代码里本来也有防御性去重，但现在读模型契约本身就是干净的。

### 验证（每步都做了）
- `make probe` 8/8（schema、约束、RLS、trigger 等）；
- `make views-probe`：`tree_nodes` 26→24 行、24 个组织；`tree_edges` 5 条；`org_detail` 24 行、24/24 有事实、34 条带 URL；
- anon 探测：`tree_nodes` / `tree_edges` / `org_detail` 均 401（42501 权限不足），证明边界没被 drop/create 弄坏；
- Franka 的单行仍带 2 条父边（`split_from` + `acquired`），去重只合并节点行、没吞关系。

---

## 3. 我犯了什么错

### 错误 A（严重）：`0004` 第一版基于幻觉 schema，从未验证就交付

第一版 `0004` 引用了 `public.org_relations`、`publish_state`、`predicates` 这些**真实库里不存在的表/列**。这些名字来自设计文档的早期草稿，而真实模型是：关系全在 `facts`（`subject_id`/`object_id`/`predicate_code`），读模型用 `tree_edges` 归一化方向。

后果：用户粘贴后立即报 `42P01: relation "public.org_relations" does not exist`（LINE 20），整个脚本事务回滚，**没有产生副作用**。

根因：
1. 写迁移前没有对照 `0001_init.sql` 的真实列名与 `docs/design/data-model.md` 复核；
2. 本地没有执行环境，我却把它当成"已应用"汇报，验证只做了静态的 `cat` 一致性检查。

修复：按真实 `tree_edges` 重写为 `min(depth)` 去重版，`git commit --amend` 合进原提交（`7ab4ec4`），坏版本没有留在历史里。

### 错误 B（中等）：`0003` 的 `drop/create` 静默丢失授权

`drop view` 后重建不会继承原授权，0002 里的 `grant select … to authenticated` 因此失效。当时没发现，是后来补 anon 探测时才确认 0004 必须重新授权。若没补，编辑器读视图会 401。

教训：**凡是 `drop/create` 视图的迁移，必须同文携带 grants**；并且每次视图迁移后都应跑一次 anon 401 探测（而不只是 service_role 的 `views-probe` 通过）。

### 错误 C（事实层面，非我造成）：`views-probe` 当时无法区分 24 个组织的唯一性

probe 只断言"行数等于组织数"，而 0002/0003 的视图给 26 行时 probe 报 FAIL、给 24 行时报 PASS，逻辑上是对的；但"total rows"与"distinct orgs"的断言是两个不同的等价类，我最初只写了行数。后来改用明确输出 `distinct orgs` 的表达。这条属于验证设计问题，已顺手修正。

### 我做不到的事（需要你知道的边界）
- 我没有 dev 库的 Postgres 连接串，也没有 `psql`/`supabase` CLI，所以**无法执行 DDL、无法在本地跑迁移**。迁移的"执行"永远发生在你的 Dashboard 粘贴里；我只能做写前复核、写后 REST 探测。
- 因此迁移文件的质量上限取决于我的静态复核。这次事故证明：静态复核不够，**凡涉及新表/新列的迁移，必须先 grep `0001_init.sql` 与 `data-model.md` 对齐**，且至少用 REST 探测一次预期会被引用的表/视图是否存在。

---

## 4. 以后怎么避免

1. 写迁移前先 `grep` 真实 schema（`supabase/migrations/0001_init.sql`）与 `docs/design/data-model.md`，确认每个引用的表/列存在；不确认就写注释 `-- verify:` 并在粘贴前说明。
2. 视图迁移模板固定为：`drop … if exists`（按依赖顺序）→ `create … security_invoker` → `comment on` → `grant select … to authenticated`。四段齐全才算写完。
3. 每次粘贴后立刻跑 `make views-probe` + 对视图做 anon 401 探测，把输出记录在任务评审里。
4. `views-probe` 断言从"行数"升级为"行数 + distinct 组织数"（已做）。
5. 汇报用词区分"已写入仓库"与"已应用到数据库"——后者只有你粘贴并且 probe 全绿之后才成立。

---

## 5. 最终状态

| 检查项 | 结果 |
|---|---|
| 4 个迁移 | 全部应用，Dashboard 台账为 `meta-pedigree-dev:0001_init` … `:0004_tree_nodes_dedup` |
| `make probe` | 8/8 |
| `make views-probe` | `tree_nodes` 24 行 / 24 组织 / 21 根；`tree_edges` 5 行；`org_detail` 24 行、24 有事实、34 条 URL |
| anon 访问三视图 | 全部 401（42501），边界完好 |
| 工作区 | clean，HEAD `7ab4ec4`（0004 修复版已 amend 进该提交） |
