#!/usr/bin/env sh
# Container entrypoint: seed the database on first boot (empty volume), then
# start the API. Re-runs of the container against an already-seeded volume
# skip straight to uvicorn — seed.py drops and rebuilds all tables, so it
# must never run against data you want to keep.
set -e

DB_FILE="${MERIT_DB_FILE:-/data/merit.db}"

if [ ! -f "$DB_FILE" ]; then
  echo "entrypoint: no database at $DB_FILE — seeding sample data..."
  python seed.py
else
  echo "entrypoint: found existing database at $DB_FILE — skipping seed."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
