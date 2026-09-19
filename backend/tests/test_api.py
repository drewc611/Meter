"""End-to-end API tests through the full stack: ingest -> recompute -> read."""

from datetime import datetime

from app.periods import current_period


def _map(client, email, source_system, external_id):
    return client.post(
        "/admin/identity-mapping",
        json={
            "email": email,
            "source_system": source_system,
            "external_id": external_id,
        },
    )


def _bootstrap_person(db):
    """Create one org + team + identity directly, return the identity.
    Exactly one Organization, so every endpoint under test resolves to it
    via the "unambiguous with at most one org" fallback (see
    dependencies.require_api_key / resolve_org_id) without needing a login."""
    from app import models

    org = models.Organization(name="Test Org", plan="company")
    db.add(org)
    db.commit()
    team = models.Team(org_id=org.id, name="Engineering")
    db.add(team)
    db.commit()
    ident = models.Identity(
        org_id=org.id,
        full_name="Live Person",
        email="live@example.com",
        role="Engineer",
        team_id=team.id,
        tier="Standard",
    )
    db.add(ident)
    db.commit()
    db.refresh(ident)
    db.add(
        models.IdentityMapping(
            org_id=org.id, identity_id=ident.id, source_system="anthropic_api", external_id="key_live"
        )
    )
    db.add(models.IdentityMapping(org_id=org.id, identity_id=ident.id, source_system="github", external_id="gh_live"))
    db.commit()
    return ident


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_ingest_unmapped_id_returns_422(client, db):
    _bootstrap_person(db)
    r = client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "totally_unknown",
            "tool": "anthropic_api",
            "cost_usd": 5.0,
        },
    )
    assert r.status_code == 422


def test_ingest_unmapped_id_surfaces_as_shadow_ai_candidate(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)  # a day inside the current period
    r = client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "totally_unknown",
            "tool": "anthropic_api",
            "cost_usd": 5.0,
            "occurred_at": now.isoformat(),
        },
    )
    assert r.status_code == 422

    candidates = client.get("/admin/shadow-ai-candidates")
    assert candidates.status_code == 200
    body = candidates.json()
    assert body["candidate_count"] == 1
    assert body["candidates"][0]["source_system"] == "anthropic_api"
    assert body["candidates"][0]["external_id"] == "totally_unknown"
    assert body["candidates"][0]["known_cost_usd"] == 5.0


def test_oversized_free_text_fields_are_rejected(client, db):
    """None of these have a natural length, and unbounded means one request
    can park megabytes in the database, in the log line, and in every later
    response that reads the row back."""
    _bootstrap_person(db)
    base = {
        "source_system": "anthropic_api",
        "external_id": "key_live",
        "tool": "anthropic_api",
        "cost_usd": 5.0,
    }
    for field, size in (("source_system", 201), ("external_id", 501), ("tool", 201), ("model", 201)):
        r = client.post("/ingest/usage", json={**base, field: "x" * size})
        assert r.status_code == 422, field

    r = client.post("/auth/signup", json={"email": "big@example.com", "password": "hunter22", "name": "x" * 201})
    assert r.status_code == 422


def test_unknown_outcome_type_without_weight_returns_400(client, db):
    _bootstrap_person(db)
    r = client.post(
        "/ingest/outcome",
        json={
            "source_system": "github",
            "external_id": "gh_live",
            "source": "github",
            "outcome_type": "not_a_real_type",
        },
    )
    assert r.status_code == 400


def test_full_pipeline_overview(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)  # a day inside the current period

    for _ in range(3):
        assert (
            client.post(
                "/ingest/usage",
                json={
                    "source_system": "anthropic_api",
                    "external_id": "key_live",
                    "tool": "anthropic_api",
                    "cost_usd": 100.0,
                    "occurred_at": now.isoformat(),
                },
            ).status_code
            == 201
        )
    for _ in range(5):
        assert (
            client.post(
                "/ingest/outcome",
                json={
                    "source_system": "github",
                    "external_id": "gh_live",
                    "source": "github",
                    "outcome_type": "pr_merged",
                    "occurred_at": now.isoformat(),
                },
            ).status_code
            == 201
        )

    # Recompute the current period, then read it back.
    rc = client.post("/admin/recompute-scores")
    assert rc.status_code == 200
    assert rc.json()["people_scored"] == 1

    ov = client.get("/api/overview")
    assert ov.status_code == 200
    body = ov.json()
    assert body["total_spend_usd"] == 300.0
    assert len(body["people"]) == 1
    assert body["people"][0]["name"] == "Live Person"

    people = client.get("/api/people").json()
    assert people[0]["spend_usd"] == 300.0

    teams = client.get("/api/teams").json()
    assert teams[0]["name"] == "Engineering"
    assert teams[0]["people_count"] == 1

    roles = client.get("/api/roles").json()
    assert roles[0]["name"] == "Engineer"


