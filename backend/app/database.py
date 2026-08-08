"""
Database wiring: the SQLAlchemy engine, session factory, and declarative Base.

The connection URL comes from config.settings (MERIT_DATABASE_URL). FastAPI
request-scoped sessions live in dependencies.get_db; schema creation lives in
init_db() so it happens explicitly at app startup rather than as an import
side effect (which is what lets the test suite point at a throwaway database).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    """Create any missing tables. Import models first so they are registered."""
    from . import models  # noqa: F401  (registers mappers on Base.metadata)

    Base.metadata.create_all(bind=engine)
