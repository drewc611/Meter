#!/usr/bin/env python3
"""
Tests for the adapter layer. Plain python, no test framework.

    python3 tests/test_adapters.py

Exits 0 when everything passes and non zero when anything does not. Every test
runs against a throwaway data folder, so your own data/ is never touched. The
folder is printed if a test fails, so you can go and look at what happened.
"""

import hashlib
import importlib.util
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIB = os.path.join(ROOT, "lib")
SAMPLES = os.path.join(ROOT, "adapters", "samples")

SCRATCH = tempfile.mkdtemp(prefix="operator-os-adapters-")
os.environ["OPERATOR_OS_DATA"] = SCRATCH
os.environ.pop("OPERATOR_OS_ALLOW_NETWORK", None)
sys.path.insert(0, LIB)

import osdata as D      # noqa: E402
import adapters as A    # noqa: E402

D.DATA = SCRATCH

RESULTS = []


def check(ok, label, detail=""):
    RESULTS.append((bool(ok), label, detail))
    print("  {}  {}".format("pass" if ok else "FAIL", label))
    if not ok and detail:
        print("        " + str(detail))
    return bool(ok)


def section(title):
    print("\n" + title)
    print("-" * 62)


def _migration(number_prefix):
    for f in sorted(os.listdir(os.path.join(ROOT, "migrations"))):
        if f.startswith(number_prefix) and f.endswith(".py"):
            path = os.path.join(ROOT, "migrations", f)
            spec = importlib.util.spec_from_file_location("mig_test_" + f[:-3], path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod
    raise RuntimeError("no migration starting " + number_prefix)


def fresh():
    """A brand new business in the scratch folder, with the import ledger on it."""
    shutil.rmtree(SCRATCH, ignore_errors=True)
    os.makedirs(SCRATCH)
    with open(os.path.join(ROOT, "workspaces", "01-field-service", "seed.json"),
              "r", encoding="utf-8") as fh:
        seed = json.load(fh)
    D.render_seed(seed, log=True)
    _migration("003").up(SCRATCH)


def sample(name):
    return os.path.join(SAMPLES, name)


def snapshot():
    """Content hash of every file in the data folder."""
    out = {}
    for base, _dirs, files in os.walk(SCRATCH):
        for f in files:
            p = os.path.join(base, f)
            with open(p, "rb") as fh:
                out[os.path.relpath(p, SCRATCH)] = hashlib.sha256(fh.read()).hexdigest()
    return out


# ---------------------------------------------------------------- tests

EXPECTED_SNIFF = [
    ("bank-statement.csv", "bank-csv"),
    ("bank-statement-signed.csv", "bank-csv"),
    ("stripe-balance.csv", "stripe-csv"),
    ("quickbooks-ledger.csv", "quickbooks-csv"),
    ("work-week.ics", "calendar-ics"),
    ("inbox.mbox", "mailbox-mbox"),
]


def test_sniff_picks_the_right_adapter():
    section("sniff picks the right adapter for each sample")
    fresh()
    for fname, want in EXPECTED_SNIFF:
        scored = A.sniff_all(sample(fname))
        best, score, _title = scored[0]
        check(best == want and score >= 0.5,
              "{} goes to {}".format(fname, want),
              "got {} at {:.2f}, full scores {}".format(best, score, scored))
        runner_up = scored[1][1] if len(scored) > 1 else 0.0
        check(score - runner_up >= 0.2,
              "{} is not a close call".format(fname),
              "best {:.2f}, next {:.2f}".format(score, runner_up))


def test_pull_writes_nothing():
    section("pull is read only")
    fresh()
    before = snapshot()
    for name, fname in [("bank-csv", "bank-statement.csv"),
                        ("bank-csv", "bank-statement-signed.csv"),
                        ("stripe-csv", "stripe-balance.csv"),
                        ("quickbooks-csv", "quickbooks-ledger.csv"),
                        ("calendar-ics", "work-week.ics"),
                        ("mailbox-mbox", "inbox.mbox")]:
        proposals = A.pull(name, sample(fname))
        check(len(proposals) >= 0, "{} pulled {} proposals".format(name, len(proposals)))
    after = snapshot()
    changed = sorted(k for k in set(before) | set(after)
                     if before.get(k) != after.get(k))
    check(not changed, "no file in the data folder changed",
          "these changed: {}".format(", ".join(changed)))


def test_apply_is_idempotent():
    section("apply twice imports nothing the second time")
    fresh()
    first = A.apply("bank-csv", A.pull("bank-csv", sample("bank-statement.csv")))
    expenses_after_first = len(D.load("expenses"))
    ledger_after_first = len(A.imports_ledger())
    check(len(first["created"]) > 0, "first run created rows",
          "created {}".format(len(first["created"])))

    second = A.apply("bank-csv", A.pull("bank-csv", sample("bank-statement.csv")))
    check(len(second["created"]) == 0, "second run created nothing",
          "created {}".format(len(second["created"])))
    check(len(second["matched"]) == 0, "second run matched nothing again",
          "matched {}".format(len(second["matched"])))
    check(len(second["skipped"]) == len(first["created"]) + len(first["matched"]),
          "second run skipped exactly what the first run imported")
    check(len(D.load("expenses")) == expenses_after_first,
          "expense count did not move on the second run")
    check(len(A.imports_ledger()) == ledger_after_first,
          "the ledger did not grow on the second run")

    for _p, row in first["created"]:
        found = D.find_row("expenses", row["id"])
        if found is None:
            check(False, "created row {} is on disk".format(row["id"]))
            break
    else:
        check(True, "every created row is on disk")

    import events as E
    causes = {e.get("cause") for e in E.read(entity="expenses")}
    check("imported from bank-csv" in causes,
          "the event log carries the cause 'imported from bank-csv'",
          sorted(causes))


def test_bank_credit_matches_an_open_invoice():
    section("a bank credit equal to an open invoice becomes a match")
    fresh()
    open_totals = {D.cents(i["total"]): i for i in D.load("invoices")
                   if D.invoice_open_cents(i) > 0}
    target = open_totals.get(D.cents("3900.00"))
    check(target is not None, "the sample workspace has an unpaid 3900.00 invoice")

    proposals = A.pull("bank-csv", sample("bank-statement.csv"))
    hits = [p for p in proposals if p["entity"] == "invoices" and p["action"] == "match"]
    check(len(hits) == 1, "one credit matched an invoice", "got {}".format(len(hits)))
    if hits and target:
        check(hits[0]["match_id"] == target["id"],
              "it matched {}".format(target["id"]),
              "matched {}".format(hits[0]["match_id"]))
    check(not any(p["entity"] == "invoices" and p["action"] == "create"
                  for p in proposals),
          "no invoice was proposed for creation")

    result = A.apply("bank-csv", proposals)
    check(len(D.load("invoices")) == len(open_totals) + len(
        [i for i in D.load("invoices") if D.invoice_open_cents(i) <= 0]),
        "applying did not add an invoice row")
    if target:
        still = D.find_row("invoices", target["id"])
        check(still["status"] == target["status"] and not still["paid_on"],
              "the matched invoice was not marked paid behind your back")
        line = [r for r in A.imports_ledger() if r["row_id"] == target["id"]]
        check(line and line[0]["status"] == "pending",
              "the match is in the ledger as pending, waiting on a person",
              line)
    check(len(result["matched"]) == 1, "apply reported one match")


def test_mbox_skips_do_not_contact():
    section("the mailbox adapter refuses do_not_contact")
    fresh()
    blocked_addr = "gspeck@example.com"
    D.put("contacts", {"name": "Gordon Speck", "email": blocked_addr,
                       "status": "do_not_contact", "source": "email"},
          cause="test setup")

    rec = A.get("mailbox-mbox")
    reason = rec["module"].blocked(blocked_addr, D.load("contacts"))
    check(reason == "do_not_contact",
          "the adapter names do_not_contact as the reason", reason)

    proposals = A.pull("mailbox-mbox", sample("inbox.mbox"))
    emails = [p["row"].get("email") for p in proposals]
    check(blocked_addr not in emails,
          "no proposal for the blocked address", emails)
    check("hashworth@example.com" not in emails,
          "no proposal for someone already in contacts")
    check("noreply@billing.example.com" not in emails,
          "no proposal for an automated sender")
    check("dale.frantz@example.com" in emails,
          "a genuinely new sender is still proposed", emails)
    check(all(p["row"].get("source") == "email" for p in proposals),
          "every proposed contact has source email")

    blob = json.dumps(proposals)
    check("BODYTEXTMARKER" not in blob,
          "nothing from a message body reached a row")


def test_matcher_finds_a_duplicate():
    section("the matcher catches money already in the books")
    fresh()
    D.put("expenses", {"date": "2026-08-03", "vendor": "Northgate Supply Co",
                       "category": "materials", "amount": "842.50",
                       "billable": "no"}, cause="test setup")
    rid, conf = A.find_existing("expenses", {
        "date": "2026-08-04", "vendor": "NORTHGATE SUPPLY CO", "amount": "842.50"})
    check(rid is not None and conf >= 0.6,
          "same money, one day apart, same vendor is a match",
          "{} at {}".format(rid, conf))
    miss, _c = A.find_existing("expenses", {
        "date": "2026-08-04", "vendor": "NORTHGATE SUPPLY CO", "amount": "843.50"})
    check(miss is None, "a different amount is not a match", miss)
    far, _c = A.find_existing("expenses", {
        "date": "2026-09-30", "vendor": "NORTHGATE SUPPLY CO", "amount": "842.50"})
    check(far is None, "the same amount a month later is not a match", far)

    proposals = A.pull("bank-csv", sample("bank-statement.csv"))
    dupes = [p for p in proposals if p["action"] == "match" and p["entity"] == "expenses"]
    check(len(dupes) == 1, "the bank line for it comes back as a match, not a create",
          "got {}".format(len(dupes)))


def test_calendar_only_proposes_matched_projects():
    section("the calendar adapter proposes time and nothing else")
    fresh()
    proposals = A.pull("calendar-ics", sample("work-week.ics"))
    check(all(p["entity"] == "time" for p in proposals),
          "every proposal is a time entry",
          sorted({p["entity"] for p in proposals}))
    notes = " ".join(p["row"].get("notes", "") for p in proposals)
    check("Dentist" not in notes and "Lunch" not in notes,
          "personal events produced nothing", notes)
    check("warranty check" not in notes,
          "the all day event produced nothing, because it has no duration")
    projects = {p["row"]["project_id"] for p in proposals}
    known = {p["id"] for p in D.load("projects")}
    check(projects <= known, "every time entry points at a real project", projects)
    check(all(int(p["row"]["minutes"]) > 0 for p in proposals),
          "every time entry has real minutes")


def test_network_is_refused():
    section("an adapter that wants the network is refused")
    fresh()
    fake = {"name": "somewhere-api", "network": True, "error": ""}
    try:
        A.gate(fake)
        check(False, "gate refused it", "it did not refuse")
    except A.AdapterError as exc:
        check("OPERATOR_OS_ALLOW_NETWORK" in str(exc),
              "the refusal names the switch that would allow it", str(exc))
    os.environ["OPERATOR_OS_ALLOW_NETWORK"] = "1"
    try:
        check(A.gate(fake) is True, "it runs once the operator opts in")
    except A.AdapterError as exc:
        check(False, "it runs once the operator opts in", str(exc))
    finally:
        os.environ.pop("OPERATOR_OS_ALLOW_NETWORK", None)
    check(all(not r["network"] for r in A.discover()),
          "no adapter shipped here declares network True",
          [r["name"] for r in A.discover() if r["network"]])


def test_forget_lets_an_import_be_redone():
    section("forget clears the way for a redo")
    fresh()
    A.apply("bank-csv", A.pull("bank-csv", sample("bank-statement.csv")))
    line = A.imports_ledger()[0]
    ext = line["external_id"]
    check(A.already_imported(ext, "bank-csv") is not None,
          "the ledger blocks a second import of {}".format(ext[:24]))
    A.forget(ext)
    check(A.already_imported(ext, "bank-csv") is None,
          "after forget, nothing blocks it")
    again = [r for r in A.imports_ledger() if r["external_id"] == ext]
    check(len(again) == 1 and again[0]["status"] == "ignored",
          "the ledger line is still there, marked ignored", again)


def test_bad_proposals_are_rejected():
    section("a proposal that breaks the contract is rejected")
    fresh()
    bad = [
        ("no external_id", "external_id",
         {"entity": "expenses", "row": {}, "action": "create", "confidence": 0.5,
          "why": "x"}),
        ("an entity that is not a registry", "registry",
         {"external_id": "a", "entity": "nowhere", "row": {}, "action": "create",
          "confidence": 0.5, "why": "x"}),
        ("a column the registry does not have", "columns",
         {"external_id": "a", "entity": "expenses", "row": {"colour": "red"},
          "action": "create", "confidence": 0.5, "why": "x"}),
        ("an action nobody defined", "action",
         {"external_id": "a", "entity": "expenses", "row": {}, "action": "invent",
          "confidence": 0.5, "why": "x"}),
        ("a match against a row that does not exist", "not in the file",
         {"external_id": "a", "entity": "invoices", "row": {}, "action": "match",
          "match_id": "i9999", "confidence": 0.5, "why": "x"}),
        ("a confidence outside 0 to 1", "confidence",
         {"external_id": "a", "entity": "expenses", "row": {}, "action": "create",
          "confidence": 7, "why": "x"}),
        ("no reason a human could check", "reason",
         {"external_id": "a", "entity": "expenses", "row": {}, "action": "create",
          "confidence": 0.5, "why": ""}),
    ]
    for label, fragment, proposal in bad:
        try:
            A._check(proposal, 0)
            check(False, "rejects " + label, "it was accepted")
        except A.AdapterError as exc:
            check(fragment in str(exc), "rejects " + label, str(exc))


TESTS = [
    test_sniff_picks_the_right_adapter,
    test_pull_writes_nothing,
    test_apply_is_idempotent,
    test_bank_credit_matches_an_open_invoice,
    test_mbox_skips_do_not_contact,
    test_matcher_finds_a_duplicate,
    test_calendar_only_proposes_matched_projects,
    test_network_is_refused,
    test_forget_lets_an_import_be_redone,
    test_bad_proposals_are_rejected,
]


def main():
    print("Adapter tests. Scratch data folder: {}".format(SCRATCH))
    broken = 0
    for fn in TESTS:
        try:
            fn()
        except Exception as exc:
            broken += 1
            print("\n  FAIL  {} raised {}: {}".format(fn.__name__, type(exc).__name__, exc))
            import traceback
            traceback.print_exc()
    passed = sum(1 for ok, _l, _d in RESULTS if ok)
    failed = len(RESULTS) - passed
    print("\n" + "-" * 62)
    print("{} checks, {} passed, {} failed, {} test(s) crashed".format(
        len(RESULTS), passed, failed, broken))
    if failed or broken:
        print("Scratch folder left at {} so you can look.".format(SCRATCH))
        return 1
    shutil.rmtree(SCRATCH, ignore_errors=True)
    print("Everything the adapters claim, checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
