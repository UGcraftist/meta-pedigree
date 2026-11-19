PY := .venv/bin/python

.PHONY: venv test seed seed-dry probe views-probe write-probe web-dev check

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

check:
	python3 .dsh/skills/project-flow/scripts/structure.py check && $(MAKE) test

# Vite dev server for S-01 (needs web/.env.local; login: dev editor account).
web-dev:
	cd web && npm run dev
