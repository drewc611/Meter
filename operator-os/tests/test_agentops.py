#!/usr/bin/env python3
"""
Tests for the agent layer. Plain python, no pytest.

    python3 tests/test_agentops.py

Exits non zero on the first failure count above zero. Every test states what it
proves, so a failure names the rule that broke rather than a line number.
"""

import json
import os
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK_DIR = tempfile.mkdtemp(prefix="agentops-test-")
os.environ["OPERATOR_OS_DATA"] = os.path.join(WORK_DIR, "data")
os.environ["OPERATOR_OS_AGENTS"] = os.path.join(WORK_DIR, "agents")
os.environ["OPERATOR_OS_TODAY"] = "2026-09-06"

sys.path.insert(0, os.path.join(ROOT, "lib"))

import osdata as D  # noqa: E402
import agentops as A  # noqa: E402

REAL_AGENTS = os.path.join(ROOT, "agents")
PASS = []
FAIL = []


def check(name, fn):
    try:
        fn()
    except AssertionError as exc:
        FAIL.append((name, str(exc) or "assertion failed"))
    except Exception as exc:
        FAIL.append((name, "{}: {}".format(type(exc).__name__, exc)))
    else:
        PASS.append(name)


def raises(kind, fn):
    """Return the exception, or fail loudly if the wrong one came back."""
    try:
        fn()
    except kind as exc:
        return exc
    except Exception as exc:
        raise AssertionError("expected {}, got {}: {}".format(
            kind.__name__, type(exc).__name__, exc))
    raise AssertionError("expected {} and nothing was raised".format(kind.__name__))


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def fixture():
    a = os.environ["OPERATOR_OS_AGENTS"]
    shutil.rmtree(a, ignore_errors=True)
    shutil.rmtree(os.environ["OPERATOR_OS_DATA"], ignore_errors=True)
    os.makedirs(os.environ["OPERATOR_OS_DATA"], exist_ok=True)
    write(os.path.join(a, "routing.yml"), """
# fixture table
tiers:
  probe: facts only
  never: no agent, no tier
routes:
  collect_facts: probe   # trailing comment
  summarise: analyst
  set_price: judge
  send_anything: never
""")
    write(os.path.join(a, "ticks", "demo-tick.yml"), """
name: demo-tick
when: "weekly, monday morning"
goal: prove the plan resolves
guardrails:
  - drafts only, never sends
steps:
  - id: facts
    task_class: collect_facts
    run: "os aging"
    finish_line: "the outstanding total is printed"
  - id: verdict
    task_class: set_price
    finish_line: "a price is proposed and not applied"
""")
    write(os.path.join(a, "ticks", "unmapped-tick.yml"), """
name: unmapped-tick
when: "never"
goal: a task class the table does not name
steps:
  - id: mystery
    task_class: read_minds
    finish_line: "nothing, this cannot be planned"
""")
    write(os.path.join(a, "ticks", "walled-tick.yml"), """
name: walled-tick
when: "never"
goal: a step the table forbids outright
steps:
  - id: facts
    task_class: collect_facts
    finish_line: "the figures are printed"
  - id: post_it
    task_class: send_anything
    finish_line: "nothing, this must refuse"
""")


# ---------------------------------------------------------------- the tests

def t_parser():
    t = A.tick("demo-tick")
    assert t["when"] == "weekly, monday morning", t["when"]
    assert t["guardrails"] == ["drafts only, never sends"], t["guardrails"]
    assert len(t["steps"]) == 2, t["steps"]
    assert t["steps"][0]["run"] == "os aging", t["steps"][0]
    assert t["steps"][0]["finish_line"] == "the outstanding total is printed"


def t_routing_shape():
    r = A.routing()
    assert r["routes"]["collect_facts"] == "probe", r["routes"]
    assert r["routes"]["send_anything"] == "never", r["routes"]
    assert r["tiers"]["probe"] == "facts only", r["tiers"]
    assert A.tier_for("set_price") == "judge"