def test_sub_half_cent_per_event_costs_are_not_floored_to_zero(client, db):
    """Regression test for the integer-cents-per-event bug: a Haiku-class
    call costing $0.0003 must not round to $0 before it's summed. 300 calls
    at $0.0003 -- $0.09 of real spend -- used to sum to exactly $0.00
    because usd_to_cents() rounded each event individually before the
    SUM(). Storing per-event cost in micros instead of cents is what fixes
    this; PersonScore still rounds to cents, but only once, on the
    already-summed total."""
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    for _ in range(300):
        assert (
            client.post(
                "/ingest/usage",
                json={
                    "source_system": "anthropic_api",
                    "external_id": "key_live",
                    "tool": "anthropic_api",
                    "cost_usd": 0.0003,
                    "occurred_at": now.isoformat(),
                },
            ).status_code
            == 201
        )
    assert client.post("/admin/recompute-scores").status_code == 200
    people = client.get("/api/people").json()
    assert len(people) == 1
    assert people[0]["spend_usd"] == 0.09


def _post_raw_json(client, path, body: str):
    """httpx's own json= kwarg refuses to encode NaN/Infinity before a
    request is even sent (allow_nan=False in its encoder) -- which is a
    client-side courtesy, not something every real caller gets. Starlette's
    request parsing uses stdlib json.loads, which accepts bare NaN/Infinity
    tokens by default, so a client that serializes with Python's own
    json.dumps(allow_nan=True) (the default) -- or plenty of non-Python
    JSON encoders with the same default -- can and does send them over the
    wire. Posting the raw bytes directly is what actually exercises that
    server-side path instead of only the client library's own guard."""
    return client.post(path, content=body.encode(), headers={"content-type": "application/json"})


def test_non_finite_cost_usd_is_a_clean_422_not_a_500(client, db):
    """Regression test: NaN and +/-Infinity used to reach usd_to_cents()
    unvalidated and raise ValueError/OverflowError there -- an unhandled 500,
    reachable even on the unmapped-identity path since resolve_identity
    records the shadow-AI row before raising its own 422."""
    _bootstrap_person(db)
    base = '"source_system": "anthropic_api", "external_id": "key_live", "tool": "anthropic_api"'
    for bad_cost in ("NaN", "Infinity", "-Infinity"):
        r = _post_raw_json(client, "/ingest/usage", "{" + base + f', "cost_usd": {bad_cost}' + "}")
        assert r.status_code == 422, bad_cost

    r = client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": -1.0,
        },
    )
    assert r.status_code == 422

    # Same guard on the path that records an UnmappedIdentityEvent before
    # its own 422 -- must not crash there either.
    r = _post_raw_json(
        client,
        "/ingest/usage",
        '{"source_system": "anthropic_api", "external_id": "totally_unknown", '
        '"tool": "anthropic_api", "cost_usd": NaN}',
    )
    assert r.status_code == 422


def test_absurdly_large_cost_usd_is_rejected(client, db):
    """Regression test: 1e308 didn't crash, but stored an integer around
    10**314 (scaled to micros) into an INTEGER column -- nonsense far beyond
    any real per-event cost. A sane upper bound turns it into a 422."""
    _bootstrap_person(db)
    r = client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 1e308,
        },
    )
    assert r.status_code == 422


