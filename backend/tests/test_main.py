"""Tests for the app factory itself (app/main.py), not the routers it wires
up -- these build their own TestClient via create_app() rather than the
shared `app` singleton, since MERIT_DISABLE_API_DOCS is read inside
create_app() and the module-level `app` is already built by import time."""

import secrets

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


def _not_production(monkeypatch):
    monkeypatch.delenv("FLY_APP_NAME", raising=False)
    monkeypatch.delenv("MERIT_ENV", raising=False)


def test_missing_jwt_secret_refuses_to_boot_without_the_open_dev_opt_in(monkeypatch):
    monkeypatch.delenv("MERIT_JWT_SECRET", raising=False)
    monkeypatch.delenv("MERIT_ALLOW_OPEN_DEV", raising=False)
    _not_production(monkeypatch)
    with pytest.raises(RuntimeError, match="MERIT_ALLOW_OPEN_DEV"):
        create_app()


def test_missing_jwt_secret_boots_outside_production_with_the_open_dev_opt_in(monkeypatch):
    monkeypatch.delenv("MERIT_JWT_SECRET", raising=False)
    monkeypatch.setenv("MERIT_ALLOW_OPEN_DEV", "1")
    _not_production(monkeypatch)
    create_app()  # must not raise


def test_open_dev_opt_in_is_ignored_in_production(monkeypatch):
    monkeypatch.delenv("MERIT_JWT_SECRET", raising=False)
    monkeypatch.setenv("MERIT_ALLOW_OPEN_DEV", "1")
    monkeypatch.setenv("FLY_APP_NAME", "meter")
    with pytest.raises(RuntimeError, match="MERIT_JWT_SECRET"):
        create_app()


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


def test_unset_or_blank_cors_origins_refuses_to_boot_in_production(monkeypatch):
    """Production has to name its frontend origin(s); the local dev default
    would otherwise stand in silently and break the real frontend."""
    monkeypatch.setenv("MERIT_JWT_SECRET", secrets.token_urlsafe(48))
    monkeypatch.setenv("FLY_APP_NAME", "meter")
    monkeypatch.setenv("MERIT_CORS_ORIGINS", "  ")
    with pytest.raises(RuntimeError, match="MERIT_CORS_ORIGINS"):
        create_app()
    monkeypatch.delenv("MERIT_CORS_ORIGINS", raising=False)
    with pytest.raises(RuntimeError, match="MERIT_CORS_ORIGINS"):
        create_app()


def test_wildcard_cors_refuses_to_boot_everywhere(monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", secrets.token_urlsafe(48))
    monkeypatch.setenv("MERIT_CORS_ORIGINS", "https://usemeritai.com, *")
    for production in (True, False):
        if production:
            monkeypatch.setenv("FLY_APP_NAME", "meter")
        else:
            _not_production(monkeypatch)
        with pytest.raises(RuntimeError, match="contains '\\*'"):
            create_app()


def test_unset_cors_origins_default_to_the_local_dev_origins(monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", secrets.token_urlsafe(48))
    monkeypatch.delenv("MERIT_CORS_ORIGINS", raising=False)
    _not_production(monkeypatch)
    client = TestClient(create_app())
    for origin, allowed in (
        ("http://localhost:8080", True),
        ("http://localhost:5173", True),
        ("https://evil.example", False),
    ):
        r = client.get("/healthz", headers={"Origin": origin})
        assert (r.headers.get("access-control-allow-origin") == origin) is allowed, origin
    assert client.get("/healthz", headers={"Origin": "null"}).headers.get("access-control-allow-origin") is None
