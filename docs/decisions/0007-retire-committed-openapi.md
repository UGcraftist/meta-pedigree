# DR-0007 退役提交的 OpenAPI 文档；契约唯一来源是 `api.md`，OpenAPI 由 PostgREST 运行时生成

Status: accepted
Date: 2026-11-15
Category: api, design-process
Reversibility: easy（需要时再从 PostgREST 导出并提交，见 Revisit triggers）
Decided by: UGcraftist（2026-11-15 明确同意）
Related: DR-0002, DR-0004, DR-0005, T-004, api.md

## Context

DR-0002 在 R1 契约里要求"OpenAPI 3.1 契约先写"，DR-0004 进一步把 `docs/design/api/openapi.yaml` 定为
"契约与类型的单一来源"、T-004 由它生成 TypeScript 类型并做契约测试。平台换成 Supabase（DR-0005）后，
API 面变成 **PostgREST 视图 + RPC**，契约随数据库对象走；T-004 已把 `api.md` 改写为 PostgREST 契约，
并在 `api.md` 写明"OpenAPI 由 PostgREST 自动生成，不提交"。

但 `docs/design/api/openapi.yaml` 仍在仓库里，且被 `README.md`、`architecture.md`、`plan.md` 的
T-004 条目引用；T-004 验收也把它列为一致性基准。结果仓库里**存在两套互相矛盾的 API 契约**：
旧文件描述 `localhost:8080/api/v1`、`GET /tree`、`POST /facts`、`bearerAuth`，与实际的 PostgREST
视图/RPC 面不一致。独立评审把它列为 T-004 的阻塞项。

## Decision

- **删除** `docs/design/api/openapi.yaml` 与 `docs/design/api/` 目录。不再提交任何 OpenAPI 文档。
- **唯一契约来源是 `docs/design/api.md`**：视图/RPC 的路径、参数、错误码、响应形状都以它为准。
- OpenAPI 文档由 PostgREST 在运行时生成（`/rest/v1` 的根路径），需要时当时导出、不入库；
  前端类型手写（`web/src/types.ts`），不再从提交的 spec 生成。
- `structure.yml` 删除 `api/: full API spec` 条目，`api.md` 的说明改为"the API contract (PostgREST)"。

## 对 DR-0002 / DR-0004 的修正

本记录**修正（不推翻）**：

- **DR-0002 `## Decision`** 中"API contract…OpenAPI 3.1 契约先写（`docs/design/api/`）"：R1 契约以
  `api.md` 为准，OpenAPI 文档不先写、不提交；该条其余内容（REST/OpenAPI 语义、模块化单体等）不变。
- **DR-0004** 中"契约仍以 `docs/design/api/openapi.yaml` 为单一来源"、"T-004 由 spec 生成类型"、
  "契约测试以该文件为基准"三处：统一改为以 `api.md` 为单一来源、类型手写、契约测试针对 PostgREST 实际响应。
  其余（Python 3.12 + FastAPI 运行时、`api/` + `web/` 布局等）已被 DR-0005 取代，不重复。

`decisions/README.md` 的索引行标注 `DR-0007`，DR-0002/DR-0004 记录本身不编辑。

## Consequences

- 删除 `openapi.yaml`；修正 `docs/design/README.md`、`architecture.md`（契约行 + "树"流程里 phantom
  的 `POST /api/v1/tree` 表述）、`plan.md` T-004 的 Design 列与验收第 1 条、`structure.yml`。
- 没有提交的 spec 之后，外部消费者（R2 或第三方）需要 OpenAPI 时从 PostgREST 导出，而不是读仓库文件。
- T-022（CI）里原本设想"spec 与实现一致性检查"的条目不再成立；契约漂移改由 `make views-probe`
  断言实际响应形状（T-008 补 vitest/探针断言）。

## Alternatives considered

1. **保留 openapi.yaml 并改成 PostgREST 的 spec**：PostgREST 的 OpenAPI 由数据库自动生成，手写一份
   维护成本高且必然漂移，且与 `api.md` 仍是双份事实。
2. **保留但标 deprecated**：T-004 的验收基准仍然模糊，评审指出"两套契约"的根因未除。
3. **从 PostgREST 导出并提交生成物**：生成物随 schema 每次迁移变化，提交它等于每次迁移改两份文件。

## Revisit triggers

- 出现仓库外的消费者需要稳定、可版本化的 OpenAPI 文件（例如生成客户端 SDK），且 PostgREST 运行时导出
  不够用；
- 前端类型需要从 spec 自动生成而不是手写；
- 发生一次可追溯的契约漂移事故。
