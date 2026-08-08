"""
Test fixtures. Points the app at a throwaway SQLite file (set before any app
module is imported, so the engine binds to it), recreates the schema fresh for
every test, and exposes a session, a TestClient, and a small seeded dataset.
"""

import os
import tempfile

# Must be set before importing anything under `app` — the engine binds to this
# URL at import time.
_TMPDIR = tempfile.mkdtemp(prefix="meter-tests-")
os.environ["METER_DATABASE_URL"] = f"sqlite:///{_TMPDIR}/test_meter.db"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import ingest  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_schema():
    """A clean database for every test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def person(db):
    """Factory: create an Identity on a team with a usage + github mapping."""

    def _make(name="Ada Lovelace", team="Engineering", role="Engineer", tier="Standard"):
        team_row = db.query(models.Team).filter_by(name=team).one_or_none()
        if team_row is None:
            team_row = models.Team(name=team)
            db.add(team_row)
            db.commit()
        ident = models.Identity(
            full_name=name,
            email=f"{name.lower().replace(' ', '.')}@example.com",
            role=role,
            team_id=team_row.id,
            tier=tier,
        )
        db.add(ident)
        db.commit()
        db.refresh(ident)
        db.add(
            models.IdentityMapping(identity_id=ident.id, source_system="anthropic_api", external_id=f"key_{ident.id}")
        )
        db.add(models.IdentityMapping(identity_id=ident.id, source_system="github", external_id=f"gh_{ident.id}"))
        db.commit()
        return ident

    return _make


@pytest.fixture
def ingest_helpers(db):
    """Bound ingest functions so tests don't repeat `db` everywhere."""

    class _H:
        usage = staticmethod(lambda **kw: ingest.ingest_usage_event(db, **kw))
        outcome = staticmethod(lambda **kw: ingest.ingest_outcome_event(db, **kw))
        quality = staticmethod(lambda **kw: ingest.ingest_quality_signal(db, **kw))

    return _H()
