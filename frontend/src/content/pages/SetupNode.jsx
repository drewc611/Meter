import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";
import Code from "../components/Code.jsx";

export const meta = {
  outFile: "setup/node.html",
  title: "Node setup — Merit AC",
  description:
    "Wire a Node backend's LLM calls into Merit AC's /ingest/usage endpoint, using the same proxy pattern as the Python reference — plus outcomes, quality signals, and verification.",
};

export default function SetupNode() {
  return (
    <ContentLayout active="setup" wide>
      <span className="kicker">Setup guide</span>
      <span className="badge">
        <i /> Same contract as the Python example
      </span>
      <h1>Node setup</h1>
      <p className="lead">
        Merit AC's ingestion API is plain JSON over HTTPS, so a Node proxy follows the exact same
        shape as the <a href="/setup/python">Python reference</a> — issue each employee their own
        key, forward the call, read the token usage off the response, and fire a usage event at
        Merit AC before returning.
      </p>

      <Toc
        items={[
          { href: "#usage", label: "The request that matters" },
          { href: "#fields", label: "Fields Merit AC expects" },
          { href: "#outcomes", label: "Outcomes and quality signals" },
          { href: "#verify", label: "Verifying it worked" },
        ]}
      />

      <h2 id="usage">The request that matters</h2>
      <Code>{`const usage = upstreamResponse.usage;
const costUsd = price(model, usage.input_tokens, usage.output_tokens);

await fetch(\`\${MERIT_API_BASE}/ingest/usage\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${process.env.MERIT_INGEST_TOKEN}\`,
  },
  body: JSON.stringify({
    source_system: "anthropic_api",
    external_id: externalIdForKey(proxyKey),
    tool: "anthropic_api",
    model,
    cost_usd: Number(costUsd.toFixed(6)),
    tokens_in: usage.input_tokens,
    tokens_out: usage.output_tokens,
  }),
});`}</Code>
      <p>
        Fire this after the response streams back to the caller (or via a queue) so a slow Merit AC
        ingest call never adds latency to the actual request — same note as the Python reference in{" "}
        <code>backend/proxy_example.py</code>.
      </p>

      <h2 id="fields">Fields Merit AC expects</h2>
      <p>
        <code>source_system</code>, <code>external_id</code>, <code>tool</code>, and{" "}
        <code>cost_usd</code> are required; <code>model</code>, <code>tokens_in</code>,{" "}
        <code>tokens_out</code>, and <code>occurred_at</code> are optional.{" "}
        <code>external_id</code> must already exist in an <code>IdentityMapping</code> for your
        organization — map it once:
      </p>
      <Code>{`await fetch(\`\${MERIT_API_BASE}/admin/identity-mapping\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${dashboardJwt}\`,
  },
  body: JSON.stringify({
    email: "priya@yourcompany.com",
    source_system: "anthropic_api",
    external_id: "proxy-key-priya-abc123",
  }),
});`}</Code>
      <p>
        using the <code>ingest_token</code> from <code>GET /admin/org</code>. An unmapped{" "}
        <code>external_id</code> gets a <b>422</b> on purpose — that's a shadow-AI candidate, not
        something to silently drop.
      </p>

      <h2 id="outcomes">Outcomes and quality signals</h2>
      <p>
        These don't flow through the proxy — they come from webhooks on the systems where the work
        actually lands:
      </p>
      <Code>{`// PR merged
await fetch(\`\${MERIT_API_BASE}/ingest/outcome\`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: \`Bearer \${MERIT_INGEST_TOKEN}\` },
  body: JSON.stringify({
    source_system: "anthropic_api",
    external_id: "proxy-key-priya-abc123",
    source: "github",
    outcome_type: "pr_merged",
    external_ref: pullRequest.html_url,
  }),
});

// PR reverted -- a quality signal, not an outcome
await fetch(\`\${MERIT_API_BASE}/ingest/quality-signal\`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: \`Bearer \${MERIT_INGEST_TOKEN}\` },
  body: JSON.stringify({
    source_system: "anthropic_api",
    external_id: "proxy-key-priya-abc123",
    signal_type: "pr_reverted",
    external_ref: pullRequest.html_url,
  }),
});`}</Code>

      <h2 id="verify">Verifying it worked</h2>
      <p>
        Usage events land immediately, but the dashboard reads <code>PersonScore</code>, written
        by the nightly scoring job. Trigger it on demand to see today's events reflected without
        waiting:
      </p>
      <Code>{`await fetch(\`\${MERIT_API_BASE}/admin/recompute-scores\`, {
  method: "POST",
  headers: { Authorization: \`Bearer \${dashboardJwt}\` },
});
const breakdown = await fetch(\`\${MERIT_API_BASE}/api/tool-breakdown\`, {
  headers: { Authorization: \`Bearer \${dashboardJwt}\` },
}).then((r) => r.json());`}</Code>
      <p>If your tool shows up with the right spend, the wiring is correct.</p>
    </ContentLayout>
  );
}
