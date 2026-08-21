import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";
import Code from "../components/Code.jsx";

export const meta = {
  outFile: "setup/python.html",
  title: "Python setup — Merit",
  description:
    "Wire a Python backend's LLM calls into Merit's /ingest/usage endpoint, via a thin usage-attributing proxy — plus outcomes, quality signals, and how to verify it worked.",
};

export default function SetupPython() {
  return (
    <ContentLayout active="setup" wide>
      <span className="kicker">Setup guide</span>
      <span className="badge">
        <i /> Working example, ships with the repo
      </span>
      <h1>Python setup</h1>
      <p className="lead">
        Employees don't call the Anthropic/OpenAI API directly with a shared org key — they call a
        thin internal proxy. The proxy issues each employee their own logical key, forwards the
        request to the real provider, reads the token usage back off the response, prices it, and
        fires a <code>UsageEvent</code> at Merit — all before the response reaches the caller. No
        code changes in the calling application; just point <code>ANTHROPIC_BASE_URL</code> at the
        proxy instead of the vendor.
      </p>

      <Toc
        items={[
          { href: "#proxy", label: "The proxy, stripped to the part that matters" },
          { href: "#token", label: "Getting your token" },
          { href: "#mapping", label: "Mapping identities before you ingest" },
          { href: "#outcomes", label: "Outcomes and quality signals" },
          { href: "#verify", label: "Verifying it worked" },
        ]}
      />

      <h2 id="proxy">The proxy, stripped to the part that matters</h2>
      <Code>{`@app.post("/v1/messages")
async def proxy_anthropic_messages(request: Request, x_merit_proxy_key: str = Header(...)):
    external_id = PROXY_KEY_TO_EXTERNAL_ID[x_merit_proxy_key]
    body = await request.json()

    upstream_resp = await client.post(f"{ANTHROPIC_UPSTREAM}/v1/messages", json=body, ...)
    payload = upstream_resp.json()

    usage = payload["usage"]
    cost_usd = price(body["model"], usage["input_tokens"], usage["output_tokens"])

    await client.post(MERIT_INGEST_URL, json={
        "source_system": "anthropic_api",
        "external_id": external_id,
        "tool": "anthropic_api",
        "model": body["model"],
        "cost_usd": round(cost_usd, 6),
        "tokens_in": usage["input_tokens"],
        "tokens_out": usage["output_tokens"],
    }, headers={"Authorization": f"Bearer {MERIT_INGEST_TOKEN}"})

    return payload`}</Code>
      <p>
        The full, runnable reference lives at <code>backend/proxy_example.py</code> in the Merit
        repo — same pattern LiteLLM's proxy uses, just with a Merit ingest call added at the end.
        Fire the ingest call after the response streams back to the caller (or via a background
        task/queue), so a slow Merit call never adds latency to the employee's actual request.
      </p>

      <h2 id="token">Getting your token</h2>
      <p>
        Every organization has its own <code>ingest_token</code>, from{" "}
        <code>GET /admin/org</code> once you're signed in. Set it as{" "}
        <code>MERIT_INGEST_TOKEN</code> in the proxy's environment.
      </p>

      <h2 id="mapping">Mapping identities before you ingest</h2>
      <p>
        Before your first event, map the proxy key to a real person via{" "}
        <code>POST /admin/identity-mapping</code>:
      </p>
      <Code>{`requests.post(f"{MERIT_API_BASE}/admin/identity-mapping", json={
    "email": "priya@yourcompany.com",
    "source_system": "anthropic_api",
    "external_id": "proxy-key-priya-abc123",
}, headers={"Authorization": f"Bearer {DASHBOARD_JWT}"})`}</Code>
      <p>
        An unmapped <code>external_id</code> gets a <b>422</b> on ingest, on purpose — that's a
        shadow-AI candidate (spend nobody's accounted for), not something to silently drop.
      </p>

      <h2 id="outcomes">Outcomes and quality signals</h2>
      <p>
        These don't flow through the proxy — they come from webhooks on the systems where the work
        actually lands. A GitHub PR merge:
      </p>
      <Code>{`requests.post(f"{MERIT_API_BASE}/ingest/outcome", json={
    "source_system": "anthropic_api",
    "external_id": "proxy-key-priya-abc123",
    "source": "github",
    "outcome_type": "pr_merged",
    "external_ref": pr_html_url,
}, headers={"Authorization": f"Bearer {MERIT_INGEST_TOKEN}"})`}</Code>
      <p>And a revert, which counts as a quality signal instead:</p>
      <Code>{`requests.post(f"{MERIT_API_BASE}/ingest/quality-signal", json={
    "source_system": "anthropic_api",
    "external_id": "proxy-key-priya-abc123",
    "signal_type": "pr_reverted",
    "external_ref": pr_html_url,
}, headers={"Authorization": f"Bearer {MERIT_INGEST_TOKEN}"})`}</Code>
      <p>
        See <code>github_ingest.py</code> in the repo for a working, whole-repo GitHub sync that
        does this automatically instead of a one-off webhook handler.
      </p>

      <h2 id="verify">Verifying it worked</h2>
      <p>
        Usage events land in <code>UsageEvent</code> immediately, but the dashboard and{" "}
        <code>/api/*</code> only ever read <code>PersonScore</code>, which is written by the
        nightly scoring job. To see today's events reflected without waiting for the schedule,
        trigger it on demand:
      </p>
      <Code>{`requests.post(f"{MERIT_API_BASE}/admin/recompute-scores",
    headers={"Authorization": f"Bearer {DASHBOARD_JWT}"})
# then:
requests.get(f"{MERIT_API_BASE}/api/tool-breakdown",
    headers={"Authorization": f"Bearer {DASHBOARD_JWT}"}).json()`}</Code>
      <p>
        If your tool shows up with the right spend, the wiring is correct. If ingestion returned a
        422 anywhere along the way, that identity mapping step above is the thing to check first.
      </p>
    </ContentLayout>
  );
}
