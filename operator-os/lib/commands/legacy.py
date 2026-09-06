"""
Core commands, moved out of the launcher so plugins can add their own beside
them. Every function here takes a list of arguments and returns an exit code.
"""

import json
import os
import shutil
import sys
from datetime import timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.dirname(HERE)
ROOT = os.path.dirname(LIB)
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402

BAR = "-" * 62



def brand():
    try:
        with open(os.path.join(ROOT, "brand.json"), "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {"product_name": "Operator OS", "version": "0"}


def head(title):
    print("\n" + title)
    print(BAR)


def kv(label, value, pad=26):
    print("  {}{}".format(label.ljust(pad), value))


# ---------------------------------------------------------------- commands

def cmd_init(args):
    D.init_empty()
    print("Data layer ready at {}".format(D.DATA))
    print("Next: os use <workspace>   or   os setup")
    return 0


def cmd_setup(args):
    """Interactive first run. Nine questions, then the config is written."""
    cfg = D.config()
    asks = [
        ("business_name", "What is the business called?"),
        ("operator", "Who runs it (your name)?"),
        ("trade", "In five words, what do you sell?"),
        ("currency_symbol", "Currency symbol"),
        ("hourly_rate", "Your hourly rate, or 0 if you do not bill by time"),
        ("invoice_terms_days", "Payment terms in days"),
        ("tax_set_aside_pct", "Percent of profit to set aside for tax"),
        ("capacity_hours_per_week", "Billable hours you can actually work per week"),
        ("opening_cash", "Cash in the business account right now"),
    ]
    print("\nNine questions. Enter keeps the value in brackets.\n")
    for key, prompt in asks:
        cur = cfg.get(key, "")
        try:
            got = input("  {} [{}]: ".format(prompt, cur)).strip()
        except EOFError:
            got = ""
        if got:
            cfg[key] = got
    D.init_empty()
    D.write_config(cfg)
    print("\nWritten to {}".format(os.path.join(D.DATA, "business.yml")))
    print("Finish line: run `os brief`. If it prints your business name, you are installed.")
    return 0


def cmd_use(args):
    wdir = os.path.join(ROOT, "workspaces")
    if not args:
        print("\nWorkspaces you can start from:\n")
        for name in sorted(os.listdir(wdir)):
            meta = os.path.join(wdir, name, "persona.md")
            line = ""
            if os.path.exists(meta):
                with open(meta, "r", encoding="utf-8") as fh:
                    for row in fh:
                        if row.startswith("> "):
                            line = row[2:].strip()
                            break
            print("  {:<26} {}".format(name, line))
        print("\n  os use <name>            load that business into data/")
        print("  os use <name> --empty    keep its config, drop every row\n")
        return 0
    name = args[0]
    src_dir = os.path.join(wdir, name)
    seed_path = os.path.join(src_dir, "seed.json")
    if not os.path.exists(seed_path):
        print("No workspace called '{}'. Run `os use` to list them.".format(name))
        return 1
    if os.path.isdir(D.DATA) and any(
            os.path.exists(D.path_for(n)) and D.load(n) for n in D.SCHEMA):
        backup = D.DATA + ".before-" + D.iso(D.today())
        shutil.rmtree(backup, ignore_errors=True)
        shutil.copytree(D.DATA, backup)
        print("Your existing data was copied to {} first.".format(backup))
    with open(seed_path, "r", encoding="utf-8") as fh:
        seed = json.load(fh)
    if "--empty" in args:
        seed = {"config": seed.get("config", {})}
    D.render_seed(seed)
    counts = ", ".join("{} {}".format(len(D.load(n)), n)
                       for n in D.SCHEMA if D.load(n))
    print("Loaded '{}'. {}".format(name, counts or "config only"))
    print("Every date in it is relative to today, so it never looks stale.")
    print("Finish line: run `os brief`.")
    return 0


def cmd_validate(args):
    problems, warnings = D.validate()
    if problems:
        head("Broken data: {}".format(len(problems)))
        for p in problems:
            print("  " + p)
    if warnings and "--errors-only" not in args:
        head("Worth your attention: {}".format(len(warnings)))
        for w in warnings:
            print("  " + w)
    if not problems:
        counts = ", ".join("{} {}".format(len(D.load(n)), n) for n in D.SCHEMA)
        print("\nData is sound. " + counts)
        if warnings:
            print("Nothing is broken. The list above is the business asking for a decision.")
        print("")
        return 0
    print("\nNothing was changed. Fix the broken rows, then run `os validate` again.\n")
    return 1


def cmd_brief(args):
    b = D.brief()
    s = D.sym()
    head("{}  |  {}".format(b["business"], b["date"]))
    cash = b["cash"]
    kv("cash now", D.money(cash["opening"], s))
    for h in (30, 60, 90):
        k = "d{}".format(h)
        if k in cash:
            kv("cash in {} days".format(h), "{}   (best case {})".format(
                D.money(cash[k]["weighted"], s), D.money(cash[k]["best"], s)))
    lp = cash["low_point"]
    kv("lowest point", "{} on {}".format(D.money(lp["cents"], s), lp["on"]))
    cap = b["capacity"]
    kv("load next 4 weeks", "{}% ({} of {} hours)".format(
        cap["load_pct"], cap["committed_hours"], cap["available_hours"]))
    if b["late_invoice_count"]:
        kv("owed to you, late", "{} across {} invoice{}".format(
            D.money(b["late_invoice_cents"], s), b["late_invoice_count"],
            "" if b["late_invoice_count"] == 1 else "s"))

    if b["overdue_tasks"]:
        head("Overdue ({})".format(len(b["overdue_tasks"])))
        for t in b["overdue_tasks"][:10]:
            print("  {}  {:<44} due {}".format(t["id"], t["title"][:44], t["due"]))
    if b["due_today"]:
        head("Due today ({})".format(len(b["due_today"])))
        for t in b["due_today"]:
            print("  {}  {:<44} {}".format(t["id"], t["title"][:44], t["priority"]))
    if b["deals_needing_action"]:
        head("Deals waiting on you ({})".format(len(b["deals_needing_action"])))
        for dl in b["deals_needing_action"][:10]:
            print("  {}  {:<30} {:>12}  {}".format(
                dl["id"], (dl["title"] or "")[:30], D.money(D.cents(dl["value"]), s),
                dl["next_action"] or "NO NEXT ACTION"))
    if not (b["overdue_tasks"] or b["due_today"] or b["deals_needing_action"]):
        print("\nNothing overdue, nothing due today, no deal waiting on you.")
    print("")
    return 0


def cmd_cash(args):
    days = int(args[0]) if args and args[0].isdigit() else 90
    timeline, s_ = D.cashflow(days)
    s = D.sym()
    head("Cash, next {} days".format(days))
    kv("opening", D.money(s_["opening"], s))
    for h in (30, 60, 90):
        k = "d{}".format(h)
        if k in s_:
            kv("day {}".format(h), "{}  weighted   {}  if everything lands".format(
                D.money(s_[k]["weighted"], s).rjust(14),
                D.money(s_[k]["best"], s).rjust(14)))
    lp = s_["low_point"]
    kv("low point", "{} on {}".format(D.money(lp["cents"], s), lp["on"]))
    if lp["cents"] < 0:
        print("\n  You run out of money on {}. That is the number that matters.".format(lp["on"]))
    if "--detail" in args:
        head("Every movement")
        for e in timeline:
            print("  {}  {:>12}  {:>3}%  {:<34} {:>14}".format(
                D.iso(e["date"]), D.money(e["cents"], s),
                int(e["confidence"] * 100), e["label"][:34],
                D.money(e["weighted"], s)))
    print("")
    return 0


def cmd_aging(args):
    ag = D.aging()
    s = D.sym()
    head("Who owes you")
    total = 0
    for key in ("current", "1-30", "31-60", "61-90", "90+"):
        rows = ag[key]
        if not rows:
            continue
        sub = sum(c for _, c, _ in rows)
        total += sub
        label = "not due yet" if key == "current" else key + " days late"
        print("\n  {}   {}".format(label.ljust(18), D.money(sub, s)))
        for inv, c, late in sorted(rows, key=lambda r: -r[2]):
            who = next((x["name"] for x in D.load("contacts")
                        if x["id"] == inv["contact_id"]), inv["contact_id"])
            print("    {:<10} {:<24} {:>12}  due {}".format(
                inv.get("number") or inv["id"], who[:24], D.money(c, s), inv["due"]))
    print("\n  {}   {}\n".format("total outstanding".ljust(18), D.money(total, s)))
    return 0


def cmd_margin(args):
    s = D.sym()
    target = float(D.config().get("target_margin_pct") or 0)
    rows = []
    for p in D.load("projects"):
        if args and p["id"] not in args and p["name"] not in args:
            continue
        m = D.project_margin(p["id"])
        if m["revenue"] == 0 and m["expenses"] == 0 and m["minutes"] == 0:
            continue
        rows.append((p, m))
    finished = [r for r in rows if r[0]["status"] in ("done", "cancelled")]
    running = [r for r in rows if r[0]["status"] not in ("done", "cancelled")]

    def block(title, group, judge):
        if not group:
            return
        head(title)
        print("  {:<28} {:>11} {:>11} {:>11} {:>8}".format(
            "project", "revenue", "cost", "profit", "margin"))
        for p, m in sorted(group, key=lambda r: r[1]["margin_pct"]):
            flag = ""
            if judge and m["revenue"] and m["margin_pct"] < target:
                flag = "  under target"
            print("  {:<28} {:>11} {:>11} {:>11} {:>7.1f}%{}".format(
                p["name"][:28], D.money(m["revenue"], s),
                D.money(m["expenses"] + m["labour"], s), D.money(m["profit"], s),
                m["margin_pct"], flag))

    block("Finished work   (target {}%)".format(int(target)), finished, True)
    block("Still running   (partly billed, judge nothing yet)", running, False)
    if not rows:
        head("Margin")
        print("  No project has money or time against it yet.")
    if finished:
        rev = sum(m["revenue"] for _, m in finished)
        prof = sum(m["profit"] for _, m in finished)
        print("\n  {:<28} {:>11} {:>23} {:>7.1f}%".format(
            "all finished work", D.money(rev, s), D.money(prof, s),
            (prof / rev * 100.0) if rev else 0.0))
    print("")
    return 0


def cmd_tax(args):
    t = D.tax_set_aside()
    s = D.sym()
    head("Tax set aside   {} to {}".format(t["from"], t["to"]))
    kv("collected", D.money(t["income"], s))
    kv("spent", D.money(t["expenses"], s))
    kv("net", D.money(t["net"], s))
    kv("set aside at {}%".format(int(t["pct"])), D.money(t["set_aside"], s))
    print("\n  This is an estimate for planning, not a tax filing. Give it to whoever")
    print("  does your return.\n")
    return 0


def cmd_capacity(args):
    c = D.capacity()
    head("Capacity through {}".format(c["through"]))
    kv("committed", "{} hours".format(c["committed_hours"]))
    kv("available", "{} hours".format(c["available_hours"]))
    kv("load", "{}%".format(c["load_pct"]))
    if c["load_pct"] > 100:
        print("\n  You have promised more than you can deliver. Something moves or something drops.")
    elif c["load_pct"] < 50:
        print("\n  Half your capacity is unsold. That is a demand problem, not a delivery one.")
    print("")
    return 0


def _parse_pairs(pairs):
    out = {}
    for p in pairs:
        if "=" not in p:
            continue
        k, v = p.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def cmd_add(args):
    if not args:
        print("os add <registry> field=value ...   registries: " + ", ".join(D.SCHEMA))
        return 1
    name = args[0]
    if name not in D.SCHEMA:
        print("Unknown registry '{}'. One of: {}".format(name, ", ".join(D.SCHEMA)))
        return 1
    row = {c: "" for c in D.SCHEMA[name]["cols"]}
    row.update(_parse_pairs(args[1:]))
    row = D.put(name, row, cause="os add")
    print("Added {} to {}.csv".format(row["id"], name))
    problems, warnings = D.validate()
    for p in problems + warnings:
        if row["id"] in p:
            print("  note: " + p)
    return 0


def cmd_set(args):
    if len(args) < 3:
        print("os set <registry> <id> field=value ...")
        return 1
    name, rid = args[0], args[1]
    if name not in D.SCHEMA:
        print("Unknown registry '{}'".format(name))
        return 1
    rows = D.load(name)
    hit = None
    for r in rows:
        if r["id"] == rid:
            hit = r
            break
    if hit is None:
        print("No row {} in {}.csv".format(rid, name))
        return 1
    changes = _parse_pairs(args[2:])
    updated = dict(hit)
    for k, v in changes.items():
        if k not in D.SCHEMA[name]["cols"]:
            print("  ignored unknown field '{}'".format(k))
            continue
        print("  {}: {} to {}".format(k, hit.get(k) or "blank", v or "blank"))
        updated[k] = v
    D.put(name, updated, cause="os set")
    print("Updated {} in {}.csv".format(rid, name))
    return 0


def cmd_find(args):
    if not args:
        print("os find <text>   searches every registry")
        return 1
    needle = " ".join(args).lower()
    found = 0
    for name in D.SCHEMA:
        for r in D.load(name):
            blob = " ".join(str(v) for v in r.values()).lower()
            if needle in blob:
                found += 1
                label = r.get("name") or r.get("title") or r.get("label") or r.get("number") or ""
                print("  {:<10} {:<8} {}".format(name, r["id"], label[:52]))
    if not found:
        print("  Nothing matches '{}'.".format(needle))
    return 0


def cmd_backup(args):
    dest = os.path.join(ROOT, "backups", "data-" + D.iso(D.today()))
    shutil.rmtree(dest, ignore_errors=True)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copytree(D.DATA, dest)
    print("Copied {} to {}".format(D.DATA, dest))
    return 0


def cmd_doctor(args):
    b = brand()
    ok = True
    head("{} doctor".format(b["product_name"]))
    v = sys.version_info
    good = v >= (3, 9)
    ok &= good
    kv("python 3.9 or newer", "{}.{}.{}  {}".format(v[0], v[1], v[2], "ok" if good else "TOO OLD"))
    for tool in ("git",):
        found = shutil.which(tool)
        ok &= bool(found)
        kv(tool, found or "MISSING")
    exists = os.path.isdir(D.DATA)
    kv("data folder", D.DATA if exists else "MISSING, run `os init`")
    ok &= exists
    if exists:
        missing = [n for n in D.SCHEMA if not os.path.exists(D.path_for(n))]
        kv("registries", "all 9 present" if not missing else "missing: " + ", ".join(missing))
        ok &= not missing
        cfg = D.config()
        named = cfg.get("business_name") not in ("", "My Business")
        kv("business named", cfg.get("business_name") if named else "not set, run `os setup`")
        problems, warnings = D.validate()
        kv("data valid", "clean" if not problems else
           "{} broken rows, run `os validate`".format(len(problems)))
        ok &= not problems
        if warnings:
            kv("open loops", "{}, run `os validate` to see them".format(len(warnings)))
    writable = os.access(ROOT, os.W_OK)
    kv("repo writable", "yes" if writable else "NO")
    ok &= writable
    print("\n  {}\n".format("Machine is ready." if ok else
                            "Fix the lines above, then run `os doctor` again."))
    return 0 if ok else 1


def cmd_console(args):
    """Write the data the local dashboard reads. No server, no account."""
    out = {"generated": D.iso(D.today()), "brand": brand(), "config": D.config()}
    b = D.brief()
    for key in ("overdue_tasks", "due_today", "deals_needing_action"):
        out[key] = b[key]
    out["cash"] = b["cash"]
    out["capacity"] = b["capacity"]
    out["late_invoice_cents"] = b["late_invoice_cents"]
    out["late_invoice_count"] = b["late_invoice_count"]
    ag = D.aging()
    names = {c["id"]: (c.get("name") or c["id"]) for c in D.load("contacts")}
    out["aging"] = {k: {"count": len(v), "cents": sum(c for _, c, _ in v)}
                    for k, v in ag.items()}
    out["owed"] = []
    for k, rows in ag.items():
        for inv, c, late in rows:
            out["owed"].append({"number": inv.get("number") or inv["id"],
                                "who": names.get(inv.get("contact_id"), ""),
                                "cents": c, "late": late, "due": inv.get("due"),
                                "bucket": k})
    out["owed"].sort(key=lambda r: -r["late"])
    out["deals"] = [{"title": x.get("title"), "who": names.get(x.get("contact_id"), ""),
                     "cents": D.cents(x.get("value")), "stage": x.get("stage"),
                     "confidence": x.get("confidence"),
                     "next_action": x.get("next_action"),
                     "next_action_due": x.get("next_action_due")}
                    for x in D.load("deals") if x.get("status") == "open"]
    problems, warnings = D.validate()
    out["problems"] = problems
    out["warnings"] = warnings
    out["projects"] = []
    for p in D.load("projects"):
        if p.get("status") in ("done", "cancelled"):
            continue
        m = D.project_margin(p["id"])
        out["projects"].append({"name": p["name"], "status": p["status"],
                                "health": p["health"], "due": p["due"],
                                "margin_pct": round(m["margin_pct"], 1),
                                "revenue": m["revenue"]})
    try:
        import books as B, risk as R, events as E
        if os.path.exists(os.path.join(D.DATA, "journal.csv")):
            probs, notes = B.check()
            out["books"] = {"problems": probs, "notes": notes}
            pl = B.pnl()
            out["pnl"] = {"income": pl["total_income"], "expense": pl["total_expense"],
                          "profit": pl["profit"], "margin_pct": round(pl["margin_pct"], 1)}
        sim = R.simulate(trials=1200)
        out["sim"] = {"ruin_pct": sim["ruin_pct"], "ruin_day": sim["ruin_day_p50"],
                      "d90": sim["d90"], "low": sim["low"],
                      "overhead_per_week": sim["overhead_per_week"]}
        out["anomalies"] = R.anomalies()[:8]
        log = E.read()
        out["log"] = {"changes": len(log),
                      "last": log[-1]["ts"] if log else "",
                      "chain_ok": not E.verify_chain(),
                      "hand_edits": sum(len(v["added"]) + len(v["removed"]) + len(v["changed"])
                                        for v in E.drift().values())}
    except Exception as exc:
        out["extras_error"] = str(exc)
    timeline, _ = D.cashflow(90)
    out["timeline"] = [{"date": D.iso(e["date"]), "weighted": e["weighted"],
                        "label": e["label"], "kind": e["kind"]} for e in timeline]
    cdir = os.path.join(ROOT, "console")
    os.makedirs(cdir, exist_ok=True)
    blob = json.dumps(out, indent=1)
    with open(os.path.join(cdir, "data.json"), "w", encoding="utf-8") as fh:
        fh.write(blob)
    with open(os.path.join(cdir, "data.js"), "w", encoding="utf-8") as fh:
        fh.write("window.OS_DATA = " + blob + ";\n")
    print("Wrote console/data.js and console/data.json")
    print("Open console/index.html in any browser. No server, no network, no account.")
    return 0


def cmd_week(args):
    """The Friday number. What came in, what went out, what did not move."""
    ref = D.today()
    start = ref - timedelta(days=6)
    s = D.sym()
    paid = [i for i in D.load("invoices") if i.get("status") == "paid"
            and start <= (D.d(i.get("paid_on")) or start - timedelta(days=1)) <= ref]
    sent = [i for i in D.load("invoices")
            if start <= (D.d(i.get("issued")) or start - timedelta(days=1)) <= ref]
    spent = [e for e in D.load("expenses")
             if start <= (D.d(e.get("date")) or start - timedelta(days=1)) <= ref]
    done = [t for t in D.load("tasks") if t.get("status") == "done"
            and start <= (D.d(t.get("done_on")) or start - timedelta(days=1)) <= ref]
    head("Week to {}".format(D.iso(ref)))
    kv("collected", "{} across {} invoice(s)".format(
        D.money(sum(D.cents(i["total"]) for i in paid), s), len(paid)))
    kv("invoiced", "{} across {} invoice(s)".format(
        D.money(sum(D.cents(i["total"]) for i in sent), s), len(sent)))
    kv("spent", D.money(sum(D.cents(e["amount"]) for e in spent), s))
    kv("tasks finished", len(done))
    stuck = [t for t in D.load("tasks") if t.get("status") == "blocked"]
    if stuck:
        head("Blocked ({})".format(len(stuck)))
        for t in stuck:
            print("  {}  {:<40} {}".format(t["id"], t["title"][:40], t["notes"][:24]))
    print("")
    return 0




GROUPS = [
    ("start", "getting set up", [
        ("doctor", "check this machine and say what is missing", cmd_doctor),
        ("init", "create the data layer", cmd_init),
        ("setup", "nine questions, then your config is written", cmd_setup),
        ("use", "list or load one of the encoded workspaces", cmd_use),
    ]),
    ("read", "what is true right now", [
        ("brief", "what needs you today", cmd_brief),
        ("week", "what moved in the last seven days", cmd_week),
        ("cash", "cash forecast, add --detail for every movement", cmd_cash),
        ("aging", "who owes you and how late they are", cmd_aging),
        ("margin", "what each job actually made", cmd_margin),
        ("tax", "what to set aside", cmd_tax),
        ("capacity", "promised hours against real hours", cmd_capacity),
        ("find", "search every registry", cmd_find),
    ]),
    ("write", "changing the data", [
        ("add", "add a row: os add <registry> field=value ...", cmd_add),
        ("set", "change a row: os set <registry> <id> field=value ...", cmd_set),
        ("validate", "check every row and every link", cmd_validate),
        ("backup", "copy data/ with today's date", cmd_backup),
        ("console", "refresh the local dashboard", cmd_console),
    ]),
]


def register(reg):
    for group, blurb, items in GROUPS:
        for name, summary, fn in items:
            reg.add(name, fn, group=group, summary=summary, group_blurb=blurb)
