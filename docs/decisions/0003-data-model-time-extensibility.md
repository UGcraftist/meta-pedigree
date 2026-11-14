# DR-0003: 数据模型——事实为中心、五档时间精度、注册表扩展

- Status: accepted
- Date: 2026-11-14
- Category: custom (data model)
- Reversibility: one-way (schema)
- Decided by: UGcraftist (2026-11-14)

## Context

US-024 要求同一模型同时装得下企业（收购/分拆/控股/改名）与政党（派系/联盟/选举/立场），
增删关系与立场轴不改代码。US-001/002 要求来源是一等公民；US-009 要求冲突并列、不覆盖；
FR-014 要求时间五档精度（日/月/年/区间/未知）。Q9 的政党字段：**派系、联盟、选举、意识形态、
对华态度、对美态度**（2026-11-14）。

## Options considered

| Option | Fits because | Does not fit because |
|---|---|---|
| 专表：org_relation / person_role / party_stance 各自建表 | 查询直白 | 每加一种关系/轴都改 schema 与代码（违反 US-024） |
| **事实表 fact + 注册表 relation_type / stance_axis** | 一条事实 = 主体+谓词+客体+时间+来源+置信度；词表是数据行 | 需索引设计；通用表的约束要在应用层补 |
| 纯 JSONB 事件日志 | 最灵活 | 无法约束、无法高效递归查询树 |

## Decision

### 核心表（R1）

| 表 | 关键列 | 说明 |
|---|---|---|
| `org` | id uuid pk, name, name_zh, kind (company/party/faction/state_actor/lab), country_code, founded_* , dissolved_*, visibility | 组织；政党域用 kind=party/faction |
| `person` | id uuid pk, name, aliases text[], birth_*, death_*, nationality | 人物 |
| `relation_type` | code pk, label_zh, label_en, domain, subject_kinds text[], object_kinds text[], symmetric bool, implied_parent bool, attrs_schema jsonb | **注册表**；企业域 5 种 + 政党域（faction_of / alliance_with / contested_in / succeeded_by）种子行 |
| `fact` | id uuid pk, subject_kind, subject_id, predicate_code fk, object_kind, object_id null, object_literal null, period_* , amount numeric null, attrs jsonb, certainty enum, status enum, visibility enum, revision_of uuid null, editor_id, created_at, updated_at | **事实**：关系/任职/持有/立场通用行。冲突 = 同一 (subject,predicate,object) 多行，status=disputed |
| `source` | id uuid pk, fact_id fk, kind (book/article/url/archive), title, author, url, published_*, page, quote, accessed_at | 来源；一条事实 0..n 条（0 = `无来源`，FR-001） |
| `stance_axis` | code pk, label_zh, scale_min smallint, scale_max smallint, anchors jsonb | 立场轴注册表：`left_right`、`china`、`us`（-2 敌对 … 0 中立 … +2 友好），可再加 |
| `stance` | id, party_org_id fk, axis_code fk, value smallint, target_kind (state/party/issue), target_org_id null, target_label, period_*, status, source 链同 fact | 政党立场；**对华/对美** = axis `china`/`us`，带时间与来源 |

### 时间精度（FR-014）

每段时间存 4+1 列，全部可空：`start_date date`, `start_precision ('day','month','year','unknown')`,
`end_date date`, `end_precision`, `qualifier ('exact','circa','before','after','between','unknown')`。
显示文案由 `packages/shared` 生成（"1998–2003"、"约 1998"、"2000 年以后"、"起止未知"），
数据库不存展示字符串。约束：precision=year 时日期必须是 1 月 1 日；precision=unknown 时日期必须为空。

### ID 与引用

暴露给外界的一律 UUID v7（时间有序、不可枚举）；内部外键同 UUID。稳定 ID 不随改名变化（US-021）。

### 可见性、修订与冲突

- `status`: draft → in_review → published；`disputed` 是 published 的并列状态。
- 修订：不原地改，插入新行 `revision_of=旧行`，旧行 `status=superseded`；S-08 显示完整轨迹与编辑者。
- 无来源 = 允许但强制 `无来源` 标记（FR-001）；服务端在发布前校验至少一条来源或显式标记。
- `visibility`: public / hidden（受限对象，US-022）。

### 迁移

版本化 SQL 迁移文件（`migrations/NNNN_*.sql`），只向前；expand→backfill→contract。

## Consequences

- Good: 新增政党字段 = 插注册表行 + 前端读词表；冲突与修订可审计；时间精度可查询可排序。
- Bad: 事实表宽、索引多（(subject_id,predicate_code)、(object_id)、period、status）；JSONB 属性无法强约束，靠 attrs_schema 校验。
- Hard to change later: 事实表结构是核心，替换代价高 —— 故此记录一次性冻结到 R1 结束。

## Revisit when

R2 公开站需要多语言字段或版本发布流时，加 `fact_version` 快照表；图遍历深度 >10 或事实 >10 万时评估物化邻接表。
