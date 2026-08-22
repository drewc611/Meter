"""
Database wiring: the SQLAlchemy engine, session factory, and declarative Base.

The connection URL comes from config.settings (MERIT_DATABASE_URL). FastAPI
request-scoped sessions live in dependencies.get_db; schema creation lives in
init_db() so it happens explicitly at app startup rather than as an import
side effect (which is what lets the test suite point at a throwaway database).
"""

import os
import secrets

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings
from .time_utils import utcnow

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# No migration framework -- create_all only creates missing tables, not
# columns added to an existing one. Each entry here gets a plain, idempotent
# ALTER TABLE instead.
_COLUMN_BACKFILLS = [
    ("dashboard_users", "is_admin", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("waitlist_signups", "source", "VARCHAR NOT NULL DEFAULT 'coming-soon'"),
]


def init_db() -> None:
    """Create any missing tables, then backfill any columns added to
    existing tables since they first shipped. Import models first so they
    are registered."""
    from . import models  # noqa: F401  (registers mappers on Base.metadata)

    Base.metadata.create_all(bind=engine)
    _backfill_columns()
    _migrate_to_multi_tenant()


def _backfill_columns() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, column, ddl in _COLUMN_BACKFILLS:
            if table not in table_names:
                continue  # brand-new DB, create_all already has this column
            existing = {c["name"] for c in inspector.get_columns(table)}
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def _migrate_to_multi_tenant() -> None:
    """One-time schema migration for a database created before multi-tenancy
    existed: org-scopes every table that predates the Organization model.

    Not a plain _COLUMN_BACKFILLS entry because it also changes unique
    constraints (teams.name, identities.email, identity_mappings' source+
    external_id all go from globally unique to unique-per-org), and SQLite
    has no ALTER TABLE ... DROP CONSTRAINT -- the only way to change one is
    to rebuild the table (create the new shape, copy rows across, drop the
    old table, rename the new one into place).

    SQLite only, matching what this app actually runs in production (see
    config.py) -- a Postgres deployment would apply the equivalent native
    ALTER TABLE ADD COLUMN / ADD CONSTRAINT statements by hand instead.
    """
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "teams" not in table_names:
        return  # brand-new database; create_all already produced the final schema
    if "org_id" in {c["name"] for c in inspector.get_columns("teams")}:
        return  # already migrated
    if engine.dialect.name != "sqlite":
        raise NotImplementedError(
            "Pre-multi-tenant schema detected on a non-SQLite database -- apply the "
            "equivalent ALTER TABLE ADD COLUMN / ADD CONSTRAINT statements by hand."
        )

    with engine.begin() as conn:
        org_id = _ensure_default_organization(conn)
        _rebuild_table(
            conn,
            "teams",
            """CREATE TABLE teams_new (
                id INTEGER PRIMARY KEY,
                org_id INTEGER NOT NULL,
                name VARCHAR NOT NULL,
                UNIQUE (org_id, name)
            )""",
            "id, org_id, name",
            "id, :org_id, name",
            org_id,
        )
        _rebuild_table(
            conn,
            "identities",
            """CREATE TABLE identities_new (
                id INTEGER PRIMARY KEY,
                org_id INTEGER NOT NULL,
                full_name VARCHAR NOT NULL,
                email VARCHAR NOT NULL,
                role VARCHAR NOT NULL,
                team_id INTEGER NOT NULL,
                tier VARCHAR,
                created_at DATETIME,
                UNIQUE (org_id, email)
            )""",
            "id, org_id, full_name, email, role, team_id, tier, created_at",
            "id, :org_id, full_name, email, role, team_id, tier, created_at",
            org_id,
        )
        _rebuild_table(
            conn,
            "identity_mappings",
            """CREATE TABLE identity_mappings_new (
                id INTEGER PRIMARY KEY,
                org_id INTEGER NOT NULL,
                identity_id INTEGER NOT NULL,
                source_system VARCHAR NOT NULL,
                external_id VARCHAR NOT NULL,
                UNIQUE (org_id, source_system, external_id)
            )""",
            "id, org_id, identity_id, source_system, external_id",
            "id, :org_id, identity_id, source_system, external_id",
            org_id,
        )
        for table in ("dashboard_users", "person_scores"):
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN org_id INTEGER"))
            conn.execute(text(f"UPDATE {table} SET org_id = :org_id WHERE org_id IS NULL"), {"org_id": org_id})


def _ensure_default_organization(conn) -> int:
    """The one Organization every pre-existing row gets backfilled onto.
    Reuses MERIT_API_KEY as its ingest_token if set, so an existing
    production integration keeps authenticating with the same value it
    always has -- see dependencies.require_api_key."""
    row = conn.execute(text("SELECT id FROM organizations ORDER BY id LIMIT 1")).first()
    if row:
        return row[0]
    token = os.environ.get("MERIT_API_KEY") or secrets.token_urlsafe(32)
    result = conn.execute(
        text("INSERT INTO organizations (name, plan, ingest_token, created_at) VALUES (:name, :plan, :token, :now)"),
        {"name": "Default Organization", "plan": "company", "token": token, "now": utcnow()},
    )
    return result.lastrowid


def _rebuild_table(conn, table: str, create_sql: str, dest_columns: str, select_columns: str, org_id: int) -> None:
    conn.execute(text(create_sql))
    conn.execute(
        text(f"INSERT INTO {table}_new ({dest_columns}) SELECT {select_columns} FROM {table}"), {"org_id": org_id}
    )
    conn.execute(text(f"DROP TABLE {table}"))
    conn.execute(text(f"ALTER TABLE {table}_new RENAME TO {table}"))
