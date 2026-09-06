import ContentLayout from "../components/ContentLayout.jsx";
import Code from "../components/Code.jsx";

export const meta = {
  outFile: "operator-os.html",
  title: "Operator OS — Merit AC",
  description:
    "Operator OS: a file-based business operating system for solo operators -- double-entry books, cash forecasting with odds attached, import adapters, and a scheduled agent layer, all running on your own machine.",
};

const COMMANDS = [
  { cmd: "os brief", meta: "What needs you today" },
  { cmd: "os cash 90", meta: "When you run out, and on what date" },
  { cmd: "os sim", meta: "The same forecast, run 2,000 times, with the odds" },
  { cmd: "os whatfirst", meta: "Which single collection changes those odds most" },
  { cmd: "os aging", meta: "Who owes you and how late they are" },
  { cmd: "os margin", meta: "What each job made after your own hours are paid" },
  { cmd: "os anomalies", meta: "Statistical flags across the whole business" },
  { cmd: "os query \"...\"", meta: "Ask the registries anything" },
  { cmd: "os books check", meta: "Three proofs that the books tie to the reports" },
];

const WORKSPACES = [
  { name: "01-field-service", leak: "Money earned and never collected" },
  { name: "02-fractional-consultant", leak: "Scope creep and revenue concentration" },
  { name: "03-design-studio", leak: "Hours past estimate, revisions given away" },
  { name: "04-maker-brand", leak: "Cash tied up in stock, wholesale priced off retail" },
  { name: "05-coach-practice", leak: "The hours ceiling, and unpaid time between sessions" },
];

const BOUNDARIES = [
  "Never sends anything -- every draft (invoice, chase, follow-up, content) waits for you to send it.",
  "Never deletes a row -- dropped, lost, cancelled, written-off, and expired are statuses, not deletions.",
  "Never contacts anyone marked do_not_contact, without exception.",
  "Never leaves your machine -- no account, no server, no telemetry, no sync.",
  "Never gives tax, legal, employment, or insurance advice -- it hands you organized facts and tells you to take them to a professional.",
  "Never invents a number -- every figure traces to a row you can open.",
];

export default function OperatorOS() {
  return (
    <ContentLayout>
      <span className="kicker">Product spotlight</span>
      <span className="badge">
        <i /> Runs entirely on your machine -- source in this repo
      </span>
      <h1>Operator OS: the whole business, on your machine, in files you own.</h1>
      <p className="lead">
        Nine CSV files, an engine that does the money math the same way every time, an event log
        that makes every change reversible, real double-entry books, a query language, a cash
        simulation with the odds attached, five import adapters, a plugin SDK, an agent layer that
        runs the whole thing on a schedule, twenty tools, five encoded businesses to start from, and
        a workbook covering every step on Mac and Windows. No account, no server, no subscription,
        nothing to log into -- Python 3.9 and an optional git install are the entire dependency
        list, on purpose.
      </p>

      <h2>Five minutes to something real</h2>
      <Code>{`bash scripts/install.sh          # Mac and Linux
./os doctor                      # check this machine
./os migrate                     # set up the books and the rest of the schema
./os use 01-field-service        # load a real business
./os brief                       # see it running
./os sim                         # the same question, with the odds
./os books check                 # three proofs that the numbers tie`}</Code>
      <p>
        Then make it yours: <code>./os use 01-field-service --empty</code>, <code>./os setup</code>,{" "}
        <code>./os brief</code>. That last command printing your own business name is the finish
        line for day one.
      </p>

      <h2>What it does</h2>
      <p>Forty-one commands in total (<code>os help</code> lists them, <code>os help &lt;group&gt;</code> narrows it). The core ones:</p>
      <div className="grid">
        {COMMANDS.map((c) => (
          <div key={c.cmd} className="card" style={{ margin: 0 }}>
            <p className="tile-title" style={{ marginBottom: "4px" }}>
              <code>{c.cmd}</code>
            </p>
            <p className="tile-meta" style={{ marginBottom: 0 }}>
              {c.meta}
            </p>
          </div>
        ))}
      </div>

      <h2>The five workspaces</h2>
      <p>Encoded starting businesses, picked by the failure mode they teach, not by trade:</p>
      <div className="grid">
        {WORKSPACES.map((w) => (
          <div key={w.name} className="card" style={{ margin: 0 }}>
            <p className="tile-title" style={{ marginBottom: "4px" }}>
              <code>{w.name}</code>
            </p>
            <p className="tile-meta" style={{ marginBottom: 0 }}>
              {w.leak}
            </p>
          </div>
        ))}
      </div>

      <h2>Why files, not an account</h2>
      <p>
        Every registry opens in Excel. Git gives version history for free. Nothing proprietary means
        nothing to migrate away from later. The cost is no concurrency, which doesn't matter when
        the business is one person -- and if the project disappeared tomorrow, the business would
        keep running, because the business is the files, not the software.
      </p>

      <h2>What it will not do</h2>
      <ul>
        {BOUNDARIES.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <h2>How it's licensed</h2>
      <p>
        A permanent, per-business license, not a subscription -- install it on every machine you
        personally use, change any file including the engine, and keep using this version forever
        even if updates stop. It comes with a thirty-day no-questions refund, since every workbook
        module has a finish line you can check yourself: if module one doesn't end with your own
        business printing on your own screen, it didn't work.
      </p>

      <div className="card">
        <p style={{ marginBottom: 0 }}>
          The source lives in this repository, under{" "}
          <a href="https://github.com/drewc611/Meter/tree/main/operator-os">
            <code>operator-os/</code>
          </a>{" "}
          -- this page describes what's actually in that build, sourced directly from its own README
          and manual, not marketing copy written ahead of the product.
        </p>
      </div>
    </ContentLayout>
  );
}
