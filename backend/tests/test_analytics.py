from datetime import datetime, timedelta

from app.services import scoring
from app.services.analytics import (
    _aggregate,
    forecast_next_period_spend,
    get_adoption,
    get_overview,
    get_tool_breakdown,
    get_tool_performance,
    get_trends,
    recommend_action,
    segment,
)

START = datetime(2026, 8, 1)
END = datetime(2026, 9, 1)

# --------------------------------------------------------------- segment


def test_segment_fund_is_high_value_high_spend():
    assert segment(spend=1500, value=2.0) == "fund"


def test_segment_learn_is_high_value_low_spend():
    assert segment(spend=300, value=2.0) == "learn"


def test_segment_coach_is_low_value_high_spend():
    assert segment(spend=1500, value=0.5) == "coach"


def test_segment_watch_is_low_value_low_spend():
    assert segment(spend=300, value=0.5) == "watch"


# ------------------------------------------------------- recommend_action


def test_recommend_top_performer():
    assert recommend_action(spend=500, value=2.5, slop=10) == "Keep — top performer"


def test_recommend_re_tier_and_coach():
    assert recommend_action(spend=1200, value=0.5, slop=70) == "Re-tier + coach"


def test_recommend_review_quality_when_slop_high_but_spend_low():
    assert recommend_action(spend=200, value=0.5, slop=70) == "Review output quality"


def test_recommend_over_tiered():
    assert recommend_action(spend=1600, value=1.0, slop=20) == "Over-tiered for usage"


def test_recommend_on_track_default():
    assert recommend_action(spend=700, value=1.2, slop=40) == "On track"


# ------------------------------------------------------------- aggregate


def test_aggregate_spend_weights_value_and_slop():
    people = [
        {"team": "Eng", "spend_usd": 100.0, "value_per_dollar": 2.0, "slop_risk": 10.0},
        {"team": "Eng", "spend_usd": 300.0, "value_per_dollar": 1.0, "slop_risk": 50.0},
    ]
    (row,) = _aggregate(people, "team")
    assert row["name"] == "Eng"
    assert row["people_count"] == 2
    assert row["spend_usd"] == 400.0
    # spend-weighted value: (2.0*100 + 1.0*300) / 400 = 1.25
    assert row["value_per_dollar"] == 1.25
    # spend-weighted slop: (10*100 + 50*300) / 400 = 40.0
    assert row["slop_risk"] == 40.0


def test_aggregate_sorts_by_spend_desc():
    people = [
        {"team": "Small", "spend_usd": 50.0, "value_per_dollar": 1.0, "slop_risk": 0.0},
        {"team": "Big", "spend_usd": 500.0, "value_per_dollar": 1.0, "slop_risk": 0.0},
    ]
    rows = _aggregate(people, "team")
    assert [r["name"] for r in rows] == ["Big", "Small"]


# ---------------------------------------------------------- get_overview: confidence_breakdown


def test_get_overview_confidence_breakdown(db, org, person, ingest_helpers):
    tier1_only = person(name="Tier1 Only")
    tier1_and_2 = person(name="Tier1And2")

    for ident in (tier1_only, tier1_and_2):
        ingest_helpers.usage(
            source_system="anthropic_api",
            external_id=f"key_{ident.id}",
            tool="anthropic_api",
            cost_usd=100.0,
            occurred_at=START + timedelta(days=5),
        )
    ingest_helpers.quality(
        source_system="github",
        external_id=f"gh_{tier1_and_2.id}",
        signal_type="regeneration_loop",
        occurred_at=START + timedelta(days=6),
    )
    scoring.recompute_all(db, org.id, START, END)

    overview = get_overview(db, org.id, START, END)
    assert overview["confidence_breakdown"] == {"tier1": 1, "tier1+2": 1}


