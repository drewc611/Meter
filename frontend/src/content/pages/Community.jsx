import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "community.html",
  title: "Community — Merit AC",
  description:
    "A space to compare notes on governed agentic DevSecOps with the Merit AC team and other people running the 30-day challenge. Not open yet — join the interest list.",
};

const PILLARS = [
  {
    title: "The team's own build notes",
    body: "What's actually working, and what broke, as the platform behind the guides and challenge gets built — not a polished summary after the fact.",
  },
  {
    title: "Compare notes with other builders",
    body: "See how other people running the 30-day challenge scoped their controls, identity boundary, and approval flow — and post your own.",
  },
  {
    title: "A direct line for questions",
    body: "Ask a specific question about a discipline, a domain, or your capstone build, and get a real answer — not a rewritten guide.",
  },
];

const FAQ = [
  {
    q: "Is this open yet?",
    a: "No — the pillars above describe what it's meant to be, but there's no live space yet. Leave your email below and you'll hear when there is.",
  },
  {
    q: "Which platform will it be on?",
    a: "Not decided yet — it depends on what actually fits. Whatever it ends up being, it'll be named here plainly.",
  },
  {
    q: "Will it cost anything?",
    a: "Also not decided. If it does, the price will be stated plainly, next to what it buys.",
  },
  {
    q: "What happens to my email if this never launches?",
    a: "It sits in the interest list, nothing else — no other list, no drip sequence.",
  },
];

export default function Community() {
  return (
    <ContentLayout active="community">
      <span className="kicker">Content</span>
      <span className="badge pending">
        <i /> Not open yet
      </span>
      <h1>Community</h1>
      <p className="lead">
        A space to go deeper on governed agentic DevSecOps with the Merit AC team and other people
        building through the <a href="/challenge">30-day challenge</a>. Not open yet — leave your
        email below and you'll hear when it is.
      </p>

      <div className="grid">
        {PILLARS.map((p) => (
          <div key={p.title} className="card" style={{ margin: 0 }}>
            <p className="kicker" style={{ marginBottom: "8px" }}>
              {p.title}
            </p>
            <p style={{ marginBottom: 0 }}>{p.body}</p>
          </div>
        ))}
      </div>

      <h2>Before you ask</h2>
      {FAQ.map((item) => (
        <div key={item.q} className="card">
          <p className="kicker" style={{ marginBottom: "8px" }}>
            {item.q}
          </p>
          <p style={{ marginBottom: 0 }}>{item.a}</p>
        </div>
      ))}

      <div className="card">
        <p className="kicker" style={{ marginBottom: "8px" }}>
          Get notified
        </p>
        <p>Leave your email and I'll reach out when this opens, platform and price included.</p>
        <form className="signup-form" id="communityForm" noValidate>
          <label htmlFor="communityEmail" className="sr-only">
            Work email
          </label>
          <input
            type="email"
            id="communityEmail"
            name="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <button type="submit">Notify me</button>
        </form>
        <p className="signup-msg" id="communityMsg" role="status" aria-live="polite" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("communityForm");
  var input = document.getElementById("communityEmail");
  var msg = document.getElementById("communityMsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var emailValue = input.value.trim();
    if (!emailValue) return;
    var btn = form.querySelector("button");
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Joining…";
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 15000);
    fetch(API_BASE + "/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailValue, source: "community-interest" }),
      signal: controller.signal,
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("bad status");
        msg.textContent = "You're on the list — I'll email you when this opens.";
        msg.className = "signup-msg ok";
        form.reset();
      })
      .catch(function (err) {
        clearTimeout(timeoutId);
        msg.textContent = err && err.name === "AbortError"
          ? "This is taking longer than expected — try again in a moment."
          : "Couldn't reach the server — try again in a moment.";
        msg.className = "signup-msg err";
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
  });
})();`,
          }}
        />
      </div>

      <p>
        In the meantime: the <a href="/prompts">prompt archive</a>, <a href="/guides">guides</a>,
        and the <a href="/challenge">challenge</a> are live and free. The{" "}
        <a href="/models">models directory</a> and <a href="/glossary">glossary</a> are there too,
        if it's a definition you're after rather than a build.
      </p>
    </ContentLayout>
  );
}
