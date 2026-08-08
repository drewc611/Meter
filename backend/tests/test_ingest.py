from datetime import datetime

import pytest

from app.models import OutcomeEvent, QualitySignal, UsageEvent
from app.services import ingest
from app.services.ingest import UnresolvedIdentityError


def test_resolve_identity_maps_external_id(db, person):
    p = person(name="Grace Hopper")
    resolved = ingest.resolve_identity(db, "anthropic_api", f"key_{p.id}")
    assert resolved.id == p.id


def test_unresolved_external_id_raises(db):
    with pytest.raises(UnresolvedIdentityError):
        ingest.resolve_identity(db, "anthropic_api", "key_does_not_exist")


def test_ingest_usage_attributes_to_person(db, person):
    p = person()
    ingest.ingest_usage_event(
        db,
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=12.5,
        occurred_at=datetime(2026, 8, 3),
    )
    row = db.query(UsageEvent).one()
    assert row.identity_id == p.id
    assert row.cost_usd == 12.5


def test_ingest_usage_unresolved_raises(db):
    with pytest.raises(UnresolvedIdentityError):
        ingest.ingest_usage_event(
            db,
            source_system="anthropic_api",
            external_id="nope",
            tool="anthropic_api",
            cost_usd=1.0,
        )


def test_outcome_uses_default_weight_from_constants(db, person):
    p = person()
    ingest.ingest_outcome_event(
        db,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="pr_merged",
    )
    row = db.query(OutcomeEvent).one()
    assert row.value_weight == 3.0  # constants.OUTCOME_VALUE_WEIGHTS["pr_merged"]


def test_outcome_explicit_weight_overrides_default(db, person):
    p = person()
    ingest.ingest_outcome_event(
        db,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="custom_thing",
        value_weight=9.0,
    )
    row = db.query(OutcomeEvent).one()
    assert row.value_weight == 9.0


def test_reverted_pr_auto_derives_quality_signal(db, person):
    p = person()
    ingest.ingest_outcome_event(
        db,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="pr_reverted",
        occurred_at=datetime(2026, 8, 4),
    )
    # One outcome row AND one auto-derived quality signal.
    assert db.query(OutcomeEvent).count() == 1
    signal = db.query(QualitySignal).one()
    assert signal.signal_type == "code_reverted"
    assert signal.identity_id == p.id
    assert signal.occurred_at == datetime(2026, 8, 4)


def test_non_reverted_outcome_does_not_create_quality_signal(db, person):
    p = person()
    ingest.ingest_outcome_event(
        db,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="pr_merged",
    )
    assert db.query(QualitySignal).count() == 0


def test_quality_signal_defaults_severity_from_constants(db, person):
    p = person()
    ingest.ingest_quality_signal(
        db,
        source_system="github",
        external_id=f"gh_{p.id}",
        signal_type="draft_heavily_rewritten",
    )
    row = db.query(QualitySignal).one()
    assert row.severity == 0.7  # constants.QUALITY_SIGNAL_WEIGHTS["draft_heavily_rewritten"]


def test_quality_signal_unknown_type_falls_back(db, person):
    p = person()
    ingest.ingest_quality_signal(
        db,
        source_system="github",
        external_id=f"gh_{p.id}",
        signal_type="mystery",
    )
    row = db.query(QualitySignal).one()
    assert row.severity == 0.5  # documented fallback for unknown signal types
