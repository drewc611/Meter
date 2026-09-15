import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "ask.html",
  title: "Ask — Merit AC",
  description: "Ask a question about Merit AC's work. Answered by an AI assistant grounded only in what's actually published on this site.",
};

export default function AskAssistant() {
  return (
    <ContentLayout active="ask">
      <span className="kicker">Assistant</span>
      <h1>Ask about the work here</h1>
      <p className="lead">
        Answers come only from what's actually published on this site — news, guides, the models
        directory, the glossary — never guessed or filled in from outside. If the site doesn't
        cover something yet, the assistant says so instead of making it up.
      </p>

      <div className="card">
        <div id="askMessages" className="ask-messages" aria-live="polite">
          <p className="ask-msg ask-msg-assistant">
            Ask a question about Merit AC's product, architecture, or anything else on this site.
          </p>
        </div>
        <form id="askForm" className="ask-form" noValidate>
          <label htmlFor="askInput" className="sr-only">
            Your question
          </label>
          <textarea
            id="askInput"
            name="question"
            rows={2}
            placeholder="e.g. How does the recoverable-spend estimate work?"
            required
            maxLength={1000}
          />
          <button type="submit" className="btn btn-primary">
            Ask
          </button>
        </form>
        <p className="signup-msg" id="askError" role="status" aria-live="polite" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("askForm");
  var input = document.getElementById("askInput");
  var messages = document.getElementById("askMessages");
  var errorMsg = document.getElementById("askError");

  function addMessage(role, text) {
    var p = document.createElement("p");
    p.className = "ask-msg ask-msg-" + role;
    p.textContent = text;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
    return p;
  }

  function addSources(sources) {
    if (!sources || !sources.length) return;
    var wrap = document.createElement("p");
    wrap.className = "ask-sources";
    sources.forEach(function (s, i) {
      if (i > 0) wrap.appendChild(document.createTextNode(" \\u00b7 "));
      var a = document.createElement("a");
      a.href = s.url;
      a.textContent = s.title;
      wrap.appendChild(a);
    });
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var question = input.value.trim();
    if (!question) return;
    errorMsg.textContent = "";
    addMessage("user", question);
    input.value = "";
    var btn = form.querySelector("button");
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Asking…";
    var thinking = addMessage("assistant", "Thinking…");

    fetch(API_BASE + "/assistant/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
    })
      .then(function (res) {
        if (res.status === 503) {
          thinking.remove();
          errorMsg.textContent = "The assistant isn't set up yet -- check back later.";
          errorMsg.className = "signup-msg err";
          return null;
        }
        if (res.status === 429) {
          thinking.remove();
          errorMsg.textContent = "Too many questions at once -- wait a moment and try again.";
          errorMsg.className = "signup-msg err";
          return null;
        }
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        thinking.textContent = data.answer;
        addSources(data.sources);
      })
      .catch(function () {
        thinking.remove();
        errorMsg.textContent = "Couldn't reach the assistant -- try again in a moment.";
        errorMsg.className = "signup-msg err";
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
    </ContentLayout>
  );
}