def test_rework_tax_pct_is_share_of_spend_in_high_slop_bucket(db, org, person, ingest_helpers):
    """rework_tax_pct = spend belonging to slop_risk>=SLOP_HIGH people / total spend."""
    risky = person(name="Risky")
    clean = person(name="Clean")

    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{risky.id}",
        tool="anthropic_api",
        cost_usd=100.0,
        occurred_at=START + timedelta(days=5),
    )
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{clean.id}",
        tool="anthropic_api",
        cost_usd=100.0,
        occurred_at=START + timedelta(days=5),
    )
    # Enough high-severity signals to push risky's slop_risk past SLOP_HIGH (60).
    for _ in range(5):
        ingest_helpers.quality(
            source_system="github",
            external_id=f"gh_{risky.id}",
            signal_type="code_reverted",
            occurred_at=START + timedelta(days=6),
        )
    scoring.recompute_all(db, org.id, START, END)

    overview = get_overview(db, org.id, START, END)
    risky_row = next(p for p in overview["people"] if p["name"] == "Risky")
    assert risky_row["slop_risk"] >= 60.0
    # risky's $100 out of $200 total spend is in the high-slop bucket
    assert overview["rework_tax_pct"] == 50.0


def test_rework_tax_pct_zero_when_no_activity(db, org):
    overview = get_overview(db, org.id, START, END)
    assert overview["total_spend_usd"] == 0.0
    assert overview["rework_tax_pct"] == 0.0


# -------------------------------------------------------------------- get_trends


def test_get_trends_reads_each_given_period(db, org, person, ingest_helpers):
    p = person(name="Trendy")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=100.0,
        occurred_at=START + timedelta(days=5),
    )
    scoring.recompute_all(db, org.id, START, END)

    prior_start = datetime(2026, 7, 1)
    trends = get_trends(db, org.id, [(prior_start, START), (START, END)])

    assert len(trends) == 2
    # earlier period has no PersonScore rows yet — zeros, not an error
    assert trends[0]["total_spend_usd"] == 0.0
    assert trends[0]["people_scored"] == 0
    assert trends[1]["period_start"] == START
    assert trends[1]["total_spend_usd"] == 100.0
    assert trends[1]["people_scored"] == 1


# ------------------------------------------------------------- get_tool_breakdown


def test_get_tool_breakdown_groups_by_tool_and_model(db, org, person, ingest_helpers):
    p = person(name="Toolie")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        model="claude-opus-4",
        cost_usd=40.0,
        occurred_at=START + timedelta(days=2),
    )
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        model="claude-opus-4",
        cost_usd=10.0,
        occurred_at=START + timedelta(days=3),
    )
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="github_copilot",
        cost_usd=5.0,
        occurred_at=START + timedelta(days=4),
    )

    rows = get_tool_breakdown(db, org.id, START, END)
    assert rows[0] == {"tool": "anthropic_api", "model": "claude-opus-4", "spend_usd": 50.0, "event_count": 2}
    assert rows[1] == {"tool": "github_copilot", "model": None, "spend_usd": 5.0, "event_count": 1}


def test_get_tool_breakdown_excludes_events_outside_period(db, org, person, ingest_helpers):
    p = person(name="Outsider")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=999.0,
        occurred_at=datetime(2026, 7, 15),  # before START
    )
    assert get_tool_breakdown(db, org.id, START, END) == []


# --------------------------------------------------------------- get_tool_performance


def test_tool_performance_weights_by_spend_per_tool(db, org, person, ingest_helpers):
    # One person, entirely on one tool: that tool's numbers equal the person's.
    solo = person(name="Solo")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{solo.id}",
        tool="anthropic_api",
        cost_usd=200.0,
        occurred_at=START + timedelta(days=2),
    )
    ingest_helpers.outcome(
        source_system="github",
        external_id=f"gh_{solo.id}",
        source="github",
        outcome_type="pr_merged",
        occurred_at=START + timedelta(days=3),
    )
    scoring.recompute_all(db, org.id, START, END)

    rows = get_tool_performance(db, org.id, START, END)
    assert len(rows) == 1
    assert rows[0]["tool"] == "anthropic_api"
    assert rows[0]["spend_usd"] == 200.0
    assert rows[0]["people_count"] == 1


