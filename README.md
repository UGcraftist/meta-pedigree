# Meta Pedigree

谱系图工具：组织、人物、关系、时间与来源（见 [docs/STATE.md](docs/STATE.md)）。

## Run

数据在 **Supabase**（PostgreSQL + PostgREST + Auth），前端是静态 SPA；没有本地后端进程。

```bash
cp .env.example .env          # 填 DATABASE_URL（Supabase → Connect → Session pooler）
cp web/.env.local.example web/.env.local   # 或手写 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
make venv                     # 建 .venv 并装 seed/requirements.txt
cd web && npm install && npm run dev      # http://127.0.0.1:5173
```

## Schema and seed

```bash
supabase db push                      # 或按文件名顺序 psql -f supabase/migrations/*.sql
make seed-dry                         # 校验 seed/data/*.json，不连数据库
make seed                             # 用 DATABASE_URL 导入（可重复执行）
```

## Test

```bash
make test      # seed 校验器 pytest（不需要数据库）
make check     # structure check + pytest（= CI 目标，T-022）
```

## Deploy

`npx wrangler pages deploy web/dist`，或 Cloudflare Pages Git 集成；预览/生产环境变量分别指向
Supabase 的 dev/prod 项目。见 `docs/design/architecture.md` 部署一节。
