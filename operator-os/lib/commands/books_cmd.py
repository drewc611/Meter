"""Double entry commands."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.dirname(HERE)
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402
import books as B  # noqa: E402

BAR = "-" * 62


def head(t):
    print("\n" + t)
    print(BAR)


def _need_books():
    if not os.path.exists(os.path.join(D.DATA, "accounts.csv")):
        print("The books are not set up yet. Run `os migrate` first.")
        return False
    return True


def cmd_books(args):
    if not _need_books():
        return 1
    sub = args[0] if args else "trial"
    s = D.sym()

    if sub == "post":
        n = B.post()
        print("Posted {} lines from your registries, kept {} manual lines.".format(
            n["derived"], n["manual"]))
        print("Finish line: run `os books check`.")
        return 0

    if sub == "check":
        problems, notes = B.check()
        head("Books check")
        for n in notes:
            print("  ok    " + n)
        for p in problems:
            print("  WRONG " + p)
        print("\n  " + ("The books agree with the reports."
                        if not problems else
                        "Fix the lines marked WRONG, then run `os books post` and check again."))
        print("")
        return 0 if not problems else 1

    if sub in ("pnl", "profit"):
        frm = args[1] if len(args) > 1 else None
        to = args[2] if len(args) > 2 else None
        r = B.pnl(frm, to)
        head("Profit and loss{}".format(
            "  {} to {}".format(frm or "the beginning", to or "today")))
        for row in r["income"]:
            print("  {:<34} {:>14}".format(row["name"], D.money(row["amount"], s)))
        print("  {:<34} {:>14}".format("income", D.money(r["total_income"], s)))
        print("")
        for row in r["expense"]:
            print("  {:<34} {:>14}".format(row["name"], D.money(row["amount"], s)))
        print("  {:<34} {:>14}".format("costs", D.money(r["total_expense"], s)))
        print("\n  {:<34} {:>14}   {:.1f}%".format(
            "profit", D.money(r["profit"], s), r["margin_pct"]))
        print("")
        return 0

    if sub in ("balance", "sheet"):
        upto = args[1] if len(args) > 1 else None
        r = B.balance_sheet(upto)
        head("Balance sheet{}".format("  as at " + upto if upto else ""))
        print("  what you have")
        for row in r["assets"]:
            print("    {:<32} {:>14}".format(row["name"], D.money(row["amount"], s)))
        print("    {:<32} {:>14}".format("total", D.money(r["total_assets"], s)))
        print("\n  what you owe")
        for row in r["liabilities"]:
            print("    {:<32} {:>14}".format(row["name"], D.money(row["amount"], s)))
        print("    {:<32} {:>14}".format("total", D.money(r["total_liabilities"], s)))
        print("\n  what is yours")
        for row in r["equity"]:
            print("    {:<32} {:>14}".format(row["name"], D.money(row["amount"], s)))
        print("    {:<32} {:>14}".format("profit this period", D.money(r["retained"], s)))
        print("    {:<32} {:>14}".format(
            "total", D.money(r["total_equity"] + r["retained"], s)))
        print("\n  {:<34} {}".format(
            "balances", "yes" if r["check"] == 0 else
            "NO, out by " + D.money(r["check"], s)))
        print("")
        return 0

    if sub == "accounts":
        head("Chart of accounts")
        for code, a in B.accounts().items():
            print("  {:<6} {:<28} {:<10} {}".format(code, a["name"], a["kind"], a["notes"]))
        print("")
        return 0

    if sub == "entry":
        rows = B.journal()
        key = args[1] if len(args) > 1 else None
        head("Journal" + ("  " + key if key else ""))
        shown = 0
        for r in rows:
            if key and key not in (r["entry"], r["source_id"], r["account"]):
                continue
            print("  {:<10} {:<11} {:<6} {:>12} {:>12}  {}".format(
                r["entry"], r["date"], r["account"],
                D.money(D.cents(r["debit"]), s) if r["debit"] else "",
                D.money(D.cents(r["credit"]), s) if r["credit"] else "",
                r["memo"][:28]))
            shown += 1
            if shown >= 60 and not key:
                print("  ... {} more lines, pass an entry or account to narrow it".format(
                    len(rows) - shown))
                break
        print("")
        return 0

    # default: trial balance
    rows = B.trial_balance(args[1] if len(args) > 1 else None)
    head("Trial balance")
    print("  {:<6} {:<30} {:>13} {:>13}".format("code", "account", "debit", "credit"))
    td = tc = 0
    for r in rows:
        td += r["debit"]
        tc += r["credit"]
        print("  {:<6} {:<30} {:>13} {:>13}".format(
            r["code"], r["name"],
            D.money(r["debit"], s) if r["debit"] else "",
            D.money(r["credit"], s) if r["credit"] else ""))
    print("  {:<6} {:<30} {:>13} {:>13}".format("", "", D.money(td, s), D.money(tc, s)))
    print("\n  {}".format("Balanced." if td == tc else
                          "NOT balanced, out by " + D.money(td - tc, s)))
    print("\n  Subcommands: post, check, pnl, balance, accounts, entry\n")
    return 0


def register(reg):
    reg.add("books", cmd_books, group="books",
            summary="trial balance, profit and loss, balance sheet, and the proof they tie",
            group_blurb="proper accounts, derived from the rows you already keep")
