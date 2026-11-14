# DR-0005 数据与 API 走 Supabase，前端部署走 Cloudflare Pages；R1 不设应用服务器
Status: accepted
Date: 2026-11-14
Deciders: UGcraftist
Related: FR-001…FR-026, TH-01…TH-08, DR-0002, DR-0003, DR-0004

## Context
2026-11-14 决策：**后端用 Supabase，部署直接用 Cloudflare**。
同时的环境事实：本机没有 PostgreSQL、没有 Docker、没有 sudo；项目只有一名开发者和一名
编辑者；R1 是内网预览，R2 才公开。原方案（DR-0002/DR-0004）要自己养一个 API 进程和一个
PostgreSQL 实例，在没有 Docker 的机器上连本地开发都起不来——这是本次变更的直接原因。

## Decision
- **前端**：React 19 + Vite + TS 的静态 SPA，部署到 **Cloudflare Pages**（每个分支有预览 URL）。
- **后端/数据**：一个 **Supabase 项目** = PostgreSQL 16 + PostgREST + Auth + RLS。**R1 不写
  FastAPI 应用服务器**；`api/` 进程取消，业务校验下沉到 SQL 函数/触发器，展示逻辑留在客户端。
- **API 面**：读 = PostgREST 视图（`tree_nodes`、`tree_edges`、`timeline_events`、`org_detail`、
  `facts_pending`、`sources_for_entity`、`search_orgs`）；写 = RPC 函数（`submit_fact`、
  `upsert_stance`、`merge_source`，`SECURITY DEFINER` 且检查 JWT 角色）+ 受 RLS 约束的普通 CRUD。
- **鉴权**：Supabase Auth（邮箱+密码），R1 只邀请**一名编辑者**；角色放
  `app_metadata.role = 'editor'`。R1 关闭 anon 数据访问（站点必须登录）；R2 再为
  `published + visible` 事实打开 anon 只读。
- **种子/迁移**：`supabase/migrations/*.sql`（纯 SQL，可移植）；种子导入仍用 Python（uv），
  连 `DATABASE_URL`；service_role key 只在本机 `.env`，不进仓库。
- **测试**：pytest 只保留种子校验；vitest 承担布局与交互逻辑；SQL 层用 `db/verify.sql` 对项目跑。
- **部署**：`npx wrangler pages deploy web/dist`，或 Cloudflare Pages 的 Git 集成；
  环境变量 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（anon key 公开安全，RLS 兜底）。
- **CI**：Pages 的 Git 集成需要一个远程仓库；T-022 仍以"仓库无 git remote"阻塞。

## Consequences
- 加分：零运维、免费额度够 R1、每分支预览 URL、Auth 天然支持 R2 的 OAuth/SSO 迁移。
- 代价：**供应商锁定**（Supabase/Cloudflare）；免费层项目空闲约一周会被暂停（R2 前要规划保活）；
  业务逻辑写进 SQL 后调试与版本管理更难；**RLS 的安全权重从"可选"变成"必须"**。
- 本机无 Docker ⇒ 本地开发默认连 Supabase 云项目（dev 项目），或由使用者装 Docker 后
  `supabase start`。
- 撤销路径：迁移是纯 SQL，若以后需要自建服务，可用 DR-0006 把 FastAPI 服务重新引入，
  数据层不重写。

## Alternatives considered
- **本机装 PostgreSQL**：需要 sudo，且部署端仍需自己养库。被否。
- **SQLite 本地 + PostgreSQL 线上**：方言分叉（JSONB/数组/CTE），被否。
- **自己写 Node/TS API 部署到 Workers**：校验逻辑要在 TS 里重写一份，违背 DR-0003 的单一来源。被否。
