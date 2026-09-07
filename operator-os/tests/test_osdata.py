#!/usr/bin/env python3
"""
Tests for the data engine's own defenses: cells that could open as a formula
in a spreadsheet, and money text that doesn't parse.

    python3 tests/test_osdata.py

Exits 0 when everything passes and non zero when anything does not. Runs
against a throwaway data folder, so your own data/ is never touched.
"""

import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIB = os.path.join(ROOT, "lib")

SCRATCH = tempfile.mkdtemp(prefix="operator-os-osdata-")
os.environ["OPERATOR_OS_DATA"] = SCRATCH
sys.path.insert(0, LIB)

import osdata as D  # noqa: E402

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


def fresh():
    shutil.rmtree(SCRATCH, ignore_errors=True)
    os.makedirs(SCRATCH)


def test_cents_never_raises_on_garbled_text():
    section("D.cents() treats garbled text as 0 instead of crashing")
    for bad in ("1.2.3", "--5", "..", "-", "$-.-", "not a number"):
        try:
            got = D.cents(bad)
        except Exception as exc:
            check(False, "cents({!r}) does not raise".format(bad),
                  "{}: {}".format(type(exc).__name__, exc))
            continue
        check(got == 0, "cents({!r}) == 0, got {}".format(bad, got))
    check(D.cents("12.34") == 1234, "a real amount still parses correctly")
    check(D.cents("-45.00") == -4500, "a real negative amount still parses correctly")


def test_formula_leading_cells_are_quoted_on_write():
    section("A free-text cell that opens as a formula is quoted before it hits disk")
    fresh()
    for payload in ("=cmd|'/c calc'!A1", "+1+1", "-2+3", "@SUM(1,1)", "\t=1+1"):
        D.put("expenses", {"date": "2026-08-01", "vendor": payload,
                            "category": "misc", "amount": "10.00"})
        row = D.load("expenses")[-1]
        check(row["vendor"].startswith("'"),
              "{!r} is quoted before it reaches expenses.csv".format(payload),
              "stored as {!r}".format(row["vendor"]))
        check(row["vendor"][1:] == payload,
              "the quote is the only thing added, the text itself is untouched",
              "stored as {!r}".format(row["vendor"]))


def test_money_and_id_columns_are_never_quoted():
    section("Money, id, and reference columns are never touched by the formula guard")
    fresh()
    row = D.put("expenses", {"date": "2026-08-02", "vendor": "Refund Co",
                              "category": "misc", "amount": "-45.00"})
    check(row["amount"] == "-45.00",
          "a negative amount is stored exactly as given", row["amount"])
    check(D.load("expenses")[-1]["id"].startswith("e") and "'" not in D.load("expenses")[-1]["id"],
          "the row's own id is never quoted")


def test_plain_free_text_is_unaffected():
    section("Ordinary free text round-trips exactly as written")
    fresh()
    row = D.put("expenses", {"date": "2026-08-03", "vendor": "Office Depot",
                              "category": "supplies", "amount": "12.00",
                              "notes": "printer paper and toner"})
    check(row["notes"] == "printer paper and toner",
          "plain notes are stored unchanged", row["notes"])


TESTS = [
    test_cents_never_raises_on_garbled_text,
    test_formula_leading_cells_are_quoted_on_write,
    test_money_and_id_columns_are_never_quoted,
    test_plain_free_text_is_unaffected,
]


def main():
    print("Data engine tests. Scratch data folder: {}".format(SCRATCH))
    broken = 0
    for fn in TESTS:
        try:
            fn()
        except Exception as exc:
            broken += 1
            print("\n  FAIL  {} raised {}: {}".format(fn.__name__, type(exc).__name__, exc))
            import traceback
            traceback.print_exc()

    failed = [r for r in RESULTS if not r[0]]
    print("\n" + "-" * 62)
    print("{} checks, {} passed, {} failed, {} test(s) crashed".format(
        len(RESULTS), len(RESULTS) - len(failed), len(failed), broken))
    shutil.rmtree(SCRATCH, ignore_errors=True)
    return 1 if (failed or broken) else 0


if __name__ == "__main__":
    sys.exit(main())
