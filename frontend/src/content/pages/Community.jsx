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
    body:
      "What's actually working (and what broke) as the reference platform behind the guides, prompts, and challenge keeps getting built out — not a polished summary after the fact. If a control boundary turns out to be harder to enforce than the guide made it sound, that's what shows up here.",
  },
  {
    title: "Compare notes with other builders",
    body:
      "A place to see how other people running the 30-day challenge scoped their repository controls, their identity boundary, their approval flow — and to post your own. The interesting part is usually where two reasonable setups disagree.",
  },
  {
    title: "A direct line for questions",
    body:
      "Somewhere to ask a specific question about a discipline, a domain, or your capstone build and get a real answer, not a support ticket — not a rewritten version of a guide that already exists.",
  },
];

const FAQ = [
  {
    q: "Is this open yet?",
    a: "No. Everything on this page is real — the pillars describe what it's actually meant to be — but there's no live space to join today. Leave your email below and you'll hear about it the moment there is one.",
  },
  {
    q: "Which platform will it be on?",
    a: "Not decided. It'll depend on what actually fits — a text-heavy build-notes archive wants different software than a live Q&A. Whatever it ends up being, it'll be named here plainly, not folded into a vague \"community platform\" phrase.",
  },
  {
    q: "Will it cost anything?",
    a: "Also not decided. If it does, the price will be stated the same way everything else on this site states a number — plainly, next to what it buys, not hidden behind a \"contact us.\"",
  },
  {
    q: "What happens to my email if this never launches?",
    a: "It sits in the interest list and nothing else — it's not added to any other list, and there's no drip sequence between now and an actual announcement.",
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
        A space to go deeper on governed agentic DevSecOps than a page can — with the Merit AC team
        and other people building through the <a href="/challenge">30-day challenge</a>. It isn't open
        yet. No platform or price has been decided, so there's nothing to sell here — just an honest
        description and a place to say you're interested.
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
        <p>
          Leave your email and I'll reach out when this opens — with whatever it actually turns out
          to be, platform and price included, once those are decided.
        </p>
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
    fetch(API_BASE + "/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailValue, source: "community-interest" }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        msg.textContent = "You're on the list — I'll email you when this opens.";
        msg.className = "signup-msg ok";
        form.reset();
      })
      .catch(function () {
        msg.textContent = "Couldn't reach the server — try again in a moment.";
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
        In the meantime: the <a href="/prompts">30-day prompt archive</a>, the{" "}
        <a href="/guides">guides</a>, and the <a href="/challenge">challenge</a> are all live and
        free — the fastest way to have something worth comparing notes on when this does open. The{" "}
        <a href="/models">models directory</a> and <a href="/glossary">glossary</a> are there too, if
        it's a definition or a tool comparison you're after rather than a build to run.
      </p>
    </ContentLayout>
  );
}
