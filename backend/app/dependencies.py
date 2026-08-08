"""FastAPI dependencies. Kept separate from database.py so the wiring
(request-scoped sessions) is decoupled from the engine/session factory."""

from collections.abc import Iterator

from sqlalchemy.orm import Session

from .database import SessionLocal


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
