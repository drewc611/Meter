import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";

export const meta = {
  outFile: "architecture.html",
  title: "Architecture — Merit AC",
  description:
    "How Merit AC is built and hosted -- the ingestion and scoring pipeline, the data model, where it runs, and what's deliberately not built yet.",
};

export default function Architecture() {
  return (
    <ContentLayout active="architecture" wide>
      <span className="kicker">Reference</span>
      <span className="badge">
        <i /> Reflects the live deployment
      </span>
      <h1>How Merit AC is built</h1>
      <p className="lead">
        Exactly how Merit AC is built and hosted -- the pipeline, the data model, where it runs,
        and what's deliberately not built yet.
      </p>

      <Toc
        items={[
          { href: "#pipeline", label: "The ingestion & scoring pipeline" },
          { href: "#data-model", label: "Data model" },
          { href: "#deployment", label: "Where it runs" },
          { href: "#verdict", label: "Does this hosting choice make sense?" },
          { href: "#stubbed", label: "What's deliberately not built yet" },
        ]}
      />

      <h2 id="pipeline">1. The ingestion &amp; scoring pipeline</h2>
      <p>
        Three independent ingestion paths write into three separate tables, all attributed to a
        person through an identity-mapping table, and a nightly job compresses everything into
        one scored row per person that the API and dashboard read.
      </p>
      <div className="card">
        <ol>
          <li>
            <b>LLM proxy / provider billing</b> → <code>POST /ingest/usage</code> →{" "}
            <code>UsageEvent</code>
          </li>
          <li>
            <b>GitHub / Jira / HubSpot webhooks</b> → <code>POST /ingest/outcome</code> →{" "}
            <code>OutcomeEvent</code>, and <code>POST /ingest/quality-signal</code> →{" "}
            <code>QualitySignal</code>
          </li>
          <li>
            <b>Okta / Entra SCIM</b> → <code>IdentityMapping</code> → <code>Identity</code>
          </li>
        </ol>
        <p>
          <code>UsageEvent</code>, <code>OutcomeEvent</code>, <code>QualitySignal</code>, and{" "}
          <code>Identity</code> all feed <code>scoring.recompute_all()</code>, which runs nightly
          and writes one row per person per period into <code>PersonScore</code> — the single
          table every <code>/api/*</code> endpoint and the dashboard actually read.
        </p>
      </div>
      <p>
        <b>The load-bearing invariant:</b> the dashboard and every <code>/api/*</code> endpoint
        read only <code>PersonScore</code>, never raw events — page loads stay fast regardless of
        how much event history accumulates. <code>IdentityMapping</code> is the other load-bearing
        piece: if an external id resolves to the wrong (or no) person, every number downstream is
        wrong, which is why an unmapped id gets a <b>422</b> instead of being silently dropped — an
        unmapped id is a shadow-AI candidate, not something to drop quietly.
      </p>
      <p>
        Scoring runs in two tiers today, both pure functions over a handful of bulk queries rather
        than per-row work, so the nightly job stays flat as event tables grow: <b>Tier 1</b>{" "}
        correlates spend against outcomes (PRs merged, tickets closed, deals advanced) into a
        value-per-dollar number; <b>Tier 2</b> layers a slop-risk score from quality proxies
        (reverts, heavy rewrites, regeneration loops). See <a href="#stubbed">§5</a> for Tier 3.
      </p>

      <h2 id="data-model">2. Data model</h2>
      <p>
        Every row below belongs to exactly one <code>Organization</code> (the tenant boundary) —
        see the multi-tenant isolation work referenced in the repo's own commit history.
      </p>
      <table>
        <thead>
          <tr>
            <th>Table</th>
            <th>What it holds</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>Organization</code>
            </td>
            <td>The tenant — its own ingest_token, plan, name</td>
          </tr>
          <tr>
            <td>
              <code>Team</code>
            </td>
            <td>A grouping of identities, scoped per org</td>
          </tr>
          <tr>
            <td>
              <code>Identity</code>
            </td>
            <td>A real person, scoped per org (unique by org+email)</td>
          </tr>
          <tr>
            <td>
              <code>IdentityMapping</code>
            </td>
            <td>
              External system id (proxy key, GitHub login, …) → <code>Identity</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>UsageEvent</code>
            </td>
            <td>One AI-spend event: tool, model, cost, tokens</td>
          </tr>
          <tr>
            <td>
              <code>OutcomeEvent</code>
            </td>
            <td>A PR merge, ticket close, deal advance, etc.</td>
          </tr>
          <tr>
            <td>
              <code>QualitySignal</code>
            </td>
            <td>A revert, rewrite, regeneration loop, etc.</td>
          </tr>
          <tr>
            <td>
              <code>RubricGrade</code>
            </td>
            <td>Sampled human/LLM grading — Tier 3, not yet populated automatically</td>
          </tr>
          <tr>
            <td>
              <code>PersonScore</code>
            </td>
            <td>
              One row per (identity, period) — the only table <code>/api/*</code> reads
            </td>
          </tr>
          <tr>
            <td>
              <code>DashboardUser</code>
            </td>
            <td>
              A real login (password or Google), separate from <code>Identity</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="deployment">3. Where it runs</h2>
      <div className="card">
        <p>
          <b>Cloudflare</b> — Worker + static assets serving the frontend (a Vite + React app built
          to a plain <code>dist/</code>, no server-side rendering at request time) at{" "}
          <code>usemeritai.com</code>. This page and the rest of the <code>/architecture</code>,{" "}
          <code>/setup/*</code>, <code>/guides</code>, <code>/prompts</code>, <code>/challenge</code>{" "}
          content is prerendered from React components at build time — not client-rendered SPA
          routes — so each one ships as a real, crawlable file instead of an empty shell that only
          populates once JavaScript runs.
        </p>
        <p>
          <b>Fly.io</b> (app <code>meter</code>, region <code>iad</code>) — the FastAPI backend at{" "}
          <code>api.usemeritai.com</code>, backed by a SQLite file on a persistent volume.
        </p>
        <p>
          Both deploy paths trigger off the same push to <code>main</code> in one repo — no second
          repo, no manual deploy step in the common case.
        </p>
      </div>

      <h2 id="verdict">4. Does this hosting choice make sense?</h2>
      <p>
        Yes, for what this actually is right now — an early-stage prototype being demoed to
        prospects, not yet handling real customer data.
      </p>
      <ul>
        <li>
          The frontend builds to static assets, so a CDN-native static host is the right tool —
          Cloudflare Workers gives global distribution, automatic HTTPS, and per-PR preview URLs
          for free.
        </li>
        <li>
          The backend is stateful (a SQLite file, an in-process nightly scoring job) and needs a
          place that keeps a process and a disk alive continuously — Fly.io is a reasonable,
          low-overhead choice at this scale.
        </li>
        <li>
          CORS is locked down to the real production origins, not left wide open the way the
          local-dev default is.
        </li>
      </ul>
      <p>
        <b>Not yet for handling real customer data.</b> Per-user login and role-gated admin
        endpoints are in, but standard pre-production hardening still needs to land: rate
        limiting, an audit log, backup coverage on the database volume, a staging environment, and
        monitoring/alerting. None of that is a reason to change the underlying split; it's
        ordinary engineering work on top of it.
      </p>

      <h2 id="stubbed">5. What's deliberately not built yet</h2>
      <p>Named here on purpose, not hidden — these are decisions, not gaps someone forgot about.</p>
      <div className="card">
        <p>
          <b>Tier 3 calibration</b> — sampled grading needs real <code>RubricGrade</code> volume to
          be worth building against; not faked with synthetic grades.
        </p>
        <p>
          <b>Shadow-AI detection</b> — the recoverable-spend estimate includes a placeholder line
          for it, clearly labeled as an estimate, but reconciling sanctioned spend against observed
          AI activity isn't implemented yet.
        </p>
        <p>
          <b>A job scheduler</b> — <code>/admin/recompute-scores</code> is the nightly job's entry
          point; wiring it to cron/Airflow/a queue is a deployment decision for whoever runs this
          in production, not something the code assumes for you.
        </p>
      </div>


      <div className="card">
        <p>
          Looking for the general field guide to AI system design -- archetypes, complex agent
          patterns, and the ML/AI software landscape? It's moved to{" "}
          <a href="/guides/ai-system-design-patterns">its own guide</a>. The composed and
          advanced multi-stage prompts that used to live on this page are now in the{" "}
          <a href="/prompts/composed-and-advanced-prompts">prompt library</a>, alongside a link
          back from <a href="/prompts">the daily archive</a>.
        </p>
      </div>
    </ContentLayout>
  );
}
