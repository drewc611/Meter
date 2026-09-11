// Plain JS, no bundler -- window.__TAURI__ is injected because
// tauri.conf.json sets app.withGlobalTauri, matching the rest of this
// product's zero-build-tool philosophy (see operator-os/README.md).
const { invoke } = window.__TAURI__.core;
const { open } = window.__TAURI__.dialog;

// label shown, the ./os args run, and whether it needs `books post` to be
// meaningful (aging/margin/anomalies read live registries directly and
// don't need it; the books-derived views do).
const REPORTS = [
  { label: "Brief", args: ["brief"] },
  { label: "Cash (90 days)", args: ["cash", "90"] },
  { label: "Simulate", args: ["sim"] },
  { label: "What moves it first", args: ["whatfirst"] },
  { label: "Aging", args: ["aging"] },
  { label: "Margin", args: ["margin"] },
  { label: "Anomalies", args: ["anomalies"] },
  { label: "Validate", args: ["validate"] },
  { label: "Drift (audit trail)", args: ["drift"] },
  { label: "Import ledger", args: ["imports"] },
  { label: "Books: check", args: ["books", "check"] },
  { label: "Books: P&L", args: ["books", "pnl"] },
  { label: "Books: balance", args: ["books", "balance"] },
  { label: "Doctor (this machine)", args: ["doctor"] },
];

const LAST_FOLDER_KEY = "operator-os-desktop.last-folder";

const els = {
  openBtn: document.getElementById("open-btn"),
  bizName: document.getElementById("biz-name"),
  bizPath: document.getElementById("biz-path"),
  commands: document.getElementById("commands"),
  emptyState: document.getElementById("empty-state"),
  output: document.getElementById("output"),
  statusbar: document.getElementById("statusbar"),
};

let currentFolder = null;
let activeArgs = null;

function renderCommandButtons() {
  els.commands.innerHTML = "";
  for (const report of REPORTS) {
    const btn = document.createElement("button");
    btn.textContent = report.label;
    btn.disabled = !currentFolder;
    btn.setAttribute("aria-pressed", String(activeArgs === report.args));
    btn.addEventListener("click", () => runReport(report));
    els.commands.appendChild(btn);
  }
}

async function openFolder(path) {
  const check = await invoke("check_folder", { path });
  if (!check.valid) {
    els.statusbar.textContent = check.reason;
    return;
  }
  currentFolder = path;
  localStorage.setItem(LAST_FOLDER_KEY, path);
  els.bizName.textContent = check.business_name || "Business name not set (run `os setup`)";
  els.bizName.classList.toggle("empty", !check.business_name);
  els.bizPath.textContent = path;
  els.statusbar.textContent = "Ready.";
  renderCommandButtons();
}

async function runReport(report) {
  activeArgs = report.args;
  renderCommandButtons();
  els.emptyState.hidden = true;
  els.output.hidden = false;
  els.output.classList.remove("error");
  els.output.textContent = `Running ./os ${report.args.join(" ")}…`;
  els.statusbar.textContent = `./os ${report.args.join(" ")}`;

  try {
    const result = await invoke("run_report", { folder: currentFolder, command: report.args });
    const text = result.exit_code === 0 ? result.stdout : `${result.stdout}\n${result.stderr}`.trim();
    els.output.textContent = text || "(no output)";
    els.output.classList.toggle("error", result.exit_code !== 0);
  } catch (err) {
    els.output.textContent = String(err);
    els.output.classList.add("error");
  }
}

els.openBtn.addEventListener("click", async () => {
  const selected = await open({ directory: true, multiple: false, title: "Open an Operator OS business folder" });
  if (selected) await openFolder(selected);
});

renderCommandButtons();

const remembered = localStorage.getItem(LAST_FOLDER_KEY);
if (remembered) openFolder(remembered);