def test_tool_performance_splits_one_persons_score_across_their_tools(db, org, person, ingest_helpers):
    # A person spending 75% on tool A / 25% on tool B contributes their one
    # overall score to both buckets, weighted 3:1 -- not the same score twice.
    p = person(name="Splitter")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=150.0,
        occurred_at=START + timedelta(days=2),
    )
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="github_copilot",
        cost_usd=50.0,
        occurred_at=START + timedelta(days=2),
    )
    scoring.recompute_all(db, org.id, START, END)

    rows = {r["tool"]: r for r in get_tool_performance(db, org.id, START, END)}
    assert rows["anthropic_api"]["spend_usd"] == 150.0
    assert rows["github_copilot"]["spend_usd"] == 50.0
    # same person -> same underlying value/slop numbers in both buckets
    assert rows["anthropic_api"]["value_per_dollar"] == rows["github_copilot"]["value_per_dollar"]
    assert rows["anthropic_api"]["slop_risk"] == rows["github_copilot"]["slop_risk"]


def test_tool_performance_excludes_people_with_no_scored_period(db, org, person, ingest_helpers):
    # Usage exists but recompute_all() was never run for this period -- no
    # PersonScore row yet, so this person contributes nothing (not a crash).
    p = person(name="Unscored")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=75.0,
        occurred_at=START + timedelta(days=2),
    )
    assert get_tool_performance(db, org.id, START, END) == []


# -------------------------------------------------------------- forecast_next_period_spend


def test_forecast_returns_none_with_fewer_than_three_points():
    points = [{"total_spend_usd": 100.0}, {"total_spend_usd": 200.0}]
    assert forecast_next_period_spend(points) is None


def test_forecast_projects_upward_trend():
    points = [{"total_spend_usd": v} for v in (100.0, 200.0, 300.0)]
    forecast = forecast_next_period_spend(points)
    assert forecast["trend_direction"] == "up"
    assert forecast["projected_spend_usd"] == 400.0
    assert forecast["based_on_periods"] == 3


def test_forecast_projects_flat_trend():
    points = [{"total_spend_usd": v} for v in (500.0, 500.0, 500.0)]
    forecast = forecast_next_period_spend(points)
    assert forecast["trend_direction"] == "flat"
    assert forecast["projected_spend_usd"] == 500.0


def test_forecast_ignores_leading_zero_periods():
    # Zero-spend periods before history starts shouldn't drag the trend down --
    # they're "not scored yet," not "spent nothing."
    points = [{"total_spend_usd": v} for v in (0.0, 0.0, 100.0, 200.0, 300.0)]
    forecast = forecast_next_period_spend(points)
    assert forecast["based_on_periods"] == 3
    assert forecast["trend_direction"] == "up"


# ------------------------------------------------------------------ get_adoption


def test_get_adoption_counts_active_vs_total_by_tier(db, org, person, ingest_helpers):
    active = person(name="Active", tier="Frontier")
    person(name="Idle", tier="Frontier")  # provisioned, never spends
    person(name="Basic Idle", tier="Basic")

    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{active.id}",
        tool="anthropic_api",
        cost_usd=20.0,
        occurred_at=START + timedelta(days=1),
    )

    result = get_adoption(db, org.id, START, END)
    assert result["total_seats"] == 3
    assert result["active_users"] == 1
    assert result["utilization_pct"] == 33.3

    by_tier = {row["tier"]: row for row in result["by_tier"]}
    assert by_tier["Frontier"] == {"tier": "Frontier", "total_seats": 2, "active_users": 1, "utilization_pct": 50.0}
    assert by_tier["Basic"] == {"tier": "Basic", "total_seats": 1, "active_users": 0, "utilization_pct": 0.0}
