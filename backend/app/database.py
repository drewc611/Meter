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
    ("waitlist_signups", "name", "VARCHAR"),
    ("waitlist_signups", "note", "VARCHAR"),
    ("usage_events", "event_id", "VARCHAR"),
    ("outcome_events", "event_id", "VARCHAR"),
    ("quality_signals", "event_id", "VARCHAR"),
    ("unmapped_identity_events", "event_id", "VARCHAR"),
    # Integer-cents columns replacing the old float-dollar cost_usd/spend_usd
    # -- see app/money.py and _migrate_money_to_cents() below. Added nullable
    # (a pre-existing table can't gain a NOT NULL column with no default via
    # a plain ALTER TABLE ADD COLUMN); every row gets backfilled immediately
    # after, and every write path from here on always supplies a value.
    ("usage_events", "cost_usd_cents", "INTEGER"),
    ("unmapped_identity_events", "cost_usd_cents", "INTEGER"),
    ("person_scores", "spend_usd_cents", "INTEGER"),
]

# Ingestion idempotency: a caller-supplied event_id is optional, but when
# given, a retry (the normal failure mode for a webhook or billing-proxy
# call) must resolve to the same row instead of double-counting spend or
# inflating the shadow-AI cost figure -- see services/ingest.py. Enforced
# here as a plain unique index rather than a __table_args__ constraint on
# the model, so the same statement applies identically to a fresh database
# (where create_all already added the column) and an existing one (where
# _backfill_columns just added it) -- no dialect branching needed, since
# both SQLite and Postgres support CREATE UNIQUE INDEX IF NOT EXISTS and
# both exclude NULL from uniqueness checks by default, which is what lets
# callers that don't supply an event_id keep working unconstrained.
_INDEX_BACKFILLS = [
    ("uq_usage_identity_event", "usage_events", "identity_id, event_id"),
    ("uq_outcome_identity_event", "outcome_events", "identity_id, event_id"),
    ("uq_quality_identity_event", "quality_signals", "identity_id, event_id"),
    ("uq_unmapped_org_source_event", "unmapped_identity_events", "org_id, source_system, event_id"),
]


def init_db() -> None:
    """Create any missing tables, then backfill any columns/indexes added to
    existing tables since they first shipped. Import models first so they
    are registered."""
    from . import models  # noqa: F401  (registers mappers on Base.metadata)

    Base.metadata.create_all(bind=engine)
    _backfill_columns()
    _backfill_indexes()
    _migrate_to_multi_tenant()
    _migrate_money_to_cents()


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


def _backfill_indexes() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    with engine.begin() as conn:
        for name, table, columns in _INDEX_BACKFILLS:
            if table not in table_names:
                continue  # brand-new DB with no tables at all yet -- shouldn't happen post-create_all, but cheap to guard
            conn.execute(text(f"CREATE UNIQUE INDEX IF NOT EXISTS {name} ON {table} ({columns})"))


def _migrate_money_to_cents() -> None:
    """One-time backfill for a database that still has rows written before
    cost_usd/spend_usd moved from float dollars to integer cents (see
    app/money.py). The old float columns are left in place, physically
    orphaned -- SQLite has no cheap way to drop them portably across the
    SQLite versions this might run against, and an unused column costs
    nothing at runtime since the ORM model no longer references it. Uses
    SQLite's own ROUND() rather than doing the conversion in Python so the
    whole backfill is one atomic UPDATE per table.
    """
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    backfills = [
        ("usage_events", "cost_usd", "cost_usd_cents"),
        ("unmapped_identity_events", "cost_usd", "cost_usd_cents"),
        ("person_scores", "spend_usd", "spend_usd_cents"),
    ]
    with engine.begin() as conn:
        for table, old_column, new_column in backfills:
            if table not in table_names:
                continue
            columns = {c["name"] for c in inspector.get_columns(table)}
            if old_column not in columns or new_column not in columns:
                continue  # brand-new DB: create_all only ever produced the cents column
            conn.execute(
                text(
                    f"UPDATE {table} SET {new_column} = CAST(ROUND({old_column} * 100) AS INTEGER) "
                    f"WHERE {new_column} IS NULL AND {old_column} IS NOT NULL"
                )
            )


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
