import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";
import Code from "../components/Code.jsx";

export const meta = {
  outFile: "setup/react.html",
  title: "React setup — Merit",
  description:
    "Merit ingestion happens server-side. If your product is a React app, instrument the backend it talks to, not the browser.",
};

export default function SetupReact() {
  return (
    <ContentLayout active="setup" wide>
      <span className="kicker">Setup guide</span>
      <span className="badge">
        <i /> One honest constraint, up front
      </span>
      <h1>React setup</h1>
      <p className="lead">
        There isn't a React-specific ingestion path, on purpose: your Merit <code>ingest_token</code>{" "}
        is a real credential, and a React app runs in the visitor's browser — anything shipped in
        the bundle is public. Usage tracking has to happen in whatever server your React app talks
        to, not in the client.
      </p>

      <Toc
        items={[
          { href: "#own-backend", label: "If your app calls an LLM through your own backend" },
          { href: "#browser", label: "If your app calls an LLM API directly from the browser" },
          { href: "#example", label: "A minimal working shape" },
          { href: "#dashboard", label: "What Merit can tell you about frontend spend" },
        ]}
      />

      <h2 id="own-backend">If your React app calls an LLM through your own backend</h2>
      <p>
        That's the common case — a Node or Python service that your React frontend calls, which in
        turn calls Anthropic/OpenAI/etc. Instrument <em>that</em> service using the{" "}
        <a href="/setup/node">Node</a> or <a href="/setup/python">Python</a> guide. Nothing in the
        React app itself changes.
      </p>

      <h2 id="browser">If your React app calls an LLM API directly from the browser</h2>
      <p>
        This is the case worth pausing on: a client-held provider key is a security problem
        independent of Merit, and it also means there's no safe place to hold a Merit ingest token
        either. The fix for both is the same — put a thin proxy in front of the provider call (see
        the <a href="/setup/node">Node</a> guide) so the browser holds a scoped, revocable key
        instead of the real one, and the proxy is what reports usage to Merit.
      </p>

      <h2 id="example">A minimal working shape</h2>
      <p>
        What the React app itself actually does — call your own API route, never the provider or
        Merit directly:
      </p>
      <Code>{`// inside your React component -- no provider key, no Merit token, ever
async function ask(prompt) {
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return res.json();
}

// /api/assistant on YOUR OWN server (Node or Python) -- this is the file
// that follows the setup/node or setup/python guide, holding the real
// provider key and the Merit ingest token, neither of which the browser
// ever sees.`}</Code>

      <h2 id="dashboard">What Merit can tell you about frontend spend</h2>
      <p>
        Once usage is flowing from the backend, per-person and per-tool breakdowns show up the
        same way regardless of what your frontend is built in — see{" "}
        <a href="/architecture">Architecture</a> for how ingestion reaches the dashboard.
      </p>
    </ContentLayout>
  );
}
