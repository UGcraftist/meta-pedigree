# Security
Audience: engineers, operator · Last updated: 2026-11-14 by UGcraftist
Sources: DR-0002, DR-0003, api.md, rules/security.md

R1 是单编辑器、本地优先的工具：无公开写入口、无第三方服务、无用户上传。安全设计按"泄露会怎样"
排序，而不是套模板。

## Trust boundaries

```mermaid
flowchart LR
  B[浏览器] -->|HTTPS + bearer token(编辑)| API
  V[浏览器访客] -->|只读(本地 R1)| API
  API -->|SQL 本机| DB[(PostgreSQL)]
  API -->|链接文本，不抓取| S[外部来源]
```

- 边界 1：浏览器 ↔ API。所有授权在服务端判定，前端隐藏按钮不构成控制。
- 边界 2：API ↔ DB。DB 只监听本机；连接串来自环境变量。
- 边界 3：API ↔ 外部来源。R1 只存链接文本，**不抓取、不渲染远程 HTML**，故无 SSRF/远程执行面。

## STRIDE（R1）

| 威胁 | 场景 | 评级 | 处置 |
|---|---|---|---|
| Spoofing | 伪造编辑者身份写事实 | 中 | bearer token + 审计行（actor_id）；R2 换 SSO（DR 待开） |
| Tampering | 直接改库绕过校验 | 低 | 单人机器；迁移脚本评审；审计行不可删（append-only） |
| Repudiation | 否认改过某条事实 | 中 | 修订链保留旧行 + audit_log |
| Information disclosure | 受限对象（hidden）被公开站索引 | 中 | visibility 在查询层过滤；R2 公开站只导出 public 快照 |
| DoS | 递归树查询拖垮 DB | 低 | depth ≤6、limit ≤200、语句超时 5s |
| Elevation of privilege | 访客调编辑接口 | 中 | 服务端逐路由校验 role=editor（不依赖前端） |

## Roles

| Role | Capabilities | Holder |
|---|---|---|
| visitor | 读 published 事实 | 任何人（R1 仅本机） |
| editor | 建/改/提交/发布事实与来源、改词表、看审计 | UGcraftist |
| admin | 管理 editor 账号 | UGcraftist（单一持有人 —— 见风险 R-001） |

gate 检查要求每个管理角色两名具名持有人；R1 只有一人，**记为已知例外**：R2 前补第二持有人
（或明确"单人运维"接受书）。

## Credentials

| Name | Used by | Owner | Stored where |
|---|---|---|---|
| `DATABASE_URL` | api | UGcraftist | 本机 `.env`（git 忽略），生产用平台 secret（stage 7） |
| `EDITOR_TOKEN` | api 鉴权 | UGcraftist | 同上；每 90 天轮换，泄露即吊销重发 |
| `GEMINI_API_KEY`（可选，仅设计稿） | 图像生成 | UGcraftist | 用户本机配置，不进仓库 |

## Rules

- 来源 URL 只允许 `http(s)`，存文本，点击时 `rel="noopener noreferrer"`，不嵌入 iframe。
- 所有输入按 UTF-8 文本转义；前端不用 `dangerouslySetInnerHTML`。
- 依赖锁定 + `pnpm audit` 进 CI；R1 不引入运行时远程脚本。
- 日志不写 token、不写完整 URL 查询串。

## Accepted risks

- R-001 单人持有全部凭据与知识 → 已记入 risks.md，接受直到 R2 扩员。
- 本地 R1 无 TLS（跑在 localhost）→ 不对外暴露；部署时强制 HTTPS（stage 7 检查项）。
