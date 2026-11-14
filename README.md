# Meta Pedigree

谱系图工具：组织、人物、关系、时间与来源（见 [docs/STATE.md](docs/STATE.md)）。

## Run

需要一个能联网的 Python 3.12（本机系统 Python 没有 pip；venv 用 `get-pip.py` 自举）：

```bash
make venv      # 建 .venv 并装 api/requirements.txt
make dev       # http://127.0.0.1:8000/healthz
```

数据库（PostgreSQL 16）在 T-002 接入，见 `docs/design/architecture.md`。

## Test

```bash
make test      # 后端 pytest（不含数据库集成测试）
make check     # structure check + 后端测试
```

前端（Vite + React）：

```bash
cd web && npm install && npm run dev
```

## Deploy

R1 单机部署，流程见 `docs/design/architecture.md` 的 Deployment 一节（T-014 落地）。
