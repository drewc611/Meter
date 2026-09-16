from datetime import datetime

import pytest

from app.models import OutcomeEvent, QualitySignal, UnmappedIdentityEvent, UsageEvent
from app.services import ingest
from app.services.ingest import UnresolvedIdentityError


def test_resolve_identity_maps_external_id(db, org, person):
    p = person(name="Grace Hopper")
    resolved = ingest.resolve_identity(db, org.id, "anthropic_api", f"key_{p.id}", ingest_path="usage")
    assert resolved.id == p.id


def test_unresolved_external_id_raises(db, org):
    with pytest.raises(UnresolvedIdentityError):
        ingest.resolve_identity(db, org.id, "anthropic_api", "key_does_not_exist", ingest_path="usage")


def test_unresolved_external_id_records_shadow_ai_event(db, org):
    with pytest.raises(UnresolvedIdentityError):
        ingest.resolve_identity(db, org.id, "anthropic_api", "key_does_not_exist", ingest_path="usage", cost_usd=4.25)
    row = db.query(UnmappedIdentityEvent).one()
    assert row.org_id == org.id
    assert row.source_system == "anthropic_api"
    assert row.external_id == "key_does_not_exist"
    assert row.ingest_path == "usage"
    assert row.cost_usd == 4.25


def test_unresolved_outcome_records_shadow_ai_event_with_no_cost(db, org):
    with pytest.raises(UnresolvedIdentityError):
        ingest.ingest_outcome_event(
            db,
            org.id,
            source_system="github",
            external_id="ghost",
            source="github",
            outcome_type="pr_merged",
        )
    row = db.query(UnmappedIdentityEvent).one()
    assert row.ingest_path == "outcome"
    assert row.cost_usd is None


def test_ingest_usage_attributes_to_person(db, org, person):
    p = person()
    ingest.ingest_usage_event(
        db,
        org.id,
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=12.5,
        occurred_at=datetime(2026, 8, 3),
    )
    row = db.query(UsageEvent).one()
    assert row.identity_id == p.id
    assert row.cost_usd == 12.5


def test_ingest_usage_unresolved_raises(db, org):
    with pytest.raises(UnresolvedIdentityError):
        ingest.ingest_usage_event(
            db,
            org.id,
            source_system="anthropic_api",
            external_id="nope",
            tool="anthropic_api",
            cost_usd=1.0,
        )


def test_outcome_uses_default_weight_from_constants(db, org, person):
    p = person()
    ingest.ingest_outcome_event(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="pr_merged",
    )
    row = db.query(OutcomeEvent).one()
    assert row.value_weight == 3.0  # constants.OUTCOME_VALUE_WEIGHTS["pr_merged"]


def test_outcome_explicit_weight_overrides_default(db, org, person):
    p = person()
    ingest.ingest_outcome_event(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="custom_thing",
        value_weight=9.0,
    )
    row = db.query(OutcomeEvent).one()
    assert row.value_weight == 9.0


