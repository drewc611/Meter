"""
Triggers scoring.recompute_all() for the current period, once per
Organization -- the real nightly batch job (see
.github/workflows/nightly-recompute.yml), which SSHes into the Fly machine
instead of going through the admin API. POST /admin/recompute-scores is
the HTTP twin of this, but only ever touches the calling admin's own org.

    python recompute.py
"""

from app.database import SessionLocal
from app.models import Organization
from app.periods import current_period
from app.services import scoring

if __name__ == "__main__":
    db = SessionLocal()
    start, end = current_period()
    for org in db.query(Organization).all():
        n = scoring.recompute_all(db, org.id, start, end)
        print(f"Recomputed {n} PersonScore rows for org #{org.id} ({org.name}), {start} - {end}")
