"""Tests for the app factory itself (app/main.py), not the routers it wires
up -- these build their own TestClient via create_app() rather than the
shared `app` singleton, since MERIT_DISABLE_API_DOCS is read inside
create_app() and the module-level `app` is already built by import time."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_api_docs_enabled_by_default(monkeypatch):
    monkeypatch.delenv("MERIT_DISABLE_API_DOCS", raising=False)
    client = TestClient(create_app())
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200


def test_api_docs_disabled_when_flag_set(monkeypatch):
    monkeypatch.setenv("MERIT_DISABLE_API_DOCS", "true")
    client = TestClient(create_app())
    assert client.get("/openapi.json").status_code == 404
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    # The routes underneath still work -- only the schema/UI is hidden.
    assert client.get("/healthz").status_code == 200
