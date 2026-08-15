"""
The scoring engine — deliberately simple and legible rather than clever.
See §6 of the product spec for the methodology writeup; this module is the
literal implementation of Tier 1 and Tier 2.

The math lives in pure functions (raw_value_from_totals, raw_slop_from_severities,
normalize_value_scores) that take plain numbers and are trivially unit-testable
with no database. Thin DB wrappers (raw_value_score, raw_slop_risk) exist for
single-person lookups, and recompute_all() does the whole population in three
aggregate queries rather than a handful of queries per person — so the nightly
job stays flat as the event tables grow into the millions.

Tier 3 (sampled rubric grading) isn't computed here — it's supplied by
humans/LLM-graders directly into RubricGrade, and calibrate_weights() shows
how it would feed back into these formulas. That loop is a v2 concern and is
stubbed, not faked.
"""

from datetime import datetime
from statistics import median

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..constants import SLOP_VOLUME_BASE, SLOP_VOLUME_STEP
from ..models import Identity, OutcomeEvent, PersonScore, QualitySignal, UsageEvent

# --------------------------------------------------------------- pure math


def raw_value_from_totals(spend: float, outcome_value: float) -> float:
    """Tier 1: outcome value produced per AI dollar spent, unnormalized --
    a correlation, not causation, until normalize_value_scores() compares
    it against the company baseline."""
    if spend <= 0:
        return 0.0
    return outcome_value / spend


def raw_slop_from_severities(severities: list[float]) -> float:
    """Tier 2: 0-100 risk score built from the fate of AI-touched output --
    (mean severity) x (a volume dampener, see SLOP_VOLUME_BASE/STEP in
    constants.py), not a raw sum."""
    if not severities:
        return 0.0
    mean_severity = sum(severities) / len(severities)
    volume_factor = min(1.0, SLOP_VOLUME_BASE + SLOP_VOLUME_STEP * len(severities))
    return round(min(100.0, mean_severity * volume_factor * 100), 1)


def normalize_value_scores(raw_scores: dict) -> dict:
    """
    Converts raw value/$ into the "x vs. company median" multiplier the UI shows
    (2.4x, 0.8x, etc). Median rather than mean so a couple of outliers don't
    drag everyone else's number around.
    """
    values = [v for v in raw_scores.values() if v is not None]
    baseline = median(values) if values else 1.0
    if baseline <= 0:
        baseline = 0.01  # avoid div/0 in a pathological all-zero period
    return {k: round(v / baseline, 2) for k, v in raw_scores.items()}


def confidence_label(has_tier2: bool, has_tier3: bool) -> str:
    if has_tier3:
        return "tier1+2+3"
    if has_tier2:
        return "tier1+2"
    return "tier1"


# ----------------------------------------------------- single-person queries


def _sum_spend(db: Session, identity_id: int, start: datetime, end: datetime) -> float:
    total = (
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(UsageEvent.identity_id == identity_id)
        .filter(UsageEvent.occurred_at >= start, UsageEvent.occurred_at < end)
        .scalar()
    )
    return float(total or 0.0)


def _sum_outcome_value(db: Session, identity_id: int, start: datetime, end: datetime) -> float:
    total = (
        db.query(func.coalesce(func.sum(OutcomeEvent.value_weight), 0.0))
        .filter(OutcomeEvent.identity_id == identity_id)
        .filter(OutcomeEvent.occurred_at >= start, OutcomeEvent.occurred_at < end)
        .scalar()
    )
    return float(total or 0.0)


def _slop_signals(db: Session, identity_id: int, start: datetime, end: datetime):
    return (
        db.query(QualitySignal)
        .filter(QualitySignal.identity_id == identity_id)
        .filter(QualitySignal.occurred_at >= start, QualitySignal.occurred_at < end)
        .all()
    )


def raw_value_score(db: Session, identity_id: int, start: datetime, end: datetime) -> float:
    """Tier 1 value/$ for a single person (see raw_value_from_totals)."""
    return raw_value_from_totals(
        _sum_spend(db, identity_id, start, end),
        _sum_outcome_value(db, identity_id, start, end),
    )


def raw_slop_risk(db: Session, identity_id: int, start: datetime, end: datetime) -> float:
    """Tier 2 slop risk for a single person (see raw_slop_from_severities)."""
    return raw_slop_from_severities([s.severity for s in _slop_signals(db, identity_id, start, end)])


# ------------------------------------------------------- population queries


