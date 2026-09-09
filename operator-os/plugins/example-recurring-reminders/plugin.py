"""
Recurring renewal reminders.

recurring.csv already holds every recurring income and cost line, each with
its own next_date. Nobody reads that file on a schedule, so a renewal lapses
or a subscription auto-renews at a stale price without anyone noticing until
the money moves. This adds one read-only view: what is due in the next N
days, oldest first, split from what is already overdue and what has no
next_date at all so it cannot be judged.

Capabilities: commands, tools. Not writes. This plugin never changes a row --
`os set recurring <id> next_date ...` or `os retainer` already do that, and
duplicating a write path here would just be a second way to get it wrong.
"""

DEFAULT_WINDOW_DAYS = 14


def register(reg, ctx):

    def _rows():
        return ctx.data.load("recurring")

    def _due_in(row, today):
        when = ctx.data.d(row.get("next_date"))
        if when is None:
            return None
        return (when - today).days

    def cmd_reminders(args):
        if args and args[0] in ("-h", "--help"):
            print("\nos reminders [days]   recurring rows due within that many days "
                  "(default {})\n".format(DEFAULT_WINDOW_DAYS))
            return 0
        window = DEFAULT_WINDOW_DAYS
        if args:
            try:
                window = int(args[0])
            except ValueError:
                print("\n  '{}' is not a number of days. Try: os reminders 30\n".format(args[0]))
                return 1
            if window <= 0:
                print("\n  A window of {} days tells nothing. Use a positive number.\n".format(window))
                return 1

        rows = _rows()
        symbol = ctx.data.sym()
        today = ctx.data.today()

        overdue, upcoming, undated = [], [], []
        for r in rows:
            days = _due_in(r, today)
            if days is None:
                undated.append(r)
            elif days < 0:
                overdue.append((days, r))
            elif days <= window:
                upcoming.append((days, r))

        if not rows:
            print("\n  recurring.csv has no rows yet. Nothing to remind you of.\n")
            return 0

        print("\nRecurring reminders   window {} day{}".format(
            window, "" if window == 1 else "s"))
        print("-" * 62)

        if overdue:
            print("\nOverdue -- next_date already passed")
            for days, r in sorted(overdue):
                print("  {:<8} {:<28} {:<8} {:>10}   {} days overdue".format(
                    r["id"], r["label"][:28], r["type"],
                    ctx.data.money(ctx.data.cents(r["amount"]), symbol), -days))

        if upcoming:
            print("\nDue within {} days".format(window))
            for days, r in sorted(upcoming):
                print("  {:<8} {:<28} {:<8} {:>10}   in {} day{}".format(
                    r["id"], r["label"][:28], r["type"],
                    ctx.data.money(ctx.data.cents(r["amount"]), symbol),
                    days, "" if days == 1 else "s"))

        if not overdue and not upcoming:
            print("\n  Nothing due in the next {} days.".format(window))

        if undated:
            print("\nNo next_date set -- cannot be judged due or not")
            for r in undated:
                print("  {:<8} {}".format(r["id"], r["label"][:40]))
            print("  Set one: os set recurring <id> next_date <date>")

        print("\n  Finish line: every row above either has a next_date you trust,")
        print("  or you just set one. os reminders again should shrink the overdue list.\n")
        return 0

    reg.add("reminders", cmd_reminders,
            group="plugin",
            summary="recurring rows due soon, overdue, or missing a next_date",
            group_blurb="added by plugins")


def tools():
    return ["tools/renewal-reminder/SKILL.md"]


def check(ctx):
    problems = []
    try:
        rows = ctx.data.load("recurring")
    except Exception as exc:
        problems.append("cannot read recurring.csv: {}".format(exc))
        return problems
    for r in rows:
        if r.get("next_date") and ctx.data.d(r["next_date"]) is None:
            problems.append("recurring {} has a next_date that does not parse: {!r}".format(
                r.get("id"), r.get("next_date")))
    return problems
