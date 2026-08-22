import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "community.html",
  title: "Community — Merit AC",
  description:
    "A space to compare notes on governed agentic DevSecOps with Andrew Clark and other people running the 30-day challenge. Not open yet — join the interest list.",
};

const PILLARS = [
  {
    title: "Andrew's own build notes",
    body:
      "What's actually working (and what broke) as the reference platform behind the guides, prompts, and challenge keeps getting built out — not a polished summary after the fact.",
  },
  {
    title: "Compare notes with other builders",
    body:
      "A place to see how other people running the 30-day challenge scoped their repository controls, their identity boundary, their approval flow — and to post your own.",
  },
  {
    title: "A direct line for questions",
    body:
      "Somewhere to ask a specific question about a discipline, a domain, or your capstone build and get a real answer, not a support ticket.",
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
        A space to go deeper on governed agentic DevSecOps than a page can — with Andrew Clark and
        other people building through the <a href="/challenge">30-day challenge</a>. It isn't open
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
        In the meantime: the <a href="/prompts">30-day prompt archive</a> and the{" "}
        <a href="/challenge">challenge</a> are both live and free, and the fastest way to have
        something worth comparing notes on when this does open.
      </p>
    </ContentLayout>
  );
}
