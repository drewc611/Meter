"""
Database wiring: the SQLAlchemy engine, session factory, and declarative Base.

The connection URL comes from config.settings (MERIT_DATABASE_URL). FastAPI
request-scoped sessions live in dependencies.get_db; schema creation lives in
init_db() so it happens explicitly at app startup rather than as an import
side effect (which is what lets the test suite point at a throwaway database).
"""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# No migration framework -- create_all only creates missing tables, not
# columns added to an existing one. Each entry here gets a plain, idempotent
# ALTER TABLE instead.
_COLUMN_BACKFILLS = [
    ("dashboard_users", "is_admin", "BOOLEAN NOT NULL DEFAULT FALSE"),
]


def init_db() -> None:
    """Create any missing tables, then backfill any columns added to
    existing tables since they first shipped. Import models first so they
    are registered."""
    from . import models  # noqa: F401  (registers mappers on Base.metadata)

    Base.metadata.create_all(bind=engine)
    _backfill_columns()


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