def test_event_id_replay_is_scoped_per_source_system(client, db):
    """Regression test: two integrations that both number their own events
    from 1 (a billing export and a provider's admin API, say) must not
    collide on event_id alone -- the second call used to silently replay
    the first integration's row instead of recording its own. Uses two
    source systems already mapped to the same identity by _bootstrap_person
    (anthropic_api/key_live and github/gh_live) to stand in for two
    different integrations reporting on the same person."""
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    billing = client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 100.0,
            "occurred_at": now.isoformat(),
            "event_id": "inv-9001",
        },
    )
    assert billing.status_code == 201

    provider = client.post(
        "/ingest/usage",
        json={
            "source_system": "github",
            "external_id": "gh_live",
            "tool": "github_copilot",
            "cost_usd": 250.0,
            "occurred_at": now.isoformat(),
            "event_id": "inv-9001",
        },
    )
    assert provider.status_code == 201
    assert provider.json()["id"] != billing.json()["id"]

    assert client.post("/admin/recompute-scores").status_code == 200
    people = client.get("/api/people").json()
    assert people[0]["spend_usd"] == 350.0


def test_people_months_ago_reads_a_prior_period(client, db):
    from app.periods import prior_period

    _bootstrap_person(db)
    cur_start, cur_end = current_period()
    prior_start, _ = prior_period(cur_start)
    prior_day = datetime(prior_start.year, prior_start.month, 10)

    assert (
        client.post(
            "/ingest/usage",
            json={
                "source_system": "anthropic_api",
                "external_id": "key_live",
                "tool": "anthropic_api",
                "cost_usd": 150.0,
                "occurred_at": prior_day.isoformat(),
            },
        ).status_code
        == 201
    )
    rc = client.post("/admin/recompute-scores", params={"start": prior_start.isoformat(), "end": cur_start.isoformat()})
    assert rc.status_code == 200
    assert rc.json()["people_scored"] == 1

    assert client.get("/api/people").json() == []
    people = client.get("/api/people", params={"months_ago": 1}).json()
    assert len(people) == 1
    assert people[0]["spend_usd"] == 150.0


def test_overview_includes_confidence_breakdown(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 50.0,
            "occurred_at": now.isoformat(),
        },
    )
    client.post("/admin/recompute-scores")

    body = client.get("/api/overview").json()
    assert body["confidence_breakdown"] == {"tier1": 1}


def test_trends_endpoint_returns_requested_months(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 75.0,
            "occurred_at": now.isoformat(),
        },
    )
    client.post("/admin/recompute-scores")

    r = client.get("/api/trends?months=3")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 3
    assert body[-1]["total_spend_usd"] == 75.0
    # earlier months have no PersonScore rows yet — zeros, not an error
    assert body[0]["total_spend_usd"] == 0.0


def test_tool_breakdown_endpoint(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "model": "claude-opus-4",
            "cost_usd": 30.0,
            "occurred_at": now.isoformat(),
        },
    )

    r = client.get("/api/tool-breakdown")
    assert r.status_code == 200
    assert r.json() == [{"tool": "anthropic_api", "model": "claude-opus-4", "spend_usd": 30.0, "event_count": 1}]


def test_adoption_endpoint(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 15.0,
            "occurred_at": now.isoformat(),
        },
    )

    r = client.get("/api/adoption")
    assert r.status_code == 200
    body = r.json()
    assert body["total_seats"] == 1
    assert body["active_users"] == 1
    assert body["utilization_pct"] == 100.0


def test_tool_performance_endpoint(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 40.0,
            "occurred_at": now.isoformat(),
        },
    )
    client.post("/admin/recompute-scores")

    r = client.get("/api/tool-performance")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["tool"] == "anthropic_api"
    assert body[0]["spend_usd"] == 40.0
    assert body[0]["people_count"] == 1


def test_spend_forecast_endpoint_insufficient_history(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 40.0,
            "occurred_at": now.isoformat(),
        },
    )
    client.post("/admin/recompute-scores")

    # Fresh test DB has no backfilled history -- fewer than 3 non-zero periods.
    r = client.get("/api/spend-forecast")
    assert r.status_code == 200
    assert r.json()["available"] is False


def test_identity_mapping_unknown_email_404(client, db):
    r = _map(client, "nobody@example.com", "slack", "U123")
    assert r.status_code == 404


def test_identity_mapping_success(client, db):
    _bootstrap_person(db)
    r = _map(client, "live@example.com", "slack", "U123")
    assert r.status_code == 201
    assert r.json()["status"] == "mapped"
