"""
Seeds the database with a fabricated month of activity for a 20-person
company and runs the scoring job — so the API has something real to serve
the moment the server starts. Deterministic (fixed random seed) so repeat
runs produce the same numbers.

    python seed.py
"""
import random
from datetime import datetime, timedelta

from app.database import SessionLocal, engine, Base
from app.models import Identity, Team, IdentityMapping, QUALITY_SIGNAL_WEIGHTS
from app import ingest, scoring
from app.periods import current_period, prior_period

random.seed(42)

Base.metadata.drop_all(bind=engine)   # clean slate on every seed run
Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ---- period: the current calendar month, from the SAME function main.py uses.
# (An earlier version of this script computed its own period boundary and it
# drifted from main.current_period() by a few hours of month-end arithmetic —
# the API queried PersonScore rows that existed but at a different period_end,
# so every endpoint silently returned []. Sharing one function is the fix.)
PERIOD_START, PERIOD_END = current_period()
PRIOR_START, PRIOR_END = prior_period(PERIOD_START)

TEAMS = ["Engineering", "Design", "Support", "Sales", "Marketing", "Data"]
team_rows = {name: Team(name=name) for name in TEAMS}
db.add_all(team_rows.values())
db.commit()

# name, team, role, tier, profile
# profiles: "star" (high value, low slop), "risky" (high slop, low value),
#           "steady" (middle of the road), "quiet" (low spend, low everything)
PEOPLE = [
    ("Priya Nair", "Engineering", "Staff Engineer", "Frontier", "star"),
    ("Marcus Reed", "Engineering", "Senior Engineer", "Frontier", "risky"),
    ("Dana Ito", "Engineering", "Senior Engineer", "Standard", "star"),
    ("Kofi Mensah", "Engineering", "Junior Engineer", "Frontier", "risky"),
    ("Lena Vogt", "Data", "Data Scientist", "Frontier", "star"),
    ("Sam Ortiz", "Data", "Analyst", "Standard", "steady"),
    ("Ruth Okafor", "Design", "Product Designer", "Standard", "star"),
    ("Bea Lund", "Design", "Content Designer", "Frontier", "risky"),
    ("Tom Ashby", "Marketing", "Content Lead", "Frontier", "risky"),
    ("Zoe Park", "Marketing", "Growth Marketer", "Standard", "steady"),
    ("Hugo Silva", "Sales", "Account Executive", "Standard", "steady"),
    ("Nina Brandt", "Sales", "SDR", "Frontier", "risky"),
    ("Owen Clarke", "Support", "Support Engineer", "Standard", "star"),
    ("Mei Tan", "Support", "Support Rep", "Basic", "steady"),
    ("Raj Patel", "Engineering", "Junior Engineer", "Standard", "steady"),
    ("Ada Novak", "Engineering", "Staff Engineer", "Frontier", "star"),
    ("Ivan Petrov", "Data", "Data Engineer", "Frontier", "risky"),
    ("Cara Diaz", "Design", "Product Designer", "Basic", "star"),
    ("Jon Webb", "Marketing", "Growth Marketer", "Standard", "risky"),
    ("Alia Rahman", "Sales", "Account Executive", "Standard", "steady"),
]

identities = {}
for name, team, role, tier, profile in PEOPLE:
    email = name.lower().replace(" ", ".") + "@northwindlabs.example"
    ident = Identity(full_name=name, email=email, role=role, team_id=team_rows[team].id, tier=tier)
    db.add(ident)
    db.commit()
    db.refresh(ident)
    identities[name] = (ident, profile)
    # every person gets a proxy-key mapping (usage) and a github mapping (outcomes/quality)
    db.add(IdentityMapping(identity_id=ident.id, source_system="anthropic_api", external_id=f"key_{ident.id}"))
    db.add(IdentityMapping(identity_id=ident.id, source_system="github", external_id=name.lower().replace(" ", "-")))
    db.commit()

TOOLS = ["anthropic_api", "github_copilot", "chatgpt_enterprise"]
MODELS = ["claude-opus-4", "claude-sonnet-5", "gpt-4.1", None]

