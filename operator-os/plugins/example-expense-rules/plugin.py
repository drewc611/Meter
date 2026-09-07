"""
Expense category rules.

Proves the migrations capability the same way example-trade-rates does:
migrations/001_rules.py creates data/rules.csv, and this module reads and
writes that one file through ctx.table(), which allows it because the
plugin's own migration created it.

Unlike a rate, a category rule is a suggestion, not a fact -- "uber" usually
means travel, but an Uber Eats receipt filed as a client lunch is a category
the rule cannot know about from the vendor name alone. So `os rules check`
never rewrites expenses.csv itself. It reads it (reading is always open) and
prints a line per row where a rule's keyword matches the vendor or notes and
the row's own category disagrees, leaving the actual edit -- `os set
expenses <id> category=...` -- to whoever is looking at the receipt.

Capabilities: commands, migrations. Not writes. Ask it to touch expenses.csv
and the data layer refuses it by name.
"""

COLS = ["keyword", "category", "notes"]

USAGE = """
os rules                                the rule list
os rules add <keyword> <category>       add a rule
os rules check                          expenses whose category disagrees with a rule
"""


def register(reg, ctx):

    def table():
        return ctx.table("rules", COLS)

    def missing():
        print("\n  No rules yet. data/rules.csv has not been created.")
        print("  Run:  os plugin migrate example-expense-rules\n")
        return 1

    def cmd_rules(args):
        if args and args[0] in ("-h", "--help"):
            print(USAGE)
            return 0
        if args and args[0] == "add":
            return add_rule(args[1:])
        if args and args[0] == "check":
            return check_expenses()
        if args:
            print("\n  '{}' is not a rules subcommand.".format(args[0]))
            print(USAGE)
            return 1
        return list_rules()

    def list_rules():
        t = table()
        if not t.exists():
            return missing()
        rows = t.read()
        if not rows:
            print("\n  rules.csv exists and has no rows. Add one:")
            print("  os rules add uber travel\n")
            return 0
        print("\nExpense rules   {} rule{}   {}".format(
            len(rows), "" if len(rows) == 1 else "s", t.path))
        print("-" * 62)
        print("  {:<20} {:<16} {}".format("keyword", "category", "notes"))
        for r in rows:
            print("  {:<20} {:<16} {}".format(r["keyword"], r["category"], r["notes"]))
        print("\n  os rules check   see which expenses disagree with these\n")
        return 0

    def add_rule(args):
        if len(args) < 2:
            print("\n  os rules add <keyword> <category>   for example: os rules add uber travel\n")
            return 1
        t = table()
        if not t.exists():
            return missing()
        keyword = args[0].strip().lower()
        category = args[1].strip().lower()
        if not keyword or not category:
            print("\n  Both keyword and category need real text, not blank.\n")
            return 1
        rows = t.read()
        for r in rows:
            if r["keyword"].lower() == keyword:
                print("\n  '{}' already maps to '{}'. Edit rules.csv by hand to change it, "
                      "there is no 'set' here -- a silent overwrite is how a rule stops "
                      "meaning what someone thinks it means.\n".format(keyword, r["category"]))
                return 1
        rows.append({"keyword": keyword, "category": category,
                     "notes": " ".join(args[2:])})
        t.write(rows)
        print("\nAdded   {} -> {}".format(keyword, category))
        print("  written to {}".format(t.path))
        print("\n  Finish line: run `os rules check` and see it apply to a real row.\n")
        return 0

    def check_expenses():
        t = table()
        if not t.exists():
            return missing()
        rules = t.read()
        if not rules:
            print("\n  rules.csv has no rows yet. Nothing to check against.\n")
            return 0
        expenses = ctx.data.load("expenses")
        if not expenses:
            print("\n  expenses.csv has no rows yet. Nothing to check.\n")
            return 0

        flagged = 0
        ambiguous = 0
        for e in expenses:
            haystack = " ".join([e.get("vendor", ""), e.get("notes", "")]).lower()
            hits = {r["category"].strip().lower() for r in rules
                    if r["keyword"] and r["keyword"] in haystack}
            if not hits:
                continue
            current = (e.get("category") or "").strip().lower()
            if current in hits:
                continue
            if len(hits) > 1:
                ambiguous += 1
                print("  {:<8} {:<28} filed as {:<14} keywords disagree: {}".format(
                    e["id"], (e.get("vendor") or "")[:28], e.get("category") or "(blank)",
                    ", ".join(sorted(hits))))
                continue
            flagged += 1
            print("  {:<8} {:<28} filed as {:<14} a rule suggests {}".format(
                e["id"], (e.get("vendor") or "")[:28], e.get("category") or "(blank)",
                next(iter(hits))))

        if not flagged and not ambiguous:
            print("\n  Every expense that matches a rule is already filed under it.\n")
            return 0
        print("\n  {} row{} disagree with a single rule, {} row{} matched more than one "
              "rule with different categories.".format(
                  flagged, "" if flagged == 1 else "s",
                  ambiguous, "" if ambiguous == 1 else "s"))
        print("  Fix one: os set expenses <id> category=<category>\n")
        return 0

    reg.add("rules", cmd_rules,
            group="plugin",
            summary="keyword to category rules, and which expenses disagree with them",
            group_blurb="added by plugins")


def check(ctx):
    problems = []
    t = ctx.table("rules", COLS)
    if not t.exists():
        problems.append("data/rules.csv is not there. Run: os plugin migrate example-expense-rules")
        return problems
    rows = t.read()
    if not rows:
        problems.append("rules.csv exists and has no rows")
    seen = set()
    for r in rows:
        if not r["keyword"] or not r["category"]:
            problems.append("a row in rules.csv is missing a keyword or a category")
        if r["keyword"] in seen:
            problems.append("keyword '{}' appears more than once in rules.csv".format(r["keyword"]))
        seen.add(r["keyword"])
    return problems
