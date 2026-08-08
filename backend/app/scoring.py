"""
The scoring engine — this is the part of the product that has to be defended
in a sales call, so every function here is deliberately simple and legible
rather than clever. See §6 of the product spec for the methodology writeup;
this module is the literal implementation of Tier 1 and Tier 2.

Tier 3 (sampled rubric grading) isn't computed here — it's supplied by
humans/LLM-graders directly into RubricGrade, and calibrate_weights() shows
how it would feed back into these formulas. That loop is a v2 concern and is
stubbed, not faked.
"""
from collections import defaultdict
from datetime import datetime
from statistics import median
from sqlalchemy.orm import Session

from .models import (
    Identity, UsageEvent, OutcomeEvent, QualitySignal, PersonScore,
)


def _sum_spend(db: Session, identity_id: int, start: datetime, end: datetime) -> float:
    rows = (
        db.query(UsageEvent)
        .filter(UsageEvent.identity_id == identity_id)
        .filter(UsageEvent.occurred_at >= start, UsageEvent.occurred_at < end)
        .all()
    )
    return sum(r.cost_usd for r in rows)


def _sum_outcome_value(db: Session, identity_id: int, start: datetime, end: datetime) -> float:
    rows = (
        db.query(OutcomeEvent)
        .filter(OutcomeEvent.identity_id == identity_id)
        .filter(OutcomeEvent.occurred_at >= start, OutcomeEvent.occurred_at < end)
        .all()
    )
    return sum(r.value_weight for r in rows)


def _slop_signals(db: Session, identity_id: int, start: datetime, end: datetime):
    return (
        db.query(QualitySignal)
        .filter(QualitySignal.identity_id == identity_id)
        .filter(QualitySignal.occurred_at >= start, QualitySignal.occurred_at < end)
        .all()
    )


def raw_value_score(db: Session, identity_id: int, start: datetime, end: datetime) -> float:
    """
    Tier 1: outcome value produced per AI dollar spent, unnormalized.
    This is a correlation, not causation — someone can have high raw value
    and low AI usage (they'd just be a strong performer). It only becomes
    a *signal about AI* once compared against the company baseline, which
    normalize_value_scores() does across the whole population.
    """
    spend = _sum_spend(db, identity_id, start, end)
    outcome_value = _sum_outcome_value(db, identity_id, start, end)
    if spend <= 0:
        return 0.0
    return outcome_value / spend


def raw_slop_risk(db: Session, identity_id: int, start: datetime, end: datetime) -> float:
    """
    Tier 2: 0-100 risk score built from the fate of AI-touched output.
    Each signal type has a severity weight (models.QUALITY_SIGNAL_WEIGHTS);
    volume matters too, so this is (mean severity) x (a volume dampener),
    not a raw sum — five reverts shouldn't read as 5x worse than one revert
    once you're already well past "this is a problem."
    """
    signals = _slop_signals(db, identity_id, start, end)
    if not signals:
        return 0.0
    mean_severity = sum(s.severity for s in signals) / len(signals)
    volume_factor = min(1.0, 0.35 + 0.13 * len(signals))  # saturates around 5 signals
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


def recompute_all(db: Session, start: datetime, end: datetime) -> int:
    """
    The nightly job. Recomputes PersonScore for every Identity over [start, end).
    Idempotent — re-running for the same period upserts rather than duplicating.
    Returns the number of people scored.
    """
    identities = db.query(Identity).all()
    raw_values = {}
    spends = {}
    slop_by_person = {}
    tier2_present = {}

    for ident in identities:
        raw_values[ident.id] = raw_value_score(db, ident.id, start, end)
        spends[ident.id] = _sum_spend(db, ident.id, start, end)
        signals = _slop_signals(db, ident.id, start, end)
        tier2_present[ident.id] = len(signals) > 0
        slop_by_person[ident.id] = raw_slop_risk(db, ident.id, start, end)

    normalized = normalize_value_scores(raw_values)

    n = 0
    for ident in identities:
        spend = spends[ident.id]
        if spend <= 0:
            continue  # no AI activity this period — nothing to score
        existing = (
            db.query(PersonScore)
            .filter(
                PersonScore.identity_id == ident.id,
                PersonScore.period_start == start,
                PersonScore.period_end == end,
            )
            .one_or_none()
        )
        conf = confidence_label(tier2_present[ident.id], has_tier3=False)
        if existing:
            existing.spend_usd = spend
            existing.value_per_dollar = normalized.get(ident.id, 1.0)
            existing.slop_risk = slop_by_person[ident.id]
            existing.confidence = conf
        else:
            db.add(PersonScore(
                identity_id=ident.id,
                period_start=start,
                period_end=end,
                spend_usd=spend,
                value_per_dollar=normalized.get(ident.id, 1.0),
                slop_risk=slop_by_person[ident.id],
                confidence=conf,
            ))
        n += 1
    db.commit()
    return n


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
