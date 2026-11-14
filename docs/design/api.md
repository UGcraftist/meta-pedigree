# API contract
Audience: engineers · Last updated: 2026-11-14 by UGcraftist
Sources: DR-0002 (REST/OpenAPI), ux.md (screens), requirements.md FR-001…FR-024

Base path `/api/v1`. JSON only, UTF-8, `snake_case`. Contract: `api/openapi.yaml` — 先写契约，前后端
（同一人）对着它开发；契约变更走新的 DR。

## Conventions

- 鉴权：R1 编辑接口用 `Authorization: Bearer <token>`（token 由环境变量注入，不入库、不入文档）；
  读接口 R1 无需鉴权（本地），R2 公开站再加只读凭证。
- 错误：`{"error":{"code":"string","message":"human","details":{}}}`，HTTP 状态对应 400/401/404/409/422。
- 分页：`limit`（默认 50，最大 200）+ `cursor`（keyset，UUID v7）。
- 时间：日期 `YYYY-MM-DD`，时间戳 ISO 8601 UTC。时间精度以 `{"start":"1998-01-01","precision":"year"}`
  形式返回，展示文案由前端 `format()` 生成（FR-014）。
- 版本：`/v1`；破坏性变更 → `/v2` + DR。

## Operations (Must)

| Method | Path | Purpose | Auth | Story |
|---|---|---|---|---|
| GET | /orgs | 搜索组织（`q`, `kind`, `country`, `limit`, `cursor`） | — | US-005 |
| GET | /orgs/{id} | 组织详情 + 时间窗 + 关系计数 | — | US-004, US-008 |
| GET | /tree | 以 root 为焦点的谱系（`root`, `depth≤6`, `relation_family`） | — | US-004 |
| GET | /timeline | 时间轴（`from`, `to`, `kind`, `view`） | — | US-010 |
| GET | /network | 关系网（`root`, `depth≤3`, `relation_types`） | — | US-011 |
| GET | /facts/{id} | 事实详情 + 来源列表 + 修订链 + 冲突组 | — | US-001, US-002, US-006, US-009 |
| POST | /facts | 新建事实（draft） | editor | US-003, US-006 |
| PATCH | /facts/{id} | 修订（产生新行，不覆盖） | editor | US-021, US-009 |
| POST | /facts/{id}/submit | draft → in_review | editor | US-003 |
| POST | /facts/{id}/publish | 发布（校验来源/时间/无来源标记） | editor | US-003 |
| GET/POST | /sources | 按 fact 列来源 / 新增来源 | —/editor | US-001 |
| GET/POST | /registry/relation-types | 词表读 / 新增关系类型 | —/editor | US-024, FR-015 |
| GET/POST | /registry/stance-axes | 立场轴读 / 新增轴 | —/editor | US-024 |
| GET | /stances?party_id= | 某党的立场（含对华/对美轴） | — | US-024 |
| GET | /audit?entity=&entity_id= | 审计（R1 仅编辑器） | editor | US-021 |
| GET | /export/views/{view} | 导出数据快照供前端出 PNG | — | US-020 |

## Response snippets

```json
// GET /api/v1/facts/0191...
{"id":"0191...","subject":{"kind":"org","id":"0190...","name":"Boston Dynamics"},
 "predicate":"acquired","object":{"kind":"org","id":"0190...","name":"Kinema Systems"},
 "period":{"start":"2019-04-01","precision":"month","end":null,"end_precision":null,"qualifier":"exact"},
 "certainty":"exact","status":"published","has_source":true,
 "sources":[{"kind":"article","title":"...","url":"https://...","accessed_at":"2026-11-10T00:00:00Z"}],
 "conflicts":[],"revision_of":null}
```

## 覆盖检查

每条 Must 故事至少一个操作；US-012（筛选）由 `/tree` 的 `relation_family` + 前端筛选；US-013 由
`/facts/{id}` 返回 `conflicts`；US-014 由 `/orgs` 的 `q`+`country`；US-015 由前端状态（无专门接口）。
