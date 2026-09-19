"""Regression tests for the one-time backfill migrations in database.py --
previously untested (grep -rn '_migrate_money' tests/ found nothing before
this file), which is how the SQLite ROUND() vs. Decimal rounding divergence
between the write path and the backfill went unnoticed."""

from sqlalchemy import text

from app import database
from app.money import usd_to_cents, usd_to_micros


def test_pre_migration_database_backfills_correctly(db):
    """Simulates a database from before cost_usd_micros/source_system
    existed: a usage_events table with only the legacy cost_usd (float) and
    cost_usd_cents (int) columns -- the shape any real pre-deploy production
    database is actually in. Running init_db() against it must:

    - recover full precision for cost_usd_micros from the original float,
      not from cost_usd_cents (which already lost precision for any
      sub-half-cent event, the exact bug this migration exists to fix); and
    - backfill cost_usd_cents using the same Decimal-based rounding the
      write path (app/money.py) uses, not SQLite's ROUND() -- 0.145 is the
      concrete case where the two disagree: ROUND(0.145 * 100) = 14
      (SQLite rounds the binary-float representation, fractionally under
      0.145), while usd_to_cents(0.145) = 15 (Decimal(str(x)) rounds the
      decimal text). A backfilled row must agree with a freshly-ingested
      row given the same input.
    """
    engine = database.engine
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE usage_events"))
        conn.execute(
            text(
                """CREATE TABLE usage_events (
                    id INTEGER PRIMARY KEY,
                    identity_id INTEGER NOT NULL,
                    tool VARCHAR NOT NULL,
                    model VARCHAR,
                    tokens_in INTEGER,
                    tokens_out INTEGER,
                    cost_usd FLOAT NOT NULL,
                    cost_usd_cents INTEGER,
                    occurred_at DATETIME NOT NULL,
                    ingested_at DATETIME,
                    event_id VARCHAR
                )"""
            )
        )
        conn.execute(
            text(
                "INSERT INTO usage_events (identity_id, tool, cost_usd, occurred_at) VALUES "
                "(999997, 'anthropic_api', 0.0003, datetime('now')), "
                "(999997, 'anthropic_api', 0.145, datetime('now'))"
            )
        )

    database.init_db()

    rows = db.execute(
        text(
            "SELECT cost_usd, cost_usd_cents, cost_usd_micros FROM usage_events WHERE identity_id = 999997 ORDER BY id"
        )
    ).all()
    assert rows[0] == (0.0003, usd_to_cents(0.0003), usd_to_micros(0.0003))
    assert rows[0] == (0.0003, 0, 300)  # sub-half-cent: cents floors to 0, micros doesn't
    assert rows[1] == (0.145, usd_to_cents(0.145), usd_to_micros(0.145))
    assert rows[1] == (0.145, 15, 145000)  # the SQLite-ROUND()-vs-Decimal divergence case


def test_migration_is_idempotent_on_a_second_run(db):
    """init_db() runs on every app startup, so re-running it against an
    already-migrated database must not error or change already-backfilled
    values -- the WHERE ... IS NULL guard in each migration is what makes
    that safe."""
    engine = database.engine
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE usage_events"))
        conn.execute(
            text(
                """CREATE TABLE usage_events (
                    id INTEGER PRIMARY KEY,
                    identity_id INTEGER NOT NULL,
                    tool VARCHAR NOT NULL,
                    cost_usd FLOAT NOT NULL,
                    occurred_at DATETIME NOT NULL
                )"""
            )
        )
        conn.execute(
            text(
                "INSERT INTO usage_events (identity_id, tool, cost_usd, occurred_at) "
                "VALUES (999996, 'anthropic_api', 0.0003, datetime('now'))"
            )
        )

    database.init_db()
    database.init_db()

    row = db.execute(text("SELECT cost_usd_cents, cost_usd_micros FROM usage_events WHERE identity_id = 999996")).one()
    assert row == (0, 300)
