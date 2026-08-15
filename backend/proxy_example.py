"""
Reference implementation, not run as part of the demo: how spend actually
gets attributed in production.

Employees don't call the Anthropic/OpenAI API directly with a shared org key —
they call a thin internal proxy. The proxy issues each employee (or each
service account) their own logical key, forwards the request to the real
provider, reads the token usage back off the response, prices it, and fires
a UsageEvent at Merit — all before the response reaches the caller. This is
the same pattern LiteLLM's proxy uses; the only Merit-specific part is the
POST at the bottom.

Point your team's ANTHROPIC_BASE_URL (or OPENAI_BASE_URL) at this proxy
instead of the vendor directly, and every call is attributed for free —
no code changes in the calling application.
"""

import os

import httpx
from fastapi import FastAPI, Header, HTTPException, Request

ANTHROPIC_UPSTREAM = "https://api.anthropic.com"
MERIT_INGEST_URL = "http://localhost:8000/ingest/usage"

# Each Organization has its own ingest token now (see GET /admin/org) --
# this proxy authenticates as whichever org this deployment belongs to.
MERIT_INGEST_TOKEN = os.environ.get("MERIT_INGEST_TOKEN", "")

# Per-model $ / 1M tokens (in, out) — keep this table in sync with provider pricing.
PRICING = {
    "claude-opus-4": (15.00, 75.00),
    "claude-sonnet-5": (3.00, 15.00),
}

# Maps the proxy key each employee was issued to the external_id Merit expects.
# In production this is a DB lookup (or comes straight from IdentityMapping via
# a shared table/service) — hardcoded here for illustration only.
PROXY_KEY_TO_EXTERNAL_ID = {
    "proxy-key-priya-abc123": "key_1",
    "proxy-key-marcus-def456": "key_2",
}

app = FastAPI(title="Merit usage-attributing LLM proxy (reference)")


@app.post("/v1/messages")
async def proxy_anthropic_messages(request: Request, x_merit_proxy_key: str = Header(...)):
    external_id = PROXY_KEY_TO_EXTERNAL_ID.get(x_merit_proxy_key)
    if not external_id:
        raise HTTPException(status_code=401, detail="Unknown proxy key — issue one via /admin/identity-mapping first")

    body = await request.json()

    async with httpx.AsyncClient() as client:
        upstream_resp = await client.post(
            f"{ANTHROPIC_UPSTREAM}/v1/messages",
            json=body,
            headers={"x-api-key": "<org-level-anthropic-key>", "anthropic-version": "2023-06-01"},
            timeout=120,
        )
    payload = upstream_resp.json()

    usage = payload.get("usage", {})
    tokens_in = usage.get("input_tokens", 0)
    tokens_out = usage.get("output_tokens", 0)
    model = body.get("model", "claude-sonnet-5")
    price_in, price_out = PRICING.get(model, (3.00, 15.00))
    cost_usd = (tokens_in / 1_000_000) * price_in + (tokens_out / 1_000_000) * price_out

    # Fire-and-forget in production (a background task / queue) so a slow
    # Merit ingest call never adds latency to the employee's actual request.
    async with httpx.AsyncClient() as client:
        await client.post(
            MERIT_INGEST_URL,
            json={
                "source_system": "anthropic_api",
                "external_id": external_id,
                "tool": "anthropic_api",
                "model": model,
                "cost_usd": round(cost_usd, 6),
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
            },
            headers={"Authorization": f"Bearer {MERIT_INGEST_TOKEN}"} if MERIT_INGEST_TOKEN else {},
        )

    return payload


# --------------------------------------------------------------------------
# Outcome and quality signals don't flow through the proxy — they come from
# webhooks on the systems where the work actually lands. Sketch of the
# GitHub side (real handler would verify the webhook signature):
#
#   @app.post("/webhooks/github")
#   async def github_webhook(event: dict, x_github_event: str = Header(...)):
#       if x_github_event == "pull_request" and event["action"] == "closed" and event["pull_request"]["merged"]:
#           await post_outcome(source_system="github", external_id=event["pull_request"]["user"]["login"],
#                               source="github", outcome_type="pr_merged",
#                               external_ref=event["pull_request"]["html_url"])
#       if x_github_event == "pull_request" and event["action"] == "closed" and is_revert(event):
#           await post_outcome(..., outcome_type="pr_reverted", ...)  # also auto-creates a QualitySignal, see ingest.py
# --------------------------------------------------------------------------
