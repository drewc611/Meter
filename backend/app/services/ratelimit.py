"""
A small fixed-window-per-caller rate limiter for the three endpoints anyone on
the internet can reach without a token: /auth/login, /auth/signup and
/waitlist. Unthrottled, those are free password guessing, free account
creation, and free lead-table spam respectively.

Deliberately in-process rather than Redis. This app runs as a single Fly
machine by design (see backend/fly.toml -- one SQLite file on one mounted
volume, min_machines_running = 1, auto_stop off), so process-local counters
see every request there is. That stops being true the moment it scales to two
machines, at which point each one enforces its own share of the limit and this
wants moving behind a shared store -- noted in SECURITY.md rather than
pre-built here.

It is a speed bump, not a defence against a botnet: a distributed attacker
with a fresh IP per request is unaffected by any per-IP limit. What it does
buy is that a single host can no longer grind through a password list, and
that is the realistic threat against a deployment this size.
"""

import os
import time
from collections import OrderedDict, deque

from fastapi import HTTPException, Request, status

# One deque of hit timestamps per (bucket, caller), in an LRU: touched on every
# access, evicted from the cold end once the map is full.
#
# The obvious alternative -- sweep out entries older than the window when the
# map gets big -- is actively worse here, and measurably so. A flood from fresh
# addresses is exactly the case where every entry is *inside* the window, so a
# sweep frees nothing, runs again on the very next request, and turns an O(1)
# check into an O(n) scan: measured at 1.9us/request under the threshold and
# 675us/request over it, with the map still growing. That hands an attacker a
# bigger lever than the one being taken away.
#
# Eviction has its own cost: an attacker cycling through more than
# _MAX_TRACKED_CALLERS addresses between two of a victim's requests can push
# the victim's counter out and reset their limit. That is a far more expensive
# attack than the one it replaces, and it is bounded memory rather than not.
_hits: OrderedDict[tuple[str, str], deque[float]] = OrderedDict()
# ~1.1 KB per tracked caller, so this is roughly 22 MB at the ceiling, against
# the 1 GB the machine has (backend/fly.toml).
_MAX_TRACKED_CALLERS = 20_000


def reset() -> None:
    """Drop all counters. For tests -- nothing in the app calls this."""
    _hits.clear()


def _caller(request: Request) -> str:
    """Who to count against.

    Fly-Client-IP is set by Fly's own proxy and overwrites anything the client
    sent, so it's the one forwarded header here that can be trusted. A general
    X-Forwarded-For read is deliberately *not* included: the client controls
    the left-hand entries, so honouring it would let an attacker both dodge
    their own limit and burn someone else's.
    """
    forwarded = request.headers.get("fly-client-ip")
    if forwarded:
        return forwarded.strip()
    return request.client.host if request.client else "unknown"


def limit(bucket: str, *, max_requests: int, window_seconds: int):
    """A FastAPI dependency that 429s a caller past `max_requests` in the last
    `window_seconds`. Set MERIT_RATE_LIMIT_DISABLED to turn it off for a load
    test or a bulk import."""

    def dependency(request: Request) -> None:
        if os.environ.get("MERIT_RATE_LIMIT_DISABLED", "").strip().lower() in ("1", "true", "yes"):
            return
        now = time.monotonic()
        key = (bucket, _caller(request))
        hits = _hits.get(key)
        if hits is None:
            hits = _hits[key] = deque()
            while len(_hits) > _MAX_TRACKED_CALLERS:
                _hits.popitem(last=False)
        else:
            _hits.move_to_end(key)
        while hits and now - hits[0] > window_seconds:
            hits.popleft()
        if len(hits) >= max_requests:
            retry_after = max(1, int(window_seconds - (now - hits[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests -- wait a moment and try again",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)

    return dependency
