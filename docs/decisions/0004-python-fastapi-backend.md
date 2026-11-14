# DR-0004: 后端运行时改为 Python 3.12 + FastAPI（替代 DR-0002 的 Node/Fastify 段）

- Status: accepted
- Date: 2026-11-14
- Category: backend-runtime, code-organization, testing
- Reversibility: one-way (runtime and repo layout)
- Decided by: UGcraftist (approved as "全默认" stack bundle; superseded runtime after DR-0002 was applied inconsistently — see Context)
- Supersedes: DR-0002 §Decision runtime rows (Node 22 + Fastify + TS, `apps/api`, `packages/shared`)

## Context

DR-0002 的栈决定写成 Node 22 + Fastify + TS + `apps/api` monorepo，但同一份 DR 接受的其他决定
（PostgreSQL 递归 CTE、REST/OpenAPI、均衡测试、D1 设计）与运行时无关。T-001 实现时按 Python
工具链落地（本机 Python 3.12 已就绪，`api/` + `web/`），与 DR-0002 文本不一致——这是执行错误，
不是有意偏离。独立评审（T-001 round 1）指出后，按变更控制记录本条替换。

数据侧是决定性理由：seed 采集/校验（T-003）、政党 fixture（T-017）、发布校验与迁移脚本都在
Python 生态里写一次；若后端用 TS，要么复制一套校验逻辑（违反 DR-0003 的单一来源原则），要么
让 Python 做重复的「第二真源」。R1 规模（100 组织、≤1500 关系）不需要 Node 的并发模型。

## Decision

- **后端**：Python 3.12 + FastAPI 0.163 + uvicorn；REST/JSON；契约仍以 `docs/design/api/openapi.yaml` 为单一来源。
- **仓库布局**：`api/`（FastAPI 应用与测试）、`web/`（React 19 + Vite + TS SPA）、`db/migrations/`、`seed/`；不再有 `apps/` 与 `packages/shared`。
- **共享类型**：以 OpenAPI 契约为真源；`web` 在 T-004 由 `openapi.yaml` 生成类型（`openapi-typescript`），不手写第二份。
- **测试**：后端 `pytest`（pytest.ini 在 `api/`），前端保持 vitest；契约测试对照 `openapi.yaml`。
- **可观测性、部署、前端栈、存储**：与 DR-0002 一致，不重新讨论。

## Perspective review

单人项目，由评审 subagent 提出阻塞项后转个人裁决；缺口记入 risks.md（R-002 无双人评审）。

| Perspective | Reviewer | Verdict | Notes / conditions |
|---|---|---|---|
| Backend | UGcraftist | agree | FastAPI 同步栈足够 R1；发布校验用 Pydantic 与 seed 校验共用一套字段规则 |
| Security | UGcraftist | agree | 鉴权中间件与 DR-0002 的 token 方案等价；凭据登记见 security.md |
| Operations | UGcraftist | agree | 一个 uvicorn 进程 → 反向代理；部署决策仍留 stage 7 |

## Consequences

- Good: 采集、校验、API 同一语言；迁移与 fixture 脚本不用跨栈复制；单人维护成本更低。
- Bad / accepted trade-offs: 放弃 TS 全栈类型连通；靠 OpenAPI 生成类型弥补（T-004）。
- What becomes harder to change later: 换回 Node 要重写 API 与中间件；故记为 one-way。
- Follow-ups: 更新 architecture.md 容器图（本文同批）；T-002 起路径用 `api/`、`db/`、`seed/`。

## Revisit when

R2 公开站需要 BFF 或 SSR 时，或在同一进程里出现长时间计算任务（届时先拆 worker 而非换语言）。
