PY := .venv/bin/python
WEB := web

.PHONY: setup venv test seed seed-dry probe views-probe write-probe web-dev lint typecheck web-test check web-deps

setup: venv
	@test -f $(WEB)/package-lock.json || { echo "web/package-lock.json missing"; exit 1; }
	npm --prefix $(WEB) ci --no-audit --no-fund
	@node --version

venv:
	-python3 -m venv .venv
	@.venv/bin/python -m pip --version >/dev/null 2>&1 || \
	  (python3 -c "import urllib.request; urllib.request.urlretrieve('https://bootstrap.pypa.io/get-pip.py','/tmp/mp-get-pip.py')" && .venv/bin/python /tmp/mp-get-pip.py)
	$(PY) -m pip install -r seed/requirements.txt

test:
	$(PY) -m pytest seed/tests -q

# Validate the bundle without touching a database.
seed-dry:
	$(PY) -m seed.importer --data seed/data --dry-run

# Import seed data through PostgREST: needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (root .env).
seed:
	$(PY) -m seed.importer --data seed/data

# Prove RLS through the REST API: anon is refused, service_role may write.
probe:
	node seed/rls_probe.mjs

# Check the 0002 read-model views return the tree (run after pasting the migration).
views-probe:
	node seed/views_probe.mjs

# Prove the 0006 write RPCs: anon+readonly denied, editor writes, audit + source merge.
# Needs SUPABASE_EDITOR_EMAIL/PASSWORD and SUPABASE_READONLY_EMAIL/PASSWORD in .env.
write-probe:
	node seed/write_probe.mjs

# Fail loudly instead of silently skipping the web checks when setup was never run.
web-deps:
	@test -d $(WEB)/node_modules || { echo "web/node_modules missing — run 'make setup'"; exit 1; }

lint: web-deps
	npm --prefix $(WEB) run lint

typecheck: web-deps
	npm --prefix $(WEB) run typecheck

web-test: web-deps
	npm --prefix $(WEB) run test

# Credential-free quality gate. Clean checkout: `make setup && make check`.
# TH probes (seed/views/write-probe) stay out: they need service_role and accounts.
check:
	@echo "--- structure"
	python3 .dsh/skills/project-flow/scripts/structure.py check
	$(MAKE) -s test
	$(MAKE) -s lint
	$(MAKE) -s typecheck
	$(MAKE) -s web-test
	@echo "check ok: structure + pytest + eslint + tsc + vitest"

# Vite dev server for S-01 (needs web/.env.local; login: dev editor account).
web-dev:
	cd web && npm run dev