def t_unmapped_class_fails_loudly():
    exc = raises(A.RoutingError, lambda: A.tier_for("read_minds"))
    assert "read_minds" in str(exc), str(exc)
    exc = raises(A.RoutingError, lambda: A.plan("unmapped-tick"))
    assert "read_minds" in str(exc), str(exc)
    missing = A.unmapped_classes()
    assert "read_minds" in missing, missing
    assert "unmapped-tick.mystery" in missing["read_minds"], missing


def t_never_is_refused():
    exc = raises(A.Refused, lambda: A.plan("walled-tick"))
    assert "never" in str(exc).lower(), str(exc)
    assert "post_it" in str(exc), str(exc)
    # The refusal stops the whole plan. walled-tick has a legal step before the
    # forbidden one and the caller still gets nothing back, because a partial
    # plan is how a forbidden step gets run by accident.
    assert A.tick("walled-tick")["steps"][0]["id"] == "facts"


def t_plan_resolves_tiers():
    p = A.plan("demo-tick")
    assert [s["assigned"] for s in p["steps"]] == ["probe", "judge"], p["steps"]
    assert p["steps"][1]["finish_line"], "every step keeps its finish line"


def t_run_round_trip():
    run = A.start_run("demo-tick")
    assert run["run"] == "demo-tick-2026-09-06", run["run"]
    done = A.finish_run(run, {"facts": "probe", "verdict": "judge"})
    assert done["outcome"] == "clean", done["outcome"]
    back = A.runs()
    assert len(back) == 1, back
    assert back[0]["steps"][0]["assigned"] == "probe", back[0]
    assert A.last_outcome("demo-tick") == "clean"
    # a second run the same day gets its own id, it does not overwrite
    second = A.finish_run(A.start_run("demo-tick"), {"facts": "probe"})
    assert second["run"] == "demo-tick-2026-09-06-2", second["run"]
    assert second["outcome"] == "blocked", second["outcome"]


def t_unknown_tier_rejected():
    exc = raises(A.RoutingError,
                 lambda: A.finish_run(A.start_run("demo-tick"), {"facts": "cheap"}))
    assert "cheap" in str(exc), str(exc)


def t_reconcile_risk_and_waste():
    shutil.rmtree(os.environ["OPERATOR_OS_DATA"], ignore_errors=True)
    os.makedirs(os.environ["OPERATOR_OS_DATA"], exist_ok=True)
    # verdict is assigned judge and ran on probe. facts is assigned probe and
    # ran on judge. One run, one of each.
    A.finish_run(A.start_run("demo-tick"), {"facts": "judge", "verdict": "probe"})
    rep = A.reconcile(30)
    assert len(rep["risk"]) == 1, rep["risk"]
    assert len(rep["waste"]) == 1, rep["waste"]
    risk = rep["risk"][0]
    assert risk["step"] == "verdict", risk
    assert risk["assigned"] == "judge" and risk["actual"] == "probe", risk
    waste = rep["waste"][0]
    assert waste["step"] == "facts", waste
    assert waste["assigned"] == "probe" and waste["actual"] == "judge", waste
    assert rep["steps_seen"] == 2, rep["steps_seen"]
    # the two are reported separately and never added together
    assert "total" not in rep, rep.keys()


def t_risk_sorts_before_waste():
    # the waste was recorded first on purpose. Order of arrival must not decide
    # order of reporting.
    findings = A.reconcile(30)["findings"]
    assert findings[0]["kind"] == "RISK", findings
    kinds = [f["kind"] for f in findings]
    assert kinds.index("RISK") < kinds.index("WASTE"), kinds


def t_reconcile_window():
    p = A.runs_path()
    old = {"run": "demo-tick-2020-01-01", "tick": "demo-tick",
           "started": "2020-01-01T09:00:00Z", "finished": "2020-01-01T09:05:00Z",
           "steps": [{"id": "verdict", "task_class": "set_price",
                      "assigned": "judge", "actual": "probe", "ok": True, "note": ""}],
           "outcome": "clean"}
    with open(p, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(old) + "\n")
    near = A.reconcile(30)
    far = A.reconcile(4000)
    assert len(near["risk"]) == 1, near["risk"]
    assert len(far["risk"]) == 2, far["risk"]