PROFILE_SPEND_RANGE = {"star": (500, 2400), "risky": (600, 2100), "steady": (250, 900), "quiet": (100, 400)}
PROFILE_OUTCOME_MIX = {
    # (pr_merged, pr_reverted, ticket_resolved, ticket_reopened, deal_advanced, doc_published) event *base counts*
    # — jittered +/-30% per person below so nobody in a profile lands on an identical score.
    "star":   dict(pr_merged=20, pr_reverted=0, ticket_resolved=12, ticket_reopened=0, deal_stage_advanced=7, doc_published=7),
    "risky":  dict(pr_merged=4,  pr_reverted=5, ticket_resolved=3,  ticket_reopened=4, deal_stage_advanced=1, doc_published=1),
    "steady": dict(pr_merged=7,  pr_reverted=1, ticket_resolved=6,  ticket_reopened=1, deal_stage_advanced=2, doc_published=2),
    "quiet":  dict(pr_merged=2,  pr_reverted=0, ticket_resolved=2,  ticket_reopened=0, deal_stage_advanced=0, doc_published=1),
}
PROFILE_QUALITY_SIGNALS = {
    # signal_type -> base event count, jittered per person
    "star":   dict(draft_heavily_rewritten=0, content_never_opened=0, regeneration_loop=1),
    "risky":  dict(draft_heavily_rewritten=4, content_never_opened=3, regeneration_loop=5),
    "steady": dict(draft_heavily_rewritten=1, content_never_opened=1, regeneration_loop=1),
    "quiet":  dict(draft_heavily_rewritten=0, content_never_opened=0, regeneration_loop=0),
}


def jitter_count(base: int) -> int:
    """+/-30% per person so two people on the same profile don't produce byte-identical
    scores — real populations don't cluster on one exact number."""
    if base <= 0:
        return 0
    return max(0, round(base * random.uniform(0.7, 1.3)))


def jitter_severity(base: float) -> float:
    return round(min(1.0, max(0.05, base * random.uniform(0.85, 1.15))), 3)


def random_day_this_period():
    day = random.randint(0, 26)
    return PERIOD_START + timedelta(days=day, hours=random.randint(0, 23))


for name, (ident, profile) in identities.items():
    lo, hi = PROFILE_SPEND_RANGE[profile]
    target_spend = random.uniform(lo, hi)
    n_events = random.randint(15, 40)
    remaining = target_spend
    for i in range(n_events):
        share = remaining / (n_events - i) * random.uniform(0.4, 1.6)
        share = max(0.5, min(share, remaining))
        remaining -= share
        ingest.ingest_usage_event(
            db,
            source_system="anthropic_api",
            external_id=f"key_{ident.id}",
            tool=random.choice(TOOLS),
            model=random.choice(MODELS),
            cost_usd=round(share, 2),
            tokens_in=random.randint(200, 8000),
            tokens_out=random.randint(100, 4000),
            occurred_at=random_day_this_period(),
        )

    for outcome_type, base_count in PROFILE_OUTCOME_MIX[profile].items():
        for _ in range(jitter_count(base_count)):
            ingest.ingest_outcome_event(
                db,
                source_system="github",
                external_id=name.lower().replace(" ", "-"),
                source="github",
                outcome_type=outcome_type,
                occurred_at=random_day_this_period(),
                external_ref=f"ref-{random.randint(1000,9999)}",
            )

    for signal_type, base_count in PROFILE_QUALITY_SIGNALS[profile].items():
        base_severity = QUALITY_SIGNAL_WEIGHTS[signal_type]
        for _ in range(jitter_count(base_count)):
            ingest.ingest_quality_signal(
                db,
                source_system="github",
                external_id=name.lower().replace(" ", "-"),
                signal_type=signal_type,
                occurred_at=random_day_this_period(),
                severity=jitter_severity(base_severity),
            )

# score the current period, plus a lighter-weight prior period for the vs-last-month delta
n = scoring.recompute_all(db, PERIOD_START, PERIOD_END)
print(f"Scored {n} people for {PERIOD_START.date()}")

# a rough prior-period baseline just for the "vs last month" KPI — reuse ~85% of this month's spend
for name, (ident, profile) in identities.items():
    for _ in range(random.randint(10, 25)):
        ingest.ingest_usage_event(
            db,
            source_system="anthropic_api",
            external_id=f"key_{ident.id}",
            tool=random.choice(TOOLS),
            cost_usd=round(random.uniform(20, 90) * 0.85, 2),
            occurred_at=PRIOR_START + timedelta(days=random.randint(0, 26)),
        )
n2 = scoring.recompute_all(db, PRIOR_START, PRIOR_END)
print(f"Scored {n2} people for prior period {PRIOR_START.date()}")

db.close()
print("Seed complete: meter.db")