def _spend_by_identity(db: Session, org_id: int, start: datetime, end: datetime) -> dict[int, float]:
    rows = (
        db.query(UsageEvent.identity_id, func.sum(UsageEvent.cost_usd))
        .join(Identity, Identity.id == UsageEvent.identity_id)
        .filter(Identity.org_id == org_id)
        .filter(UsageEvent.occurred_at >= start, UsageEvent.occurred_at < end)
        .group_by(UsageEvent.identity_id)
        .all()
    )
    return {identity_id: float(total or 0.0) for identity_id, total in rows}


def _outcome_value_by_identity(db: Session, org_id: int, start: datetime, end: datetime) -> dict[int, float]:
    rows = (
        db.query(OutcomeEvent.identity_id, func.sum(OutcomeEvent.value_weight))
        .join(Identity, Identity.id == OutcomeEvent.identity_id)
        .filter(Identity.org_id == org_id)
        .filter(OutcomeEvent.occurred_at >= start, OutcomeEvent.occurred_at < end)
        .group_by(OutcomeEvent.identity_id)
        .all()
    )
    return {identity_id: float(total or 0.0) for identity_id, total in rows}


def _severities_by_identity(db: Session, org_id: int, start: datetime, end: datetime) -> dict[int, list[float]]:
    rows = (
        db.query(QualitySignal.identity_id, QualitySignal.severity)
        .join(Identity, Identity.id == QualitySignal.identity_id)
        .filter(Identity.org_id == org_id)
        .filter(QualitySignal.occurred_at >= start, QualitySignal.occurred_at < end)
        .all()
    )
    out: dict[int, list[float]] = {}
    for identity_id, severity in rows:
        out.setdefault(identity_id, []).append(severity)
    return out


def recompute_all(db: Session, org_id: int, start: datetime, end: datetime) -> int:
    """
    The nightly job. Recomputes PersonScore for every Identity in one
    Organization over [start, end). Idempotent — re-running for the same
    org+period upserts rather than duplicating. Returns the number of
    people scored.

    Reads each event table exactly once (three aggregate queries total,
    each joined to Identity to stay within this org), rather than querying
    per person, so cost is independent of headcount. Scoping by org_id here
    is also what keeps normalize_value_scores()'s median from mixing
    unrelated organizations' numbers together -- it only ever sees this
    org's raw_values.
    """
    spends = _spend_by_identity(db, org_id, start, end)
    outcome_values = _outcome_value_by_identity(db, org_id, start, end)
    severities = _severities_by_identity(db, org_id, start, end)

    identity_ids = [row.id for row in db.query(Identity.id).filter(Identity.org_id == org_id).all()]
    raw_values = {
        identity_id: raw_value_from_totals(spends.get(identity_id, 0.0), outcome_values.get(identity_id, 0.0))
        for identity_id in identity_ids
    }
    normalized = normalize_value_scores(raw_values)

    scored = 0
    for identity_id in identity_ids:
        spend = spends.get(identity_id, 0.0)
        if spend <= 0:
            continue  # no AI activity this period — nothing to score

        person_severities = severities.get(identity_id, [])
        conf = confidence_label(has_tier2=bool(person_severities), has_tier3=False)
        slop = raw_slop_from_severities(person_severities)
        value = normalized.get(identity_id, 1.0)

        existing = (
            db.query(PersonScore)
            .filter(
                PersonScore.identity_id == identity_id,
                PersonScore.period_start == start,
                PersonScore.period_end == end,
            )
            .one_or_none()
        )
        if existing:
            existing.spend_usd = spend
            existing.value_per_dollar = value
            existing.slop_risk = slop
            existing.confidence = conf
        else:
            db.add(
                PersonScore(
                    org_id=org_id,
                    identity_id=identity_id,
                    period_start=start,
                    period_end=end,
                    spend_usd=spend,
                    value_per_dollar=value,
                    slop_risk=slop,
                    confidence=conf,
                )
            )
        scored += 1

    db.commit()
    return scored


def calibrate_weights(db: Session):
    """
    STUB — v2. Where Tier 3 (RubricGrade) closes the loop: compare each
    graded sample's rubric score against what Tier 1/2 predicted for that
    same person/period, and nudge OUTCOME_VALUE_WEIGHTS / QUALITY_SIGNAL_WEIGHTS
    (e.g. gradient step or simple regression) so the cheap signals drift toward
    the expensive ground truth over time. Not implemented: needs enough
    RubricGrade volume to be worth doing, which won't exist until Tier 3 is live
    with real customers.
    """
    raise NotImplementedError("Tier 3 calibration loop — build once RubricGrade volume exists")
