"""
Triggers scoring.recompute_all() for the current period -- the same thing
POST /admin/recompute-scores does over HTTP, but callable directly for a
scheduled job that SSHes into the Fly machine instead of going through the
admin API (see .github/workflows/nightly-recompute.yml).

    python recompute.py
"""

from app.database import SessionLocal
from app.periods import current_period
from app.services import scoring

if __name__ == "__main__":
    db = SessionLocal()
    start, end = current_period()
    n = scoring.recompute_all(db, start, end)
    print(f"Recomputed {n} PersonScore rows for {start} - {end}")
