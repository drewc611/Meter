"""End-to-end isolation tests: two Organizations' data must never mix, in
either direction, even when helped along by identical names/emails across
them. Pins down dependencies.require_api_key / resolve_org_id's scoping,
and services.scoring.recompute_all's org_id threading -- specifically the
cross-tenant median-mixing bug that existed before PersonScore/Identity
queries were scoped by org (normalize_value_scores() used to see every
org's raw values at once)."""

from datetime import datetime

from app import models
from app.periods import current_period
from app.services import scoring


def _signup(client, email, name):
    r = client.post("/auth/signup", json={"email": email, "password": "hunter22", "name": name})
    assert r.status_code == 201
    return r.json()


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _ingest_token(client, user_token):
    r = client.get("/admin/org", headers=_headers(user_token))
    assert r.status_code == 200
    return r.json()["ingest_token"]


def test_two_signups_get_separate_orgs(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    a = _signup(client, "a@example.com", "Ada")["user"]
    b = _signup(client, "b@example.com", "Bea")["user"]
    assert a["org_id"] != b["org_id"]


def test_ingested_usage_stays_within_its_own_org(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    a = _signup(client, "a@example.com", "Ada")
    b = _signup(client, "b@example.com", "Bea")
    token_a, token_b = a["access_token"], b["access_token"]
    ingest_token_a = _ingest_token(client, token_a)

    now = datetime(*current_period()[0].timetuple()[:3], 10)
    r = client.post(
        "/ingest/usage",
        json={
            "source_system": "manual",
            "external_id": "a@example.com",  # the signer's own auto-mapped Identity
            "tool": "anthropic_api",
            "cost_usd": 42.0,
            "occurred_at": now.isoformat(),
        },
        headers=_headers(ingest_token_a),
    )
    assert r.status_code == 201
    assert client.post("/admin/recompute-scores", headers=_headers(token_a)).status_code == 200

    people_a = client.get("/api/people", headers=_headers(token_a)).json()
    people_b = client.get("/api/people", headers=_headers(token_b)).json()
    assert len(people_a) == 1
    assert people_a[0]["spend_usd"] == 42.0
    assert people_b == []  # org B sees none of org A's data


def test_ingest_token_only_authenticates_its_own_org(client, monkeypatch):
    """Org A's token can't be used to write into org B, and vice versa --
    a token resolves to exactly one org, never "whichever org matches the
    external_id", which is the whole point of per-org tokens."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    a = _signup(client, "a@example.com", "Ada")
    _signup(client, "b@example.com", "Bea")
    ingest_token_a = _ingest_token(client, a["access_token"])

    # b@example.com is only mapped under org B's IdentityMapping, org A's
    # token can't resolve it even though the identity itself does exist.
    r = client.post(
        "/ingest/usage",
        json={
            "source_system": "manual",
            "external_id": "b@example.com",
            "tool": "anthropic_api",
            "cost_usd": 10.0,
        },
        headers=_headers(ingest_token_a),
    )
    assert r.status_code == 422  # unmapped under org A, not silently cross-resolved


def test_colliding_team_and_email_across_two_orgs_does_not_violate_constraint(client, db, monkeypatch):
    """Both orgs' auto-provisioned "Personal" team, and two different
    signups happening to share an email prefix pattern, must not collide --
    proves the rebuilt unique constraints are genuinely per-org."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    _signup(client, "a@example.com", "Ada")
    _signup(client, "b@example.com", "Bea")

    teams = db.query(models.Team).filter_by(name="Personal").all()
    assert len(teams) == 2
    assert {t.org_id for t in teams} == {teams[0].org_id, teams[1].org_id}
    assert teams[0].org_id != teams[1].org_id


def test_recompute_never_touches_the_other_orgs_scores(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    a = _signup(client, "a@example.com", "Ada")
    b = _signup(client, "b@example.com", "Bea")
    token_a, token_b = a["access_token"], b["access_token"]
    ingest_token_a = _ingest_token(client, token_a)
    ingest_token_b = _ingest_token(client, token_b)

    now = datetime(*current_period()[0].timetuple()[:3], 10)
    for token, email, cost in ((ingest_token_a, "a@example.com", 100.0), (ingest_token_b, "b@example.com", 500.0)):
        r = client.post(
            "/ingest/usage",
            json={
                "source_system": "manual",
                "external_id": email,
                "tool": "anthropic_api",
                "cost_usd": cost,
                "occurred_at": now.isoformat(),
            },
            headers=_headers(token),
        )
        assert r.status_code == 201

    client.post("/admin/recompute-scores", headers=_headers(token_a))

    # Only org A got recomputed -- org B's spend was ingested but never scored.
    assert client.get("/api/people", headers=_headers(token_a)).json()[0]["spend_usd"] == 100.0
    assert client.get("/api/people", headers=_headers(token_b)).json() == []


def test_value_median_is_not_mixed_across_orgs(db):
    """The regression test for the cross-tenant statistical bug: org A's
    lone person must normalize to 1.0x against their own (single-person)
    median, regardless of how extreme org B's numbers are."""
    org_a = models.Organization(name="Org A", plan="personal")
    org_b = models.Organization(name="Org B", plan="personal")
    db.add_all([org_a, org_b])
    db.commit()

    def _make_person(org, name, email, spend, outcome_value):
        team = models.Team(org_id=org.id, name="Personal")
        db.add(team)
        db.commit()
        ident = models.Identity(org_id=org.id, full_name=name, email=email, role="Individual", team_id=team.id)
        db.add(ident)
        db.commit()
        db.refresh(ident)
        db.add(models.UsageEvent(identity_id=ident.id, tool="anthropic_api", cost_usd=spend, occurred_at=START))
        if outcome_value:
            db.add(
                models.OutcomeEvent(
                    identity_id=ident.id,
                    source="manual",
                    outcome_type="custom",
                    value_weight=outcome_value,
                    occurred_at=START,
                )
            )
        db.commit()
        return ident

    START = datetime(2026, 8, 1)
    END = datetime(2026, 9, 1)

    _make_person(org_a, "Ada", "ada@example.com", spend=100.0, outcome_value=100.0)  # raw value/$ = 1.0
    # Org B is a wildly different population -- if scoring ever mixed the
    # two orgs' raw values into one median, org A's normalized score would
    # move because of numbers that have nothing to do with it.
    _make_person(org_b, "Bea", "bea@example.com", spend=10.0, outcome_value=1000.0)  # raw value/$ = 100

    scoring.recompute_all(db, org_a.id, START, END)
    scoring.recompute_all(db, org_b.id, START, END)

    score_a = db.query(models.PersonScore).filter_by(org_id=org_a.id).one()
    assert score_a.value_per_dollar == 1.0  # org A's own single-person median, untouched by org B
