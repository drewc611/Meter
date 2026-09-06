#!/usr/bin/env python3
"""
Engine parity.

The browser demo runs a JavaScript port of the python engine. This proves the
port, by running the same commands through both against the same five
workspaces and comparing the output line for line. Anything that drifts shows up
here rather than in front of a buyer.

Only the deterministic commands are compared. The simulation uses a different
random number generator in the browser and says so on screen.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMO = os.path.join(ROOT, "demo")

COMMANDS = [
    ["brief"],
    ["aging"],
    ["cash", "90"],
    ["cash", "90", "--detail"],
    ["margin"],
    ["tax"],
    ["capacity"],
    ["week"],
    ["validate"],
    ["books", "check"],
    ["books", "pnl"],
    ["books", "balance"],
    ["books"],
    ["find", "a"],
    ["query", "select number, contact_name, open_amount, days_late from invoices "
              "where status != paid and days_late > 0 order by open_amount desc"],
    ["query", "select name, outstanding, median_pay_lag, days_since_contact from contacts "
              "where outstanding > 0 order by outstanding desc"],
    ["query", "select name, revenue, cost, margin_pct, hours from projects order by margin_pct"],
    ["query", "select title, weighted_value, action_overdue, days_open from deals where status = open"],
    ["query", "select label, annual, days_away from recurring order by annual desc"],
    ["query", "select id, title, due, days_overdue from tasks where days_overdue > 0 order by days_overdue desc"],
]


def run_python(ws, data_dir, argv):
    env = dict(os.environ, OPERATOR_OS_DATA=data_dir)
    p = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "os.py")] + argv,
                       capture_output=True, text=True, env=env, cwd=ROOT)
    return p.stdout


NODE_SNIPPET = """
const E = require(process.argv[1]);
const data = require(process.argv[2]);
const e = new E.Engine(data[process.argv[3]]);
process.stdout.write(e.run(process.argv[4]));
"""


def run_js(ws, line):
    p = subprocess.run(["node", "-e", NODE_SNIPPET, "--",
                        os.path.join(DEMO, "engine.js"),
                        os.path.join(DEMO, "data.json"), ws, line],
                       capture_output=True, text=True, cwd=ROOT)
    if p.returncode != 0:
        return "NODE ERROR: " + p.stderr.strip()
    return p.stdout


def normalise(s):
    return [l.rstrip() for l in s.rstrip("\n").split("\n")]


def main():
    workspaces = sorted(os.listdir(os.path.join(ROOT, "workspaces")))
    checks = passed = 0
    failures = []
    for ws in workspaces:
        data_dir = tempfile.mkdtemp(prefix="parity-")
        env = dict(os.environ, OPERATOR_OS_DATA=data_dir)
        subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "os.py"), "use", ws],
                       capture_output=True, env=env, cwd=ROOT)
        subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "os.py"), "migrate"],
                       capture_output=True, env=env, cwd=ROOT)
        subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "os.py"), "books", "post"],
                       capture_output=True, env=env, cwd=ROOT)
        for argv in COMMANDS:
            checks += 1
            py = normalise(run_python(ws, data_dir, argv))
            js = normalise(run_js(ws, " ".join(argv)))
            if py == js:
                passed += 1
                continue
            diff = []
            for i in range(max(len(py), len(js))):
                a = py[i] if i < len(py) else "<missing>"
                b = js[i] if i < len(js) else "<missing>"
                if a != b:
                    diff.append("    line {}\n      python: {!r}\n      js:     {!r}".format(i + 1, a, b))
                if len(diff) >= 3:
                    break
            failures.append("  {} :: os {}\n{}".format(ws, " ".join(argv), "\n".join(diff)))
        shutil.rmtree(data_dir, ignore_errors=True)

    print("\n{} command comparisons across {} workspaces".format(checks, len(workspaces)))
    if failures:
        print("\n{} mismatch(es):\n".format(len(failures)))
        for f in failures[:12]:
            print(f)
        print("\n{} passed, {} failed".format(passed, len(failures)))
        return 1
    print("{} passed, 0 failed".format(passed))
    print("The browser engine and the python engine agree, line for line.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
