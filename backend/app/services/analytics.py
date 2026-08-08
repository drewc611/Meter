"""
Read-side query logic backing the dashboard. Everything here reads
PersonScore (materialized by scoring.recompute_all), never raw events —
keeps every dashboard page load to a handful of indexed queries regardless
of how many millions of UsageEvent rows exist underneath.

The thresholds and recovery coefficients are all in constants.py; this module
is only the shape of the queries and the assembly of the response payloads.
"""

from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from ..constants import (
    HIGH_SLOP_RECOVERY_RATE,
    MONTHS_PER_YEAR,
    OVER_TIERED_RECOVERY_RATE,
    OVER_TIERED_SPEND,
    OVER_TIERED_VALUE,
    SHADOW_AI_RATE,
    SLOP_HIGH,
    SLOP_REVIEW,
    SPEND_THRESHOLD,
    STUDY_SPEND,
    TOP_LOW_SLOP,
    TOP_TIER,
    TOP_VALUE,
    VALUE_THRESHOLD,
)
from ..models import PersonScore


def recommend_action(spend: float, value: float, slop: float) -> str:
    if value >= TOP_VALUE and slop < TOP_LOW_SLOP:
        return "Keep — top performer"
    if slop >= SLOP_HIGH and spend >= SPEND_THRESHOLD:
        return "Re-tier + coach"
    if slop >= SLOP_REVIEW:
        return "Review output quality"
    if spend >= OVER_TIERED_SPEND and value < OVER_TIERED_VALUE:
        return "Over-tiered for usage"
    if value >= TOP_VALUE and spend < STUDY_SPEND:
        return "Study & spread habits"
    return "On track"


def segment(spend: float, value: float) -> str:
    if value >= VALUE_THRESHOLD:
        return "fund" if spend >= SPEND_THRESHOLD else "learn"
    return "coach" if spend >= SPEND_THRESHOLD else "watch"


def _latest_scores(db: Session, period_start: datetime, period_end: datetime) -> list[PersonScore]:
    return (
        db.query(PersonScore)
        .filter(PersonScore.period_start == period_start, PersonScore.period_end == period_end)
        .all()
    )


def get_people(db: Session, period_start: datetime, period_end: datetime) -> list[dict]:
    out = []
    for s in _latest_scores(db, period_start, period_end):
        ident = s.identity
        out.append(
            {
                "id": ident.id,
                "name": ident.full_name,
                "team": ident.team.name,
                "role": ident.role,
                "tier": ident.tier,
                "spend_usd": round(s.spend_usd, 2),
                "value_per_dollar": s.value_per_dollar,
                "slop_risk": s.slop_risk,
                "confidence": s.confidence,
                "segment": segment(s.spend_usd, s.value_per_dollar),
                "recommendation": recommend_action(s.spend_usd, s.value_per_dollar, s.slop_risk),
            }
        )
    return sorted(out, key=lambda r: -r["spend_usd"])


def _aggregate(people: list[dict], key: str) -> list[dict]:
    buckets = defaultdict(lambda: {"people_count": 0, "spend_usd": 0.0, "vw": 0.0, "sw": 0.0})
    for p in people:
        b = buckets[p[key]]
        b["people_count"] += 1
        b["spend_usd"] += p["spend_usd"]
        b["vw"] += p["value_per_dollar"] * p["spend_usd"]
        b["sw"] += p["slop_risk"] * p["spend_usd"]
    out = []
    for name, b in buckets.items():
        spend = b["spend_usd"] or 1e-9
        out.append(
            {
                "name": name,
                "people_count": b["people_count"],
                "spend_usd": round(b["spend_usd"], 2),
                "value_per_dollar": round(b["vw"] / spend, 2),
                "slop_risk": round(b["sw"] / spend, 1),
            }
        )
    return sorted(out, key=lambda r: -r["spend_usd"])


def get_teams(db: Session, period_start: datetime, period_end: datetime) -> list[dict]:
    return _aggregate(get_people(db, period_start, period_end), "team")


def get_roles(db: Session, period_start: datetime, period_end: datetime) -> list[dict]:
    return _aggregate(get_people(db, period_start, period_end), "role")


def get_overview(
    db: Session,
    period_start: datetime,
    period_end: datetime,
    prior_total_spend: float | None = None,
) -> dict:
    people = get_people(db, period_start, period_end)
    total_spend = sum(p["spend_usd"] for p in people)
    blended_value = sum(p["value_per_dollar"] * p["spend_usd"] for p in people) / total_spend if total_spend else 0.0
    avg_slop = sum(p["slop_risk"] * p["spend_usd"] for p in people) / total_spend if total_spend else 0.0

    segment_counts = defaultdict(int)
    for p in people:
        segment_counts[p["segment"]] += 1

    # Recoverable-spend estimate (§11 of the spec) — heuristic, always labeled as
    # such, and deliberately conservative. Coefficients live in constants.py and
    # are the kind of thing a real deployment calibrates against actual re-tier
    # outcomes.
    over_tiered = [p for p in people if p["tier"] == TOP_TIER and p["value_per_dollar"] < OVER_TIERED_VALUE]
    over_tiered_recoverable = sum(p["spend_usd"] for p in over_tiered) * OVER_TIERED_RECOVERY_RATE

    high_slop = [p for p in people if p["slop_risk"] >= SLOP_HIGH]
    slop_recoverable = sum(p["spend_usd"] for p in high_slop) * HIGH_SLOP_RECOVERY_RATE

    # Shadow AI: not modeled in this demo's ingestion (§5.5 ships separately) —
    # illustrative placeholder, flagged as an estimate rather than a measured figure.
    shadow_ai_recoverable = total_spend * SHADOW_AI_RATE

    recoverable_total = over_tiered_recoverable + slop_recoverable + shadow_ai_recoverable

    spend_change_pct = (
        round((total_spend - prior_total_spend) / prior_total_spend * 100, 1) if prior_total_spend else 0.0
    )

    return {
        "period_start": period_start,
        "period_end": period_end,
        "total_spend_usd": round(total_spend, 2),
        "spend_change_pct": spend_change_pct,
        "blended_value_per_dollar": round(blended_value, 2),
        "avg_slop_risk": round(avg_slop, 1),
        "recoverable_annual_usd": round(recoverable_total * MONTHS_PER_YEAR, 0),
        "recoverable_breakdown": [
            {"label": "Over-tiered seats", "amount_usd": round(over_tiered_recoverable * MONTHS_PER_YEAR, 0)},
            {
                "label": "High-slop spend re-tiered or coached",
                "amount_usd": round(slop_recoverable * MONTHS_PER_YEAR, 0),
            },
            {"label": "Shadow-AI consolidated (est.)", "amount_usd": round(shadow_ai_recoverable * MONTHS_PER_YEAR, 0)},
        ],
        "fund_count": segment_counts["fund"],
        "coach_count": segment_counts["coach"],
        "learn_count": segment_counts["learn"],
        "people": people,
    }
