PY := .venv/bin/python

.PHONY: venv test dev check

venv:
	python3 -m venv .venv
	@.venv/bin/python -m pip --version >/dev/null 2>&1 || \
	  (python3 -c "import urllib.request; urllib.request.urlretrieve('https://bootstrap.pypa.io/get-pip.py','/tmp/mp-get-pip.py')" && .venv/bin/python /tmp/mp-get-pip.py)
	$(PY) -m pip install -r api/requirements.txt

test:
	cd api && ../$(PY) -m pytest -q

dev:
	cd api && ../$(PY) -m uvicorn app.main:app --reload --port 8000

check:
	python3 .dsh/skills/project-flow/scripts/structure.py check && $(MAKE) test
