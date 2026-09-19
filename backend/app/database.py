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
from .money import usd_to_cents, usd_to_micros
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
    # Per-event storage moved from cents to micros (see app/money.py's module
    # docstring) -- cents floors any sub-half-cent LLM call to zero before it
    # ever reaches a SUM(). cost_usd_cents above is left in place, orphaned,
    # same reasoning as the original cost_usd float column.
    ("usage_events", "cost_usd_micros", "INTEGER"),
    ("unmapped_identity_events", "cost_usd_micros", "INTEGER"),
    # Which source system reported the event -- added so the idempotency key
    # can be scoped per-integration (see _INDEX_BACKFILLS below); two
    # integrations numbering their own events from 1 previously collided on
    # event_id alone.
    ("usage_events", "source_system", "VARCHAR"),
    ("outcome_events", "source_system", "VARCHAR"),
    ("quality_signals", "source_system", "VARCHAR"),
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
# callers that don't supply an event_id (or, on a pre-existing row, don't
# have a source_system) keep working unconstrained.
#
# Scoped by source_system, not just identity_id -- two integrations that both
# number their own events from 1 (a billing export and a provider's admin API,
# say) previously collided on the first event_id they shared, silently
# replaying one integration's row in place of the other's with a 201 and no
# warning on either side.
_INDEX_BACKFILLS = [
    ("uq_usage_identity_source_event", "usage_events", "identity_id, source_system, event_id"),
    ("uq_outcome_identity_source_event", "outcome_events", "identity_id, source_system, event_id"),
    ("uq_quality_identity_source_event", "quality_signals", "identity_id, source_system, event_id"),
    ("uq_unmapped_org_source_event", "unmapped_identity_events", "org_id, source_system, event_id"),
]

# The three indexes above replace an earlier version scoped by identity_id
# alone (before source_system existed on these tables). CREATE UNIQUE INDEX
# IF NOT EXISTS leaves an existing index with the old column list untouched
# under the new name -- these old ones need dropping explicitly so the
# replacement actually takes effect on a pre-existing database.
_OLD_INDEXES_TO_DROP = ["uq_usage_identity_event", "uq_outcome_identity_event", "uq_quality_identity_event"]


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
    _migrate_cost_usd_to_micros()


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
        for name in _OLD_INDEXES_TO_DROP:
            conn.execute(text(f"DROP INDEX IF EXISTS {name}"))
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
    nothing at runtime since the ORM model no longer references it.

    Rounds in Python via money.usd_to_cents, not SQLite's own ROUND() --
    ROUND() rounds the column's binary-float representation directly, which
    disagrees with Decimal(str(x))'s decimal-text-based rounding on a
    measurable share of rows (an audit of this exact backfill found about 1
    row in 500 landing a cent away). Using the same function the write path
    uses is what keeps a backfilled row and a freshly-ingested row agreeing
    on the same input; row-by-row here instead of one atomic UPDATE is the
    cost of that agreement, and at this product's current data volumes it's
    a small one.
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
            rows = conn.execute(
                text(f"SELECT id, {old_column} FROM {table} WHERE {new_column} IS NULL AND {old_column} IS NOT NULL")
            ).fetchall()
            for row_id, old_value in rows:
                conn.execute(
                    text(f"UPDATE {table} SET {new_column} = :new_value WHERE id = :id"),
                    {"new_value": usd_to_cents(old_value), "id": row_id},
                )


def _migrate_cost_usd_to_micros() -> None:
    """One-time backfill for cost_usd_micros, added alongside cost_usd_cents
    once per-event storage moved from cents to micros (see app/money.py's
    module docstring for why cents floors sub-half-cent LLM calls to zero).

    Derives from the original cost_usd float column, not from cost_usd_cents
    -- cost_usd_cents already lost precision for any event under $0.005, so
    deriving from it would carry that loss forward instead of fixing it.
    cost_usd is still there, physically orphaned by _migrate_money_to_cents
    above rather than dropped, which is what makes recovering full precision
    for historical rows possible at all.
    """
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    backfills = [
        ("usage_events", "cost_usd", "cost_usd_micros"),
        ("unmapped_identity_events", "cost_usd", "cost_usd_micros"),
    ]
    with engine.begin() as conn:
        for table, old_column, new_column in backfills:
            if table not in table_names:
                continue
            columns = {c["name"] for c in inspector.get_columns(table)}
            if old_column not in columns or new_column not in columns:
                continue
            rows = conn.execute(
                text(f"SELECT id, {old_column} FROM {table} WHERE {new_column} IS NULL AND {old_column} IS NOT NULL")
            ).fetchall()
            for row_id, old_value in rows:
                conn.execute(
                    text(f"UPDATE {table} SET {new_column} = :new_value WHERE id = :id"),
                    {"new_value": usd_to_micros(old_value), "id": row_id},
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
