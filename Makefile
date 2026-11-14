PY := .venv/bin/python

.PHONY: venv test dev check

venv:
	python3 -m venv .venv && .venv/bin/python /tmp/get-pip.py && $(PY) -m pip install -r api/requirements.txt

test:
	cd api && ../$(PY) -m pytest -q

dev:
	cd api && ../$(PY) -m uvicorn app.main:app --reload --port 8000

check:
	python3 .dsh/skills/project-flow/scripts/structure.py check && $(MAKE) test
