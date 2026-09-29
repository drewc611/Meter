"""
Merit AC API — the FastAPI application factory. Wires the six routers
(auth, ingestion, admin, dashboard, health, waitlist) onto an app, with CORS
from config. Run with:

    uvicorn app.main:app --reload --port 8000

CORS defaults to the local dev origins (Vite and the compose nginx), never "*";
set MERIT_CORS_ORIGINS to your real frontend origin(s) before this ever sees
real customer data. See config.py.
"""

import logging
import math
import os

from fastapi import Depends, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from .config import cors_origins_from_env, in_production, open_dev_allowed
from .database import init_db
from .dependencies import get_current_user, require_admin, require_api_key
from .routers import admin, assistant, auth, dashboard, health, ingestion, waitlist

logger = logging.getLogger(__name__)


def _json_safe(value):
    """A rejected request body can itself contain a value JSON can't
    represent -- a bare NaN/Infinity/-Infinity float, which Starlette's
    default JSONResponse (allow_nan=False, per the JSON spec) refuses to
    serialize. FastAPI's default 422 handler echoes the offending value
    back verbatim under "input", so without this, posting a non-finite
    cost_usd didn't just fail validation -- the 422 response describing
    *why* it failed crashed with an unhandled 500 of its own. repr(), not
    str(): 'nan' alone reads as a plausible string value; "nan" (Python's
    repr of the float) makes clear it's the number, not text."""
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return repr(value)
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


async def _validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # jsonable_encoder first, same as FastAPI's own default handler, to
    # normalize everything else (tuples in "loc", enums, etc.) -- _json_safe
    # only needs to patch the one gap that encoder leaves: a NaN/Infinity
    # float is already a plain, encoder-legal Python float, so it passes
    # through jsonable_encoder unchanged and only fails downstream, in
    # JSONResponse's own strict-JSON serialization.
    return JSONResponse(status_code=422, content={"detail": _json_safe(jsonable_encoder(exc.errors()))})


def check_startup_environment(cors_origins: list[str]) -> None:
    """Everything that has to be true about the environment before this app is
    allowed to serve traffic. Raises RuntimeError on any deployment that would
    otherwise come up insecure. The one exception is a non-production run with
    MERIT_ALLOW_OPEN_DEV=1 and no MERIT_JWT_SECRET, which is allowed to boot
    with no login and says so in the log.

    Nothing here ever logs a secret's value, only that it is missing or weak.
    """
    prod = in_production()

    # "Unset = open" is deliberate for local dev (see dependencies.py) -- but
    # in production, require_api_key() itself now refuses that fallback
    # unconditionally, regardless of MERIT_API_KEY or org count, so there's
    # nothing left to silently misconfigure here. Every Organization has its
    # own ingest_token (GET /admin/org), which is what a real deployment,
    # including a single-org personal one, is expected to use.
    if not prod and not os.environ.get("MERIT_API_KEY"):
        logger.warning("MERIT_API_KEY is unset -- /ingest/* has no auth enforced while at most one org exists.")

    # Every tenant boundary in this app rests on this token, so a missing or
    # short one is refused outright in production rather than merely logged.
    jwt_secret = os.environ.get("MERIT_JWT_SECRET")
    if not jwt_secret:
        if prod:
            raise RuntimeError(
                "MERIT_JWT_SECRET is unset in production -- refusing to start. Set it to a long "
                "random value (secrets.token_urlsafe(48)) before deploying."
            )
        if not open_dev_allowed():
            raise RuntimeError(
                "MERIT_JWT_SECRET is unset -- refusing to start. Set it to a long random value "
                "(secrets.token_urlsafe(48)), or set MERIT_ALLOW_OPEN_DEV=1 for a throwaway local run "
                "with no login on /api/* and /admin/*."
            )
        logger.warning(
            "MERIT_ALLOW_OPEN_DEV is set and MERIT_JWT_SECRET is not -- /api/* and /admin/* have no login "
            "enforced, anyone who can reach this port can read and change data."
        )
    elif len(jwt_secret) < 32:
        if prod:
            raise RuntimeError(
                "MERIT_JWT_SECRET is shorter than 32 characters in production -- refusing to start. "
                "A guessable secret lets anyone forge a session token for any user in any organization. "
                "Set it to a long random value (secrets.token_urlsafe(48))."
            )
        # Local/dev only: loud in the log, but don't block someone poking at
        # the app on their own machine with a throwaway secret.
        logger.warning(
            "MERIT_JWT_SECRET is shorter than 32 characters -- a guessable secret lets anyone forge a "
            "session token for any user in any organization. Rotate it to a long random value "
            "(secrets.token_urlsafe(48))."
        )

    # A wildcard lets any page on the internet call this API with a visitor's
    # browser, so it is refused everywhere, not only in production. Production
    # additionally has to name its origins: the local dev default would
    # silently break the real frontend and hide that the setting was missed.
    if "*" in cors_origins:
        raise RuntimeError(
            "MERIT_CORS_ORIGINS contains '*' -- refusing to start. List the frontend origin(s) that "
            "should be allowed to call this API, comma-separated."
        )
    if prod and not os.environ.get("MERIT_CORS_ORIGINS", "").strip():
        raise RuntimeError(
            "MERIT_CORS_ORIGINS is unset in production -- refusing to start. Set it to the "
            "frontend origin(s) that should be allowed to call this API, comma-separated."
        )


def create_app() -> FastAPI:
    init_db()
    cors_origins = cors_origins_from_env()
    check_startup_environment(cors_origins)

    # /openapi.json, /docs, and /redoc publish the full admin and ingest
    # endpoint surface to anyone who looks -- harmless in local dev, but on
    # a real deployment it's a map handed to an attacker for free. Set
    # MERIT_DISABLE_API_DOCS to turn them off; every route still works,
    # only the schema/UI is hidden.
    docs_disabled = os.environ.get("MERIT_DISABLE_API_DOCS", "").strip().lower() in ("1", "true", "yes")
    app = FastAPI(
        title="Merit AC API",
        version="0.1.0",
        docs_url=None if docs_disabled else "/docs",
        redoc_url=None if docs_disabled else "/redoc",
        openapi_url=None if docs_disabled else "/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # See _validation_exception_handler's docstring: without this, a request
    # rejected for containing a NaN/Infinity float crashed a second time
    # trying to report why.
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    # /ingest/* -- service token for machines (proxies, webhooks, personal.py).
    app.include_router(ingestion.router, dependencies=[Depends(require_api_key)])
    # /admin/* additionally requires is_admin -- these endpoints can reassign
    # whose spend/outcomes get attributed to whom, not just anyone logged in.
    app.include_router(admin.router, dependencies=[Depends(require_admin)])
    app.include_router(dashboard.router, dependencies=[Depends(get_current_user)])
    app.include_router(health.router)
    # auth/waitlist/assistant are ungated -- an anonymous visitor has no token yet.
    app.include_router(auth.router)
    app.include_router(waitlist.router)
    app.include_router(assistant.router)
    return app


app = create_app()
