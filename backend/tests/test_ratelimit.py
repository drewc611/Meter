"""The per-caller cap on the three endpoints anyone can reach without a token.

conftest's fresh_rate_limits fixture clears the counters between tests, so each
of these starts from an empty window.
"""

from app.services import ratelimit


def _login(client, email="nobody@example.com", **kwargs):
    return client.post("/auth/login", json={"email": email, "password": "wrongpassword"}, **kwargs)


def test_login_stops_a_password_guesser(client):
    """Ten wrong passwords from one address is a person who forgot theirs.
    The eleventh is a script."""
    for _ in range(10):
        assert _login(client).status_code == 401
    r = _login(client)
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) > 0


def _join(client, i, **kwargs):
    """/waitlist rather than /auth/login for the structural cases below --
    same limiter, no bcrypt, so these stay fast."""
    return client.post("/waitlist", json={"email": f"lead{i}@example.com"}, **kwargs)


def test_waitlist_signup_is_capped(client):
    for i in range(20):
        assert _join(client, i).status_code == 201
    assert _join(client, 20).status_code == 429


def test_the_limit_is_per_caller_not_global(client):
    """One noisy address must not lock everyone else out -- that would turn
    the limiter into the denial of service it's there to prevent."""
    for i in range(20):
        _join(client, i)
    assert _join(client, 20).status_code == 429
    assert _join(client, 21, headers={"Fly-Client-IP": "198.51.100.7"}).status_code == 201


def test_a_client_supplied_forwarded_header_is_ignored(client):
    """X-Forwarded-For's left-hand entries are written by the client, so
    honouring it would let an attacker rotate their own key and burn someone
    else's. Only Fly-Client-IP, which Fly's proxy overwrites, is trusted."""
    for i in range(20):
        _join(client, i, headers={"X-Forwarded-For": "203.0.113.9"})
    assert _join(client, 20, headers={"X-Forwarded-For": "203.0.113.10"}).status_code == 429


def test_buckets_are_independent(client):
    """Exhausting the waitlist allowance must not spend the login one."""
    for i in range(20):
        _join(client, i)
    assert _join(client, 20).status_code == 429
    assert _login(client).status_code == 401


def test_account_creation_is_capped(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    for i in range(10):
        r = client.post("/auth/signup", json={"email": f"u{i}@example.com", "password": "hunter22", "name": "U"})
        assert r.status_code == 201
    r = client.post("/auth/signup", json={"email": "u10@example.com", "password": "hunter22", "name": "U"})
    assert r.status_code == 429


def test_limiter_can_be_switched_off(client, monkeypatch):
    """An operator doing a bulk import shouldn't have to redeploy to get past
    their own limiter."""
    monkeypatch.setenv("MERIT_RATE_LIMIT_DISABLED", "true")
    for i in range(30):
        assert _join(client, i).status_code == 201


class _Req:
    """The two attributes _caller() reads, without standing up a request."""

    def __init__(self, ip):
        self.headers = {"fly-client-ip": ip}
        self.client = None


def test_tracked_callers_are_capped(monkeypatch):
    """A flood from fresh addresses is one new key per request, none of them
    old enough to expire -- so without a hard cap the map grows for as long as
    the flood does."""
    monkeypatch.setattr(ratelimit, "_MAX_TRACKED_CALLERS", 50)
    dep = ratelimit.limit("flood", max_requests=10, window_seconds=300)
    for i in range(500):
        dep(_Req(f"10.0.0.{i}"))
    assert len(ratelimit._hits) <= 50


def test_eviction_takes_the_coldest_caller_first(monkeypatch):
    """LRU, not arbitrary: a caller who is still making requests must not be
    evicted ahead of one who stopped, or an attacker could clear their own
    counter just by being loud."""
    monkeypatch.setattr(ratelimit, "_MAX_TRACKED_CALLERS", 3)
    dep = ratelimit.limit("evict", max_requests=10, window_seconds=300)
    regular = _Req("198.51.100.1")
    dep(regular)
    dep(_Req("10.0.0.0"))
    dep(_Req("10.0.0.1"))
    dep(regular)  # keeps the regular caller warm; 10.0.0.0 is now coldest
    dep(_Req("10.0.0.99"))  # forces one eviction
    assert ("evict", "198.51.100.1") in ratelimit._hits
    assert ("evict", "10.0.0.0") not in ratelimit._hits