def test_reverted_pr_auto_derives_quality_signal(db, org, person):
    p = person()
    ingest.ingest_outcome_event(
        db,
        org.id,
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


def test_non_reverted_outcome_does_not_create_quality_signal(db, org, person):
    p = person()
    ingest.ingest_outcome_event(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="pr_merged",
    )
    assert db.query(QualitySignal).count() == 0


def test_quality_signal_defaults_severity_from_constants(db, org, person):
    p = person()
    ingest.ingest_quality_signal(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        signal_type="draft_heavily_rewritten",
    )
    row = db.query(QualitySignal).one()
    assert row.severity == 0.7  # constants.QUALITY_SIGNAL_WEIGHTS["draft_heavily_rewritten"]


def test_quality_signal_unknown_type_falls_back(db, org, person):
    p = person()
    ingest.ingest_quality_signal(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        signal_type="mystery",
    )
    row = db.query(QualitySignal).one()
    assert row.severity == 0.5  # documented fallback for unknown signal types


# --- Idempotency: a retried call with the same event_id must not double-count. ---


def test_usage_event_replay_returns_existing_row_not_a_duplicate(db, org, person):
    p = person()
    first = ingest.ingest_usage_event(
        db,
        org.id,
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=12.5,
        event_id="evt-1",
    )
    second = ingest.ingest_usage_event(
        db,
        org.id,
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=12.5,
        event_id="evt-1",
    )
    assert second.id == first.id
    assert db.query(UsageEvent).count() == 1


def test_usage_event_without_event_id_still_allows_duplicates(db, org, person):
    """No event_id means no idempotency guarantee -- unchanged prior behavior
    for callers that haven't adopted it yet."""
    p = person()
    ingest.ingest_usage_event(
        db,
        org.id,
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=12.5,
    )
    ingest.ingest_usage_event(
        db,
        org.id,
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=12.5,
    )
    assert db.query(UsageEvent).count() == 2


def test_outcome_event_replay_returns_existing_row(db, org, person):
    p = person()
    first = ingest.ingest_outcome_event(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="pr_merged",
        event_id="evt-2",
    )
    second = ingest.ingest_outcome_event(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        source="github",
        outcome_type="pr_merged",
        event_id="evt-2",
    )
    assert second.id == first.id
    assert db.query(OutcomeEvent).count() == 1


def test_reverted_pr_replay_does_not_duplicate_derived_quality_signal(db, org, person):
    p = person()
    for _ in range(2):
        ingest.ingest_outcome_event(
            db,
            org.id,
            source_system="github",
            external_id=f"gh_{p.id}",
            source="github",
            outcome_type="pr_reverted",
            event_id="evt-revert",
        )
    assert db.query(OutcomeEvent).count() == 1
    assert db.query(QualitySignal).count() == 1


def test_quality_signal_replay_returns_existing_row(db, org, person):
    p = person()
    first = ingest.ingest_quality_signal(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        signal_type="draft_heavily_rewritten",
        event_id="evt-3",
    )
    second = ingest.ingest_quality_signal(
        db,
        org.id,
        source_system="github",
        external_id=f"gh_{p.id}",
        signal_type="draft_heavily_rewritten",
        event_id="evt-3",
    )
    assert second.id == first.id
    assert db.query(QualitySignal).count() == 1


def test_unresolved_identity_replay_does_not_duplicate_shadow_ai_row(db, org):
    for _ in range(2):
        with pytest.raises(UnresolvedIdentityError):
            ingest.resolve_identity(
                db,
                org.id,
                "anthropic_api",
                "key_does_not_exist",
                ingest_path="usage",
                cost_usd=4.25,
                event_id="evt-shadow",
            )
    assert db.query(UnmappedIdentityEvent).count() == 1


def test_unresolved_identity_without_event_id_still_records_every_attempt(db, org):
    """Unchanged prior behavior for callers that haven't adopted event_id."""
    for _ in range(2):
        with pytest.raises(UnresolvedIdentityError):
            ingest.resolve_identity(db, org.id, "anthropic_api", "key_does_not_exist", ingest_path="usage")
    assert db.query(UnmappedIdentityEvent).count() == 2


def test_event_id_is_scoped_per_identity_not_global(db, org, person):
    """The same event_id string from two different people's events must not
    collide -- it's only meant to dedupe retries of the exact same call."""
    p1 = person(name="Ada Lovelace")
    p2 = person(name="Grace Hopper")
    ingest.ingest_usage_event(
        db,
        org.id,
        source_system="anthropic_api",
        external_id=f"key_{p1.id}",
        tool="anthropic_api",
        cost_usd=5.0,
        event_id="shared-id",
    )
    ingest.ingest_usage_event(
        db,
        org.id,
        source_system="anthropic_api",
        external_id=f"key_{p2.id}",
        tool="anthropic_api",
        cost_usd=7.0,
        event_id="shared-id",
    )
    assert db.query(UsageEvent).count() == 2
