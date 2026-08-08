from datetime import datetime

import pytest

from app.services import scoring
from app.services.scoring import (
    normalize_value_scores,
    raw_slop_from_severities,
    raw_value_from_totals,
)

START = datetime(2026, 8, 1)
END = datetime(2026, 9, 1)


# --------------------------------------------------------------- pure math


def test_raw_value_from_totals_basic():
    assert raw_value_from_totals(spend=100.0, outcome_value=250.0) == 2.5


def test_raw_value_from_totals_zero_spend_is_zero():
    # No spend → no AI signal to attribute, regardless of outcomes.
    assert raw_value_from_totals(spend=0.0, outcome_value=99.0) == 0.0
    assert raw_value_from_totals(spend=-5.0, outcome_value=99.0) == 0.0


def test_raw_slop_from_severities_empty_is_zero():
    assert raw_slop_from_severities([]) == 0.0


def test_raw_slop_from_severities_volume_dampens():
    # One severe signal vs five: the score rises but far less than 5x, because
    # the volume factor saturates.
    one = raw_slop_from_severities([1.0])
    five = raw_slop_from_severities([1.0] * 5)
    assert five > one
    assert five < one * 5
    assert five <= 100.0


def test_raw_slop_capped_at_100():
    assert raw_slop_from_severities([1.0] * 50) == 100.0


def test_normalize_uses_median_as_baseline():
    raw = {1: 2.0, 2: 1.0, 3: 0.5}  # median is 1.0
    norm = normalize_value_scores(raw)
    assert norm[2] == 1.0
    assert norm[1] == 2.0
    assert norm[3] == 0.5


def test_normalize_handles_all_zero_period():
    # Pathological all-zero period must not divide by zero.
    norm = normalize_value_scores({1: 0.0, 2: 0.0})
    assert all(v == 0.0 for v in norm.values())


# ----------------------------------------------------- recompute_all (DB)


def _seed_person_with_activity(db, ingest, ident, *, spend, merges, reverts, signals):
    for _ in range(3):
        ingest.usage(
            source_system="anthropic_api",
            external_id=f"key_{ident.id}",
            tool="anthropic_api",
            cost_usd=spend / 3,
            occurred_at=datetime(2026, 8, 10),
        )
    for _ in range(merges):
        ingest.outcome(
            source_system="github",
            external_id=f"gh_{ident.id}",
            source="github",
            outcome_type="pr_merged",
            occurred_at=datetime(2026, 8, 11),
        )
    for _ in range(reverts):
        ingest.outcome(
            source_system="github",
            external_id=f"gh_{ident.id}",
            source="github",
            outcome_type="pr_reverted",
            occurred_at=datetime(2026, 8, 11),
        )
    for _ in range(signals):
        ingest.quality(
            source_system="github",
            external_id=f"gh_{ident.id}",
            signal_type="regeneration_loop",
            occurred_at=datetime(2026, 8, 12),
        )


def test_recompute_writes_one_score_per_active_person(db, person, ingest_helpers):
    star = person(name="Star Dev")
    _seed_person_with_activity(db, ingest_helpers, star, spend=300, merges=10, reverts=0, signals=0)

    n = scoring.recompute_all(db, START, END)
    assert n == 1

    from app.models import PersonScore

    scores = db.query(PersonScore).all()
    assert len(scores) == 1
    assert scores[0].identity_id == star.id
    assert scores[0].spend_usd == pytest.approx(300.0)
    assert scores[0].confidence == "tier1"  # no quality signals → tier1 only


def test_recompute_skips_people_with_no_spend(db, person, ingest_helpers):
    active = person(name="Active")
    person(name="Idle")  # created, but never spends
    _seed_person_with_activity(db, ingest_helpers, active, spend=100, merges=3, reverts=0, signals=0)

    n = scoring.recompute_all(db, START, END)
    assert n == 1  # only the active person is scored


def test_recompute_is_idempotent(db, person, ingest_helpers):
    p = person(name="Repeat")
    _seed_person_with_activity(db, ingest_helpers, p, spend=200, merges=5, reverts=0, signals=2)

    scoring.recompute_all(db, START, END)
    scoring.recompute_all(db, START, END)  # second run must upsert, not duplicate

    from app.models import PersonScore

    assert db.query(PersonScore).count() == 1


def test_recompute_flags_tier2_when_quality_signals_present(db, person, ingest_helpers):
    p = person(name="Reworker")
    _seed_person_with_activity(db, ingest_helpers, p, spend=200, merges=2, reverts=0, signals=4)

    scoring.recompute_all(db, START, END)
    from app.models import PersonScore

    score = db.query(PersonScore).one()
    assert score.confidence == "tier1+2"
    assert score.slop_risk > 0


def test_bulk_and_single_person_paths_agree(db, person, ingest_helpers):
    """recompute_all's bulk aggregation must match the single-person helpers."""
    p = person(name="Cross Check")
    _seed_person_with_activity(db, ingest_helpers, p, spend=180, merges=6, reverts=1, signals=3)

    single_spend = scoring._sum_spend(db, p.id, START, END)
    single_value = scoring.raw_value_score(db, p.id, START, END)
    single_slop = scoring.raw_slop_risk(db, p.id, START, END)

    bulk_spend = scoring._spend_by_identity(db, START, END)[p.id]
    bulk_value = raw_value_from_totals(bulk_spend, scoring._outcome_value_by_identity(db, START, END)[p.id])
    bulk_slop = raw_slop_from_severities(scoring._severities_by_identity(db, START, END)[p.id])

    assert single_spend == pytest.approx(bulk_spend)
    assert single_value == pytest.approx(bulk_value)
    assert single_slop == pytest.approx(bulk_slop)


def test_calibrate_weights_is_stubbed(db):
    with pytest.raises(NotImplementedError):
        scoring.calibrate_weights(db)