def t_work_registry_round_trip():
    row = A.add_work("Chase Okonkwo", kind="money", tick_name="money-tick")
    assert row["id"] == "w0001", row
    assert row["status"] == "open" and row["opened"] == "2026-09-06", row
    rows = A.work_registry()
    assert len(rows) == 1 and rows[0]["title"] == "Chase Okonkwo", rows
    second = A.add_work("Reprice the callout", kind="control")
    assert second["id"] == "w0002", second
    assert len(A.work_registry(kind="money")) == 1
    closed = A.close_work("w0001")
    assert closed["status"] == "done" and closed["closed"] == "2026-09-06", closed
    assert A.work_registry(status="open")[0]["id"] == "w0002"
    assert A.close_work("w9999") is None, "closing a row that is not there returns nothing"
    raises(A.AgentsError, lambda: A.add_work("bad kind", kind="vibes"))
    raises(A.AgentsError, lambda: A.add_work("", kind="money"))
    # the change is in the event log with its cause
    import events as E
    entries = [e for e in E.read() if e.get("entity") == "work"]
    assert len(entries) == 3, entries
    assert entries[0]["cause"], "every mutation carries a cause"


def t_shipped_files_hold():
    """The real agents/ folder, not the fixture."""
    os.environ["OPERATOR_OS_AGENTS"] = REAL_AGENTS
    try:
        names = [t["name"] for t in A.ticks()]
        for wanted in ("money-tick", "work-tick", "demand-tick", "close-tick",
                       "prove-tick"):
            assert wanted in names, "{} is missing from {}".format(wanted, names)
        assert A.unmapped_classes() == {}, A.unmapped_classes()
        r = A.routing()
        assert "never" in r["routes"].values(), "the table must have a never tier"
        for t in A.ticks():
            p = A.plan(t)
            assert p["steps"], "{} has no steps".format(t["name"])
            for s in p["steps"]:
                assert s["id"], "{} has a step with no id".format(t["name"])
                assert s["finish_line"], "{}.{} has no finish line".format(
                    t["name"], s["id"])
                assert s["assigned"] in A.TIERS, s
            assert len(t["guardrails"]) >= 2, "{} needs guardrails".format(t["name"])
        roster = sorted(f for f in os.listdir(A.roster_dir()) if f.endswith(".md"))
        assert roster == ["analyst.md", "judge.md", "probe.md"], roster
    finally:
        os.environ["OPERATOR_OS_AGENTS"] = os.path.join(WORK_DIR, "agents")


def main():
    fixture()
    for name, fn in [
        ("the tick parser reads a tick file", t_parser),
        ("the routing table loads with its never tier", t_routing_shape),
        ("an unmapped task class fails loudly", t_unmapped_class_fails_loudly),
        ("a step routed to never is refused", t_never_is_refused),
        ("a plan resolves every step to a tier", t_plan_resolves_tiers),
        ("a run round trips through runs.jsonl", t_run_round_trip),
        ("a tier name that is not a tier is rejected", t_unknown_tier_rejected),
        ("reconcile flags risk and waste separately", t_reconcile_risk_and_waste),
        ("risk sorts before waste", t_risk_sorts_before_waste),
        ("reconcile honours its window", t_reconcile_window),
        ("the work registry round trips", t_work_registry_round_trip),
        ("the shipped ticks and roster hold", t_shipped_files_hold),
    ]:
        check(name, fn)

    print("")
    for name in PASS:
        print("  ok    {}".format(name))
    for name, why in FAIL:
        print("  FAIL  {}".format(name))
        print("        {}".format(why))
    print("\n  {} passed, {} failed".format(len(PASS), len(FAIL)))
    print("  data used: {}\n".format(WORK_DIR))
    if not FAIL:
        shutil.rmtree(WORK_DIR, ignore_errors=True)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
