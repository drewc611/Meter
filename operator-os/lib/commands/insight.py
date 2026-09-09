"""Query, simulation and anomaly commands."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.dirname(HERE)
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402
import query as Q  # noqa: E402
import risk as R  # noqa: E402

BAR = "-" * 62


def head(t):
    print("\n" + t)
    print(BAR)


MONEYISH = ("amount", "total", "value", "revenue", "cost", "profit", "budget",
            "rate", "outstanding", "billed", "annual", "weighted")


def _fmt(col, v):
    if any(m in col for m in MONEYISH) and str(v).replace(".", "").replace("-", "").isdigit():
        return D.money(D.cents(v), D.sym())
    return str(v)


def cmd_query(args):
    if not args or args[0] in ("--help", "-h"):
        print("""
os query "select <columns> from <registry> [where ...] [order by ... [desc]] [limit n]"

  Registries: {regs}

  Conditions take = != < > <= >=, and, or, not, in (a, b), like '%text%'.
  Dates accept today, today-30, today+14 or a plain 2026-09-06.

  Virtual columns are computed for you. To see them:  os query --columns <registry>

  Examples:
    os query "select number, contact_name, open_amount, days_late from invoices where days_late > 30 order by open_amount desc"
    os query "select name, outstanding, median_pay_lag from contacts where outstanding > 0"
    os query "select name, margin_pct, hours from projects where status = done order by margin_pct"
    os query "select label, annual from recurring where type = cost order by annual desc"
""".format(regs=", ".join(D.SCHEMA)))
        return 0
    if args[0] == "--columns":
        ent = args[1] if len(args) > 1 else None
        if ent not in D.SCHEMA:
            print("Pick a registry: " + ", ".join(D.SCHEMA))
            return 1
        head("Columns on {}".format(ent))
        print("  stored:   " + ", ".join(D.SCHEMA[ent]["cols"]))
        print("  computed: " + ", ".join(sorted(Q.virtuals(ent))))
        print("")
        return 0
    text = " ".join(args)
    try:
        cols, rows = Q.run(text)
    except ValueError as exc:
        print("\n  " + str(exc) + "\n")
        return 1
    if not rows:
        print("\n  No rows match.\n")
        return 0
    widths = {}
    shown = [{c: _fmt(c, r[c]) for c in cols} for r in rows]
    for c in cols:
        widths[c] = max(len(c), max(len(str(r[c])) for r in shown))
    head("{} row{}".format(len(rows), "" if len(rows) == 1 else "s"))
    print("  " + "  ".join(c.ljust(widths[c]) for c in cols))
    print("  " + "  ".join("-" * widths[c] for c in cols))
    for r in shown:
        print("  " + "  ".join(str(r[c]).ljust(widths[c]) for c in cols))
    print("")
    return 0


def cmd_sim(args):
    trials = 2000
    horizon = 90
    for a in args:
        if a.startswith("--trials="):
            trials = max(200, min(20000, int(a.split("=")[1])))
        elif a.isdigit():
            horizon = int(a)
    s = D.sym()
    buf = D.cents(D.config().get("cash_buffer"))
    r = R.simulate(trials=trials, horizon=horizon, buffer_cents=buf)
    head("Cash simulation   {} runs over {} days".format(r["trials"], r["horizon"]))
    print("  {:<12} {:>14} {:>14} {:>14}".format("", "bad case", "middle", "good case"))
    print("  {:<12} {:>14} {:>14} {:>14}".format("", "1 in 10", "half the time", "1 in 10"))
    for k, label in (("d30", "day 30"), ("d60", "day 60"), ("d90", "day 90"),
                     ("low", "lowest")):
        if k not in r:
            continue
        print("  {:<12} {:>14} {:>14} {:>14}".format(
            label, D.money(r[k]["p10"], s), D.money(r[k]["p50"], s),
            D.money(r[k]["p90"], s)))
    print("")
    if r["ruin_pct"] > 0:
        print("  You run out of money in {}% of runs.".format(r["ruin_pct"]))
        if r["ruin_day_p50"] is not None:
            print("  When it happens, it usually happens around day {}.".format(
                r["ruin_day_p50"]))
    else:
        print("  You do not run out of money in any of {} runs.".format(r["trials"]))
    if buf and r["buffer_breach_pct"]:
        print("  You drop below your {} buffer in {}% of runs.".format(
            D.money(buf, s), r["buffer_breach_pct"]))
    print("\n  Modelled: {} unpaid invoices, {} open deals, {} a week of overhead.".format(
        r["invoices_modelled"], r["deals_modelled"], D.money(r["overhead_per_week"], s)))
    print("  Payment timing comes from each customer's own history where there is any.")
    print("")
    return 0


def cmd_whatfirst(args):
    s = D.sym()
    trials = 800
    for a in args:
        if a.startswith("--trials="):
            trials = max(200, min(5000, int(a.split("=")[1])))
    base, rows = R.sensitivity(trials=trials)
    head("What to chase first")
    if base["ruin_pct"] == 0:
        print("  You do not run out of money in any run, so nothing here is urgent")
        print("  for survival. The ranking below is by how much each collection")
        print("  lifts your bad case at day 90.\n")
    else:
        print("  Right now you run out of money in {}% of runs.".format(base["ruin_pct"]))
        print("  Each line shows what happens to that number if this one gets paid.\n")
    print("  {:<10} {:<20} {:>11}  {:>16}  {:>14}".format(
        "invoice", "customer", "amount", "risk of running out", "bad case gain"))
    for r in rows:
        print("  {:<10} {:<20} {:>11}  {:>7}% to {:>5}%  {:>14}".format(
            r["number"], r["who"][:20], D.money(r["amount"], s),
            r["ruin_before"], r["ruin_after"], D.money(r["p10_gain"], s)))
    print("\n  Ranked by the change in odds, not by the size of the invoice.")
    print("  The biggest invoice is often not the one that matters most.\n")
    return 0


def cmd_anomalies(args):
    found = R.anomalies()
    if not found:
        print("\n  Nothing unusual. That is a real result, not an empty one.\n")
        return 0
    head("{} thing{} worth a look".format(len(found), "" if len(found) == 1 else "s"))
    for f in found:
        print("  [{}] {}".format(f["severity"], f["what"]))
        print("        {}".format(f["evidence"]))
    print("\n  These are statistical flags, not accusations. Each one is a question.\n")
    return 0


def register(reg):
    blurb = "asking the data questions"
    reg.add("query", cmd_query, group="insight", summary="run a query over any registry", group_blurb=blurb)
    reg.add("sim", cmd_sim, group="insight", summary="cash simulation with the odds attached", group_blurb=blurb)
    reg.add("whatfirst", cmd_whatfirst, group="insight", summary="which single collection changes the odds most", group_blurb=blurb)
    reg.add("anomalies", cmd_anomalies, group="insight", summary="statistical flags across the whole business", group_blurb=blurb)
