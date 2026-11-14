# Decisions

One record per decision, in `0001-<title>.md` and cited as `DR-0001`. Records are never edited after acceptance, only superseded by a new record.

| Record | Title | Category | Status | Reversibility | Reviews | Superseded by |
|---|---|---|---|---|---|---|
| [DR-0001](0001-wireframes-in-ux-instead-of-figma.md) | Screens specified in ux.md until a Figma file exists | design process | accepted | easy | product owner | — |
| [DR-0002](0002-stack-and-system-shape.md) | 模块化单体 + React SPA + PostgreSQL | stack / system-shape | superseded (runtime/layout) | one-way | BE ✓ FE ✓ SEC ✓ OPS ✓ | DR-0004 |
| [DR-0004](0004-python-fastapi-backend.md) | 后端运行时：Python 3.12 + FastAPI（`api/` + `web/`） | backend-runtime / code-organization | accepted | one-way | BE ✓ SEC ✓ OPS ✓ | — |
| [DR-0003](0003-data-model-time-extensibility.md) | 事实表 + 注册表扩展 + 五档时间精度 | data model | accepted | one-way | BE ✓ SEC ✓ | — |
