"""Tests for the app factory itself (app/main.py), not the routers it wires
up -- these build their own TestClient via create_app() rather than the
shared `app` singleton, since MERIT_DISABLE_API_DOCS is read inside
create_app() and the module-level `app` is already built by import time."""

import pytest
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


def test_missing_jwt_secret_only_warns_outside_production(monkeypatch):
    monkeypatch.delenv("MERIT_JWT_SECRET", raising=False)
    monkeypatch.delenv("FLY_APP_NAME", raising=False)
    monkeypatch.delenv("MERIT_ENV", raising=False)
    create_app()  # must not raise


def test_weak_jwt_secret_only_warns_outside_production(monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "too-short")
    monkeypatch.delenv("FLY_APP_NAME", raising=False)
    monkeypatch.delenv("MERIT_ENV", raising=False)
    create_app()  # must not raise


def test_missing_jwt_secret_refuses_to_boot_on_fly(monkeypatch):
    monkeypatch.delenv("MERIT_JWT_SECRET", raising=False)
    monkeypatch.setenv("FLY_APP_NAME", "meter")
    with pytest.raises(RuntimeError, match="MERIT_JWT_SECRET"):
        create_app()


def test_weak_jwt_secret_refuses_to_boot_on_fly(monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "too-short")
    monkeypatch.setenv("FLY_APP_NAME", "meter")
    with pytest.raises(RuntimeError, match="MERIT_JWT_SECRET"):
        create_app()


def test_weak_jwt_secret_refuses_to_boot_with_explicit_merit_env(monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "too-short")
    monkeypatch.delenv("FLY_APP_NAME", raising=False)
    monkeypatch.setenv("MERIT_ENV", "production")
    with pytest.raises(RuntimeError, match="MERIT_JWT_SECRET"):
        create_app()


def test_strong_jwt_secret_boots_fine_on_fly(monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "x" * 48)
    monkeypatch.setenv("MERIT_CORS_ORIGINS", "https://usemeritai.com")
    monkeypatch.setenv("FLY_APP_NAME", "meter")
    create_app()  # must not raise


def test_wide_open_cors_refuses_to_boot_in_production(monkeypatch):
    """config.py defaults MERIT_CORS_ORIGINS to '*' for the local demo. On a
    real deployment that means any page on the internet can call this API with
    a logged-in visitor's browser, and nothing made setting it mandatory."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "x" * 48)
    monkeypatch.setenv("FLY_APP_NAME", "meter")
    for value in ("*", ""):
        monkeypatch.setenv("MERIT_CORS_ORIGINS", value)
        with pytest.raises(RuntimeError, match="MERIT_CORS_ORIGINS"):
            create_app()
    monkeypatch.delenv("MERIT_CORS_ORIGINS", raising=False)
    with pytest.raises(RuntimeError, match="MERIT_CORS_ORIGINS"):
        create_app()


def test_wide_open_cors_is_fine_outside_production(monkeypatch):
    """The local demo opens the dashboard straight off disk, so the wide-open
    default has to keep working on a laptop."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "x" * 48)
    monkeypatch.delenv("MERIT_CORS_ORIGINS", raising=False)
    monkeypatch.delenv("FLY_APP_NAME", raising=False)
    monkeypatch.delenv("MERIT_ENV", raising=False)
    create_app()  # must not raise
