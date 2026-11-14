from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz_reports_ok_and_version() -> None:
    """T-001 acceptance: the process answers a liveness probe without a DB."""
    response = client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    # deliberate pin: the version string is part of the health contract
    assert body["version"] == "0.1.0"
