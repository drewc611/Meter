"""
Tunable business constants — the numbers a real deployment would calibrate
per company. Kept in one module (rather than scattered across models.py,
scoring.py, and analytics.py) so there is a single place to look when a
customer asks "where does this weight come from?" during a sales call.

Two groups live here:

  1. Scoring weights   — how each outcome/quality signal moves the score.
  2. Read-side knobs   — segment thresholds, recommendation cutoffs, and the
                          recoverable-spend heuristic coefficients.
"""

# --------------------------------------------------------------- Tier 1 / 2

# Outcome types and the (default, admin-editable) value weight each carries in
# Tier 1. Negative weights are load-bearing: work that had to be undone
# destroys value rather than merely failing to add it.
OUTCOME_VALUE_WEIGHTS: dict[str, float] = {
    "pr_merged": 3.0,
    "pr_reverted": -4.0,
    "ticket_resolved": 1.0,
    "ticket_reopened": -2.0,
    "deal_stage_advanced": 2.5,
    "doc_published": 1.5,
}

# Quality-signal types and how heavily each moves the Tier 2 slop score.
# Severity is 0-1; these are the defaults each type carries before per-event
# jitter/override.
QUALITY_SIGNAL_WEIGHTS: dict[str, float] = {
    "code_reverted": 1.0,
    "pr_rework_high": 0.6,  # PR required >2 rounds of review changes
    "draft_heavily_rewritten": 0.7,  # AI-drafted doc, >60% of chars changed
    "content_never_opened": 0.4,
    "regeneration_loop": 0.5,  # same prompt re-run 4+ times in a session
    "ticket_reopened": 0.8,
}

# Slop-risk volume dampener: raw_slop_risk = mean_severity * volume_factor,
# where volume_factor = min(1.0, BASE + STEP * n_signals). Five reverts should
# not read as 5x worse than one once you are already well past "problem".
SLOP_VOLUME_BASE = 0.35
SLOP_VOLUME_STEP = 0.13

# ------------------------------------------------------------- read-side

# Segment thresholds for the "four groups" scatter (fund / coach / learn /
# monitor). Value is the company-median-normalized multiplier; spend is $/mo.
VALUE_THRESHOLD = 1.6
SPEND_THRESHOLD = 900.0

# Slop cutoff used by recommendations and the recoverable-spend estimate.
# recommend_action() checks this same bar twice -- once gated on high spend
# ("Re-tier + coach"), once not ("Review output quality") -- so one high-slop
# person always lands in one bucket or the other, not both.
SLOP_HIGH = 60.0

# Recommendation cutoffs (see analytics.recommend_action).
TOP_VALUE = 2.2
TOP_LOW_SLOP = 30.0
OVER_TIERED_SPEND = 1500.0
OVER_TIERED_VALUE = 1.5
STUDY_SPEND = 600.0

# Recoverable-spend heuristic (analytics.get_overview). Deliberately
# conservative and always surfaced as an estimate in the UI: re-tiering
# someone down does not zero their spend, and not every high-slop dollar
# coaches away.
OVER_TIERED_RECOVERY_RATE = 0.25  # of over-tiered (Frontier, low-value) spend
HIGH_SLOP_RECOVERY_RATE = 0.20  # of high-slop spend
SHADOW_AI_RATE = 0.05  # placeholder for unmodeled shadow-AI spend

# The over-tiered bucket targets this seat tier specifically.
TOP_TIER = "Frontier"

MONTHS_PER_YEAR = 12
