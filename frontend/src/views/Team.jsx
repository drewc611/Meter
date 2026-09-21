import { useCallback, useEffect, useState } from "react";

import { useAppData } from "../context/AppDataContext.jsx";
import { AvatarCell, Pill } from "../components/Shared.jsx";
import { createIdentity, fetchIdentities, fetchOrg } from "../lib/api.js";

function IngestTokenCard() {
  const { hasSession } = useAppData();
  const [org, setOrg] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!hasSession) return;
    let cancelled = false;
    fetchOrg().then((o) => {
      if (!cancelled) setOrg(o);
    });
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  // No session, not an admin (403 -> null), or demo mode -- nothing to show.
  if (!org) return null;

  return (
    <div className="card" style={{ marginBottom: "14px" }}>
      <h2>Your ingest token</h2>
      <p className="desc">
        Authenticates <code className="tag">/ingest/*</code> as <b>{org.org_name || org.name}</b> -- paste it into{" "}
        <code className="tag">personal.py</code> or a proxy's <code className="tag">MERIT_API_KEY</code> to start
        tracking usage for everyone below.
      </p>
      <div className="ingest-token-row">
        <code className="ingest-token-value">{revealed ? org.ingest_token : "•".repeat(24)}</code>
        <button type="button" className="ingest-token-toggle" onClick={() => setRevealed((r) => !r)}>
          {revealed ? "Hide" : "Reveal"}
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = { email: "", name: "", role: "", team: "", tier: "Standard" };

function AddTeammateCard({ onAdded }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");
    const result = await createIdentity(form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(`Added ${form.name} -- they're attributable the moment usage lands for ${form.email}.`);
    setForm((f) => ({ ...EMPTY_FORM, team: f.team, tier: f.tier })); // team/tier are the fields you add several people with in a row
    onAdded();
  }

  return (
    <div className="card" style={{ marginBottom: "14px" }}>
      <h2>Add a teammate</h2>
      <p className="desc">
        Provisions them directly -- no SCIM setup required. They show up below immediately, and start scoring the
        moment their first usage event lands under the email you enter here.
      </p>
      <form onSubmit={handleSubmit} className="add-teammate-form">
        <input type="email" placeholder="Email" required value={form.email} onChange={set("email")} />
        <input type="text" placeholder="Full name" required value={form.name} onChange={set("name")} />
        <input type="text" placeholder="Role, e.g. Senior Engineer" required value={form.role} onChange={set("role")} />
        <input type="text" placeholder="Team, e.g. Engineering" required value={form.team} onChange={set("team")} />
        <select value={form.tier} onChange={set("tier")}>
          <option>Basic</option>
          <option>Standard</option>
          <option>Frontier</option>
        </select>
        <button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <div className="auth-error" style={{ marginTop: "10px" }}>{error}</div>}
      {status && <div className="team-added-note">{status}</div>}
    </div>
  );
}

function RosterTable({ identities, loading }) {
  if (loading) return null;
  return (
    <div className="card">
      <h2>Roster</h2>
      <p className="desc">
        Everyone provisioned in this org, whether or not they've produced a usage event yet -- unlike the People
        view, which only shows people the nightly scoring job has actually scored.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Tier</th>
              <th>Added</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {identities.length ? (
              identities.map((p) => (
                <tr key={p.id}>
                  <td>
                    <AvatarCell name={p.name} subtitle={`${p.team} · ${p.role}`} colorKey={p.team} />
                  </td>
                  <td>
                    <Pill tier={p.tier || "Standard"} />
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status ${p.has_scored_data ? "on" : "off"}`}>
                      {p.has_scored_data ? "Scoring" : "Waiting on usage"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  Nobody added yet -- start with the form above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Team({ active }) {
  const { hasSession } = useAppData();
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!hasSession) {
      setLoading(false);
      return;
    }
    fetchIdentities().then((res) => {
      setIdentities(res ? res.identities : []);
      setLoading(false);
    });
  }, [hasSession]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!hasSession) {
    return (
      <section className={`view${active ? " active" : ""}`} id="view-team">
        <div className="card">
          <h2>Onboarding needs a real account</h2>
          <p className="desc">
            This is demo data -- sign in (or sign up) to provision real teammates for your own organization.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`view${active ? " active" : ""}`} id="view-team">
      <IngestTokenCard />
      <AddTeammateCard onAdded={reload} />
      <RosterTable identities={identities} loading={loading} />
    </section>
  );
}
