"""Meta Pedigree API — modular monolith (DR-0002).

One process serves the JSON API and the built SPA; PostgreSQL holds the
history (DR-0003). T-001 only provides the walking skeleton: app factory,
health endpoint and project layout.
"""

from fastapi import FastAPI

from .config import APP_VERSION

app = FastAPI(title="Meta Pedigree", version=APP_VERSION)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Liveness probe: no database, no auth, always free of secrets."""
    return {"status": "ok", "version": APP_VERSION}
