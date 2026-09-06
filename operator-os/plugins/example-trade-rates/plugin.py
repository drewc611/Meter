"""
Trade rate card.

Proves a plugin can add a table without touching the core schema. The migration
in migrations/001_rates.py creates data/rates.csv. This module reads and writes
that one file through ctx.table(), which allows it because the plugin's own
migration created it.

Capabilities: commands, migrations. Not writes. Ask it to touch contacts.csv and
the data layer raises with this plugin's name in the message.
"""

COLS = ["code", "label", "unit", "rate", "notes"]

USAGE = """
os rates                     the rate card
os rates set <code> <rate>   change one rate
"""


def register(reg, ctx):

    def table():
        return ctx.table("rates", COLS)

    def show(rate, unit, symbol):
        if unit == "percent":
            return "{}%".format(rate or "0.00")
        return ctx.data.money(ctx.data.cents(rate), symbol)

    def missing():
        print("\n  No rate card yet. data/rates.csv has not been created.")
        print("  Run:  os plugin migrate example-trade-rates\n")
        return 1

    def cmd_rates(args):
        t = table()
        if args and args[0] == "set":
            return set_rate(t, args[1:])
        if args and args[0] in ("-h", "--help"):
            print(USAGE)
            return 0
        if args:
            print("\n  '{}' is not a rates subcommand.".format(args[0]))
            print(USAGE)
            return 1
        if not t.exists():
            return missing()
        rows = t.read()
        symbol = ctx.data.sym()
        print("\nRate card   {} rate{}   {}".format(
            len(rows), "" if len(rows) == 1 else "s", t.path))
        print("-" * 62)
        print("  {:<12} {:<28} {:<8} {:>9}".format("code", "label", "unit", "rate"))
        for r in rows:
            print("  {:<12} {:<28} {:<8} {:>9}".format(
                r["code"], r["label"][:28], r["unit"],
                show(r["rate"], r["unit"], symbol)))
        for r in rows:
            if r.get("notes"):
                print("  {:<12} {}".format(r["code"], r["notes"]))
        print("\n  os rates set <code> <rate>   change one\n")
        return 0

    def set_rate(t, args):
        if len(args) < 2:
            print("\n  os rates set <code> <rate>      for example: os rates set LABOUR 105.00\n")
            return 1
        if not t.exists():
            return missing()
        code = args[0].strip().upper()
        rows = t.read()
        target = None
        for r in rows:
            if r["code"].upper() == code:
                target = r
                break
        if target is None:
            print("\n  No rate '{}'. Codes on the card: {}\n".format(
                args[0], ", ".join(r["code"] for r in rows)))
            return 1
        symbol = ctx.data.sym()
        before = target["rate"]
        asked = ctx.data.cents(args[1])
        if asked <= 0:
            print("\n  '{}' reads as {}. A rate of zero or less is refused here.".format(
                args[1], ctx.data.plain(asked)))
            print("  Edit rates.csv by hand if you no longer charge for {}.\n".format(code))
            return 1
        new = ctx.data.plain(asked)
        target["rate"] = new
        t.write(rows)
        print("\n{}  {}".format(code, target["label"]))
        print("  was  {}".format(show(before, target["unit"], symbol)))
        print("  now  {}".format(show(new, target["unit"], symbol)))
        print("  written to {}".format(t.path))
        print("\n  Finish line: run `os rates` and read the {} line.\n".format(code))
        return 0

    reg.add("rates", cmd_rates,
            group="plugin",
            summary="the rate card, and one command to change a rate",
            group_blurb="added by plugins")


def check(ctx):
    problems = []
    t = ctx.table("rates", COLS)
    if not t.exists():
        problems.append("data/rates.csv is not there. Run: os plugin migrate example-trade-rates")
        return problems
    rows = t.read()
    if not rows:
        problems.append("rates.csv exists and has no rows")
    for r in rows:
        if not r["code"]:
            problems.append("a row in rates.csv has no code")
        if r["unit"] != "percent" and ctx.data.cents(r["rate"]) <= 0:
            problems.append("rate {} is {}, which is not a price".format(
                r["code"] or "with no code", r["rate"] or "blank"))
    return problems
