PY := .venv/bin/python

.PHONY: venv test seed seed-dry check

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

# Import seed data: needs DATABASE_URL (Supabase → Connect → Session pooler).
seed:
	$(PY) -m seed.importer --data seed/data

check:
	python3 .dsh/skills/project-flow/scripts/structure.py check && $(MAKE) test
