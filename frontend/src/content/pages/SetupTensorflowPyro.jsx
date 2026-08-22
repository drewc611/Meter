import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";
import Code from "../components/Code.jsx";

export const meta = {
  outFile: "setup/tensorflow-pyro.html",
  title: "TensorFlow / Pyro setup — Merit AC",
  description:
    "Merit AC's ingestion schema isn't limited to hosted LLM APIs. Here's how to report spend from a custom TensorFlow or Pyro training pipeline.",
};

export default function SetupTensorflowPyro() {
  return (
    <ContentLayout active="setup" wide>
      <span className="kicker">Setup guide</span>
      <span className="badge pending">
        <i /> Pattern, not a pre-built connector
      </span>
      <h1>TensorFlow / Pyro setup</h1>
      <p className="lead">
        There's no dedicated TensorFlow or Pyro integration shipping today — Merit AC's built-in
        reference proxies target hosted LLM APIs (see <a href="/setup/python">Python</a>). What
        follows is the honest pattern for reporting spend from a custom model-training or
        probabilistic-modeling pipeline, using the same generic <code>/ingest/usage</code> contract.
      </p>

      <Toc
        items={[
          { href: "#schema", label: `The schema doesn't care what "usage" means` },
          { href: "#pyro", label: "A Pyro inference example" },
          { href: "#value", label: `What "value" and "slop" mean here` },
          { href: "#future", label: "If you want this built in properly" },
        ]}
      />

      <h2 id="schema">The schema doesn't care what &quot;usage&quot; means</h2>
      <p>
        <code>source_system</code> and <code>tool</code> are plain strings, not a fixed enum —{" "}
        <code>UsageEvent</code> only needs an amount, attributed to a person, tagged with something
        identifying. That's enough to report a training run's compute cost the same way a
        hosted-API call gets reported.
      </p>
      <Code>{`# at the end of a training run, once you know the real GPU-hour cost
requests.post(f"{MERIT_API_BASE}/ingest/usage", json={
    "source_system": "internal_training",
    "external_id": external_id_for(researcher_email),
    "tool": "tensorflow",          # or "pyro", or "tensorflow+pyro" if it's a hybrid run
    "model": run_config.model_name,
    "cost_usd": round(gpu_hours * hourly_rate, 6),
}, headers={"Authorization": f"Bearer {MERIT_INGEST_TOKEN}"})`}</Code>
      <p>
        Where <code>gpu_hours * hourly_rate</code> is whatever your actual cloud or on-prem
        accounting gives you for that job — Merit AC doesn't compute compute cost itself, it just
        needs the number and who to attribute it to.
      </p>

      <h2 id="pyro">A Pyro inference example</h2>
      <p>
        The same shape works per-inference rather than per-training-run — useful if your team runs
        Pyro models for probabilistic inference in production and wants to see cost against how
        often the results actually get used:
      </p>
      <Code>{`import time

start = time.monotonic()
posterior = pyro.infer.MCMC(kernel, num_samples=500).run(data)
elapsed_hours = (time.monotonic() - start) / 3600

requests.post(f"{MERIT_API_BASE}/ingest/usage", json={
    "source_system": "internal_training",
    "external_id": external_id_for(analyst_email),
    "tool": "pyro",
    "model": "mcmc_posterior_v3",
    "cost_usd": round(elapsed_hours * hourly_compute_rate, 6),
}, headers={"Authorization": f"Bearer {MERIT_INGEST_TOKEN}"})`}</Code>

      <h2 id="value">What &quot;value&quot; and &quot;slop&quot; mean here</h2>
      <p>
        Outcome and quality signals still have to come from somewhere real — Merit AC doesn't infer
        whether a training run was worthwhile. If your team tracks experiment outcomes (a model
        that shipped vs. one that was scrapped, a Pyro inference that got trusted vs. one that was
        thrown out), those map to <code>POST /ingest/outcome</code> and{" "}
        <code>POST /ingest/quality-signal</code> the same way a GitHub PR merge or revert does for
        code:
      </p>
      <Code>{`# the model from this run got promoted to production
requests.post(f"{MERIT_API_BASE}/ingest/outcome", json={
    "source_system": "internal_training",
    "external_id": external_id_for(researcher_email),
    "source": "internal_training",
    "outcome_type": "model_shipped",
    "external_ref": run_config.run_id,
}, headers={"Authorization": f"Bearer {MERIT_INGEST_TOKEN}"})`}</Code>
      <p>
        See <a href="/architecture">Architecture</a> for how these two feed the same nightly
        scoring job as everything else.
      </p>

      <h2 id="future">If you want this built in properly</h2>
      <p>
        This page describes a pattern you can wire up today, not a maintained connector. If a real
        TensorFlow/Pyro integration would be useful, that's a product conversation, not something
        to assume from this guide alone.
      </p>
    </ContentLayout>
  );
}
