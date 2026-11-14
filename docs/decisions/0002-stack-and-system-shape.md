# DR-0002: 模块化单体 + React SPA + PostgreSQL，R1 的栈与形态

- Status: accepted (runtime and repo layout superseded by DR-0004)
- Date: 2026-11-14
- Category: system-shape, rendering, data-storage, api-style, code-organization, testing, observability
- Reversibility: one-way (shape, storage, API style); two-way (testing, observability)
- Decided by: UGcraftist (menu defaults accepted as a bundle, 2026-11-14)
- Superseded by: DR-0004 (runtime and repo layout only; storage, API style, testing, observability still apply)

## Context

需求：三视图（树/时间轴/关系网）+ 详情 + 录入台（US-001…US-024），NFR-001 首屏 ≤3s
（100 组织规模）、NFR-003 点开事实 ≤200ms、NFR-004 字放大后布局不重叠。团队一人
（约束 A-07），R1 只有这一个消费者；R2 公开站尚未设计。数据是"组织—人—事实（关系/任职/
立场）—来源"四层结构，需要强一致和递归查询（谱系是 DAG），不需要弹性伸缩。

## Options considered

| Option (from menu) | Fits because | Does not fit because |
|---|---|---|
| **Modular monolith (default)** | 一人维护，模块边界足以防止纠缠；省掉服务间网络与双部署 | — |
| Monolith + few services | 无 GPU/长任务需求 | 多一套部署即多一份负担 |
| Microservices | — | 团队协调痛点不存在，反而引入分布式一致性问题 |
| **PostgreSQL (default)** | 递归 CTE 直接查树；事务保证事实+来源+审计一致；JSONB 存扩展属性 | 图遍历深度大时需索引调优（R1 规模小） |
| 图数据库（Neo4j） | 关系遍历自然 | 多一个运维组件、许可成本、团队不熟；R1 用不上 |
| 文档库（MongoDB） | 灵活 | 关系与时间查询要自己写连接，US-009 冲突比较更难 |
| **REST + OpenAPI (default)** | 前端唯一消费者、契约可评审、静态站好缓存 | — |
| GraphQL | 多端不同取数 | 一个客户端，收益为零 |

## Decision

模块化单体，单仓：

- `apps/api`：Node 22 + Fastify + TypeScript，REST/JSON，OpenAPI 3.1 契约先写（`docs/design/api/`）。
- `apps/web`：React 19 + Vite + TypeScript，SPA；图谱用 D3/SVG 手绘（非 Canvas），便于 PNG 导出与可访问性。
- `packages/shared`：TS 类型 + 时间精度格式化 + 校验，API 与 web 共用（US-024 的词表校验也在此）。
- 存储：PostgreSQL 16 单库，递归 CTE 查谱系；JSONB 仅用于扩展属性（DR-0003）。
- 状态管理：服务端状态用 TanStack Query，视图状态（焦点/筛选/时间窗）进 URL（见 ux.md）。
- 测试：均衡档 —— 静态检查 + 单测（vitest）+ 集成（对真库跑 API）+ OpenAPI 契约测试；端到端只覆盖 3 条 Must 流程（打开→聚焦→改一条事实）。
- 可观测性：结构化日志 + 请求 ID；指标与告警留到 R2。
- 代码组织：单仓 monorepo（apps/ + packages/），文件夹按功能（features/tree、features/timeline…）。
- 部署：**推迟到 stage 7 决定**（默认托管平台 + CI/staging/prod）；R1 在开发机本地运行。

未采用菜单默认的：无。菜单默认 (modular monolith / relational / REST / balanced tests) 全部匹配
一人团队与 NFR-001 的规模。

## Perspective review

单人项目：无第二人可审。以下立场由同一人自查，缺口记入 risks.md（R-001 单点知识）。

| Perspective | Reviewer | Verdict | Notes / conditions |
|---|---|---|---|
| Backend | UGcraftist | conditions | 事实修订链与来源删除需事务（见 DR-0003） |
| Frontend | UGcraftist | agree | D3/SVG 需在 100 组织下压测布局性能（T- 见 plan） |
| Security | UGcraftist | conditions | R1 无公开写入口；token 鉴权（security.md） |
| Operations | UGcraftist | agree | R1 本地；部署决策 stage 7 |
| Design/UX | UGcraftist | agree | 三视图共用 URL 状态，D1 方向不变 |

Responses to objections:
- 单人无法真正同行评审 → 接受为风险，R1 后若扩员，补一次外部评审（risks.md）。

## Consequences

- Good: 一个进程、一个库、一次部署；递归 CTE 满足谱系查询；契约先写让 R2 公开站可复用。
- Bad / accepted trade-offs: 一人承担前后端；Postgres 图遍历在大规模下不如专用图库 —— 规模触发时再议（勿提前分库）。
- What becomes harder to change later: 换存储或换 API 风格要动全栈；故本轮记录为 one-way。
- Follow-ups: DR-0003（数据模型）、security.md（威胁与凭据）、plan.md（任务）。

## Revisit when

超过 10 万事实或视图渲染 >2s（NFR-001 违约）时，评估物化视图/专用图查询；团队多于 3 人时重新评估服务切分。
