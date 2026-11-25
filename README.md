# Meta Pedigree

谱系图工具：组织、人物、关系、时间与来源（见 [docs/STATE.md](docs/STATE.md)）。

## Run

数据在 **Supabase**（PostgreSQL + PostgREST + Auth），前端是静态 SPA；没有本地后端进程。

```bash
cp .env.example .env          # 填 SUPABASE_URL + service role key（种子导入/RLS 探针）
cp web/.env.local.example web/.env.local   # 或手写 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
make setup                    # 建 .venv + `npm --prefix web ci`（Node 版本见 web/.nvmrc）
cd web && npm run dev         # http://127.0.0.1:5173
```

## Schema and seed

```bash
控制台 SQL 编辑器粘贴 supabase/migrations/0001_init.sql   # 每个项目一次，存为命名查询（DR-0006）
make seed-dry                         # 校验 seed/data/*.json，不连数据库
make seed                             # 经 PostgREST 导入（service_role，可重复执行）
make probe                            # 证明 RLS：anon 被拒、service_role 可写
```

## Test

```bash
make test      # 只跑 seed 校验器 pytest（不需要数据库）
make check     # 干净 checkout 的质量门禁，无凭据：structure + pytest + eslint + tsc + vitest（= T-022 的 CI 目标）
```

从零开始：`make setup && make check`。TH 探针（`make probe` / `views-probe` / `write-probe`）需要 Supabase 凭据，故意不在 `check` 里。

## CI

`.github/workflows/ci.yml` 在 push / PR 到 `master` 时跑 job `check`：`make setup && make check`，然后
`npm --prefix web run build`。它不使用任何 `secrets.*`、不部署；TH 探针、`format:check`（T-008 遗留）、
`npm audit`（已知 vitest 2.1.9 告警）和 OpenAPI drift 检查都**故意不在** CI 里。

CI 最终取决于仓库设置：`master` 分支保护必须把名为 `check` 的 job 设为 **required status check**（仓库管理员手工开启；
开启前 T-022 不算完成，见 `changes.md`）。干净 checkout 上 `make setup && make check` 能通过，`web/.env.test`
只放非敏感占位。

## Deploy

`npx wrangler pages deploy web/dist`，或 Cloudflare Pages Git 集成；预览/生产环境变量分别指向
Supabase 的 dev/prod 项目。见 `docs/design/architecture.md` 部署一节。
