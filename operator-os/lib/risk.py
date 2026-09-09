"""
Risk engine: a cash simulation that admits it does not know, and a statistical
pass that finds the things you would only notice by accident.

The deterministic forecast in osdata answers "what happens if everything lands
the way it usually does". This answers "how often does it not", which is the
question that actually keeps solo operators awake.
"""

import random
import statistics
from collections import defaultdict
from datetime import timedelta

import osdata as D

SEED = 7


# ---------------------------------------------------------------- simulation

def _collection_probability(days_late):
    if days_late <= 0:
        return 0.97
    if days_late <= 30:
        return 0.93
    if days_late <= 60:
        return 0.78
    if days_late <= 90:
        return 0.55
    return 0.3


def _lag_sampler(contact_id, default_days, rng):
    """Return a function that samples one payment lag in days."""
    lags = []
    for inv in D.load("invoices"):
        if inv.get("contact_id") != contact_id or inv.get("status") != "paid":
            continue
        issued, paid = D.d(inv.get("issued")), D.d(inv.get("paid_on"))
        if issued and paid:
            lags.append(max(0, (paid - issued).days))
    if len(lags) >= 2:
        def sample():
            base = rng.choice(lags)
            return max(0, int(round(base * rng.uniform(0.75, 1.35))))
        return sample, "own history of {} payments".format(len(lags))

    def sample_default():
        return max(0, int(round(rng.gauss(default_days * 1.35, default_days * 0.6))))
    return sample_default, "terms, no history"


def _matches_recurring(exp, recurring):
    """True if this historical expense is the same thing a recurring row already
    models forward. Without this the simulation charges fixed costs twice."""
    amt = D.cents(exp.get("amount"))
    vendor = (exp.get("vendor") or "").strip().lower()
    cat = (exp.get("category") or "").strip().lower()
    for r in recurring:
        if r.get("type") != "cost":
            continue
        ramt = D.cents(r.get("amount"))
        rlabel = (r.get("label") or "").strip().lower()
        rcat = (r.get("category") or "").strip().lower()
        near = ramt and abs(amt - ramt) <= max(200, ramt * 0.1)
        if near and (cat == rcat or (vendor and (vendor in rlabel or rlabel in vendor))):
            return True
    return False


def _overhead_per_week(ref=None):
    """Typical weekly spend on things that are neither job costs nor already
    modelled as recurring rows. Measured over the span the data actually covers,
    with the worst decile trimmed so one bad week does not set the expectation."""
    ref = ref or D.today()
    window = ref - timedelta(days=180)
    recurring = D.load("recurring")
    rows = []
    for e in D.load("expenses"):
        if e.get("project_id"):
            continue
        dt = D.d(e.get("date"))
        if not dt or dt < window or dt > ref:
            continue
        if _matches_recurring(e, recurring):
            continue
        rows.append((dt, D.cents(e.get("amount"))))
    if not rows:
        return 0, 0.3
    first = min(dt for dt, _ in rows)
    span_days = max(7, (ref - first).days)
    span_weeks = max(1, int(round(span_days / 7.0)))
    weeks = defaultdict(int)
    for dt, amt in rows:
        weeks[(dt - first).days // 7] += amt
    vals = sorted(weeks.get(i, 0) for i in range(span_weeks))
    keep = vals[:max(1, int(len(vals) * 0.9))]
    avg = statistics.fmean(keep) if keep else 0
    spread = 0.45
    if len(keep) > 2 and avg:
        spread = min(0.9, max(0.15, statistics.pstdev(keep) / avg))
    return int(round(avg)), spread


def simulate(trials=2000, horizon=90, ref=None, force_paid=None, buffer_cents=0):
    """Run the cash simulation. force_paid is an invoice id treated as certain."""
    ref = ref or D.today()
    cfg = D.config()
    terms = int(cfg.get("invoice_terms_days") or 14)
    opening = D.cents(cfg.get("opening_cash"))
    rng = random.Random(SEED)

    invoices = [i for i in D.load("invoices") if D.invoice_open_cents(i) > 0]
    deals = [x for x in D.load("deals") if x.get("status") == "open"
             and D.d(x.get("expected_close"))
             and D.d(x.get("expected_close")) <= ref + timedelta(days=horizon)]
    recurring = D.load("recurring")
    weekly_overhead, overhead_spread = _overhead_per_week(ref)

    samplers = {}
    for inv in invoices:
        cid = inv.get("contact_id")
        if cid not in samplers:
            samplers[cid] = _lag_sampler(cid, terms, rng)

    fixed = []
    for rec in recurring:
        nxt = D.d(rec.get("next_date"))
        if not nxt:
            continue
        sign = 1 if rec.get("type") == "income" else -1
        amt = D.cents(rec.get("amount")) * sign
        cur, guard = nxt, 0
        while cur <= ref + timedelta(days=horizon) and guard < 400:
            if cur >= ref:
                fixed.append(((cur - ref).days, amt))
            cur = D._advance(cur, rec.get("cadence") or "monthly")
            guard += 1

    at30, at60, at90, mins, ruin, ruin_days, buffer_breach = [], [], [], [], 0, [], 0
    for _ in range(trials):
        events = list(fixed)
        for inv in invoices:
            amt = D.invoice_open_cents(inv)
            late = D.days_late(inv, ref)
            certain = (force_paid is not None and inv["id"] == force_paid)
            p = 1.0 if certain else _collection_probability(late)
            if rng.random() > p:
                continue
            if certain:
                lag = terms
            else:
                sample, _why = samplers[inv.get("contact_id")]
                lag = sample()
            issued = D.d(inv.get("issued"), ref)
            day = max(0, (issued + timedelta(days=lag) - ref).days)
            if day <= horizon:
                events.append((day, amt))
        for dl in deals:
            try:
                conf = float(dl.get("confidence") or 0) / 100.0
            except ValueError:
                conf = 0.0
            if rng.random() > conf:
                continue
            close = D.d(dl.get("expected_close"))
            jitter = int(round(rng.gauss(0, 6)))
            day = (close - ref).days + terms + jitter
            if 0 <= day <= horizon:
                events.append((day, D.cents(dl.get("value"))))
        if weekly_overhead:
            for wk in range(1, horizon // 7 + 1):
                noise = max(0.15, rng.gauss(1.0, overhead_spread))
                events.append((wk * 7, -int(round(weekly_overhead * noise))))

        events.sort()
        bal, lo, lo_day = opening, opening, 0
        first_below = None
        idx = {30: None, 60: None, 90: None}
        for day, amt in events:
            bal += amt
            if bal < lo:
                lo, lo_day = bal, day
            if bal < 0 and first_below is None:
                first_below = day
            for cp in (30, 60, 90):
                if day <= cp:
                    idx[cp] = bal
        at30.append(idx[30] if idx[30] is not None else opening)
        at60.append(idx[60] if idx[60] is not None else opening)
        at90.append(idx[90] if idx[90] is not None else opening)
        mins.append(lo)
        if first_below is not None:
            ruin += 1
            ruin_days.append(first_below)
        if lo < buffer_cents:
            buffer_breach += 1

    def pct(vals, p):
        vals = sorted(vals)
        if not vals:
            return 0
        k = min(len(vals) - 1, max(0, int(round((len(vals) - 1) * p))))
        return vals[k]

    return {
        "trials": trials, "horizon": horizon, "opening": opening,
        "d30": {"p10": pct(at30, .1), "p50": pct(at30, .5), "p90": pct(at30, .9)},
        "d60": {"p10": pct(at60, .1), "p50": pct(at60, .5), "p90": pct(at60, .9)},
        "d90": {"p10": pct(at90, .1), "p50": pct(at90, .5), "p90": pct(at90, .9)},
        "low": {"p10": pct(mins, .1), "p50": pct(mins, .5), "p90": pct(mins, .9)},
        "ruin_pct": round(ruin * 100.0 / trials, 1),
        "ruin_day_p50": (sorted(ruin_days)[len(ruin_days) // 2] if ruin_days else None),
        "buffer_breach_pct": round(buffer_breach * 100.0 / trials, 1),
        "invoices_modelled": len(invoices), "deals_modelled": len(deals),
        "overhead_per_week": weekly_overhead,
    }


def sensitivity(trials=800, horizon=90, top=5):
    """Which single collection changes the odds most. The answer to 'what first'."""
    base = simulate(trials=trials, horizon=horizon)
    invoices = sorted([i for i in D.load("invoices") if D.invoice_open_cents(i) > 0],
                      key=lambda i: -D.invoice_open_cents(i))[:top]
    names = {c["id"]: c.get("name") or c["id"] for c in D.load("contacts")}
    out = []
    for inv in invoices:
        alt = simulate(trials=trials, horizon=horizon, force_paid=inv["id"])
        out.append({
            "id": inv["id"], "number": inv.get("number") or inv["id"],
            "who": names.get(inv.get("contact_id"), ""),
            "amount": D.invoice_open_cents(inv),
            "ruin_before": base["ruin_pct"], "ruin_after": alt["ruin_pct"],
            "delta": round(base["ruin_pct"] - alt["ruin_pct"], 1),
            "p10_gain": alt["d90"]["p10"] - base["d90"]["p10"],
        })
    out.sort(key=lambda r: (-r["delta"], -r["p10_gain"]))
    return base, out


# ---------------------------------------------------------------- anomalies

def _median(vals):
    return statistics.median(vals) if vals else 0


def anomalies(ref=None):
    """Return a list of {severity, kind, what, evidence}."""
    ref = ref or D.today()
    found = []
    sym = D.sym()
    invoices = D.load("invoices")
    expenses = D.load("expenses")
    projects = D.load("projects")
    contacts = {c["id"]: c for c in D.load("contacts")}

    # duplicate expenses
    seen = defaultdict(list)
    for e in expenses:
        key = ((e.get("vendor") or "").strip().lower(), D.cents(e.get("amount")))
        seen[key].append(e)
    for (vendor, amt), rows in seen.items():
        if len(rows) < 2 or amt == 0:
            continue
        rows = sorted(rows, key=lambda r: D.d(r.get("date"), ref))
        for a, b in zip(rows, rows[1:]):
            da, db = D.d(a.get("date")), D.d(b.get("date"))
            if da and db and abs((db - da).days) <= 3:
                found.append({"severity": "high", "kind": "possible duplicate",
                              "what": "{} charged {} twice within 3 days".format(
                                  vendor or "a supplier", D.money(amt, sym)),
                              "evidence": "{} on {} and {} on {}".format(
                                  a["id"], a.get("date"), b["id"], b.get("date"))})

    # expense outliers by category
    # Job attached spend varies by job on purpose, so only overhead is checked here.
    by_cat = defaultdict(list)
    for e in expenses:
        if e.get("project_id"):
            continue
        by_cat[(e.get("category") or "uncategorised").lower()].append(e)
    for cat, rows in by_cat.items():
        amts = [D.cents(r.get("amount")) for r in rows]
        if len(amts) < 4:
            continue
        med = _median(amts)
        spread = statistics.pstdev(amts) or 1
        for r in rows:
            v = D.cents(r.get("amount"))
            if med and v > med * 3 and (v - med) / spread > 1.5:
                found.append({"severity": "medium", "kind": "unusual spend",
                              "what": "{} at {} is {}x your usual {} spend".format(
                                  D.money(v, sym), r.get("vendor") or "a supplier",
                                  round(v / float(med), 1), cat),
                              "evidence": "{} on {}, usual is {}".format(
                                  r["id"], r.get("date"), D.money(int(med), sym))})

    # margin outliers on finished work
    margins = []
    for p in projects:
        if p.get("status") not in ("done", "cancelled"):
            continue
        m = D.project_margin(p["id"])
        if m["revenue"] > 0:
            margins.append((p, m))
    if len(margins) >= 3:
        vals = sorted(m["margin_pct"] for _, m in margins)
        med = _median(vals)
        q1 = vals[len(vals) // 4]
        for p, m in margins:
            if m["margin_pct"] < q1 and med - m["margin_pct"] > 15:
                found.append({"severity": "medium", "kind": "margin outlier",
                              "what": "{} came in at {}% against a typical {}%".format(
                                  p["name"], round(m["margin_pct"], 1), round(med, 1)),
                              "evidence": "revenue {}, cost {}".format(
                                  D.money(m["revenue"], sym),
                                  D.money(m["expenses"] + m["labour"], sym))})

    # payment behaviour drift
    by_contact = defaultdict(list)
    for inv in invoices:
        if inv.get("status") == "paid" and inv.get("paid_on") and inv.get("issued"):
            issued, paid = D.d(inv["issued"]), D.d(inv["paid_on"])
            if issued and paid:
                by_contact[inv["contact_id"]].append((issued, (paid - issued).days))
    for cid, rows in by_contact.items():
        if len(rows) < 4:
            continue
        rows.sort()
        half = len(rows) // 2
        early = _median([d for _, d in rows[:half]])
        late = _median([d for _, d in rows[half:]])
        if early and late > early * 1.5 and late - early >= 7:
            found.append({"severity": "high", "kind": "paying slower",
                          "what": "{} now takes {} days, was {}".format(
                              contacts.get(cid, {}).get("name", cid), int(late), int(early)),
                          "evidence": "{} paid invoices compared oldest half to newest".format(len(rows))})

    # revenue concentration
    window = ref - timedelta(days=180)
    billed = defaultdict(int)
    for inv in invoices:
        dt = D.d(inv.get("issued"))
        if dt and dt >= window and inv.get("status") != "draft":
            billed[inv["contact_id"]] += D.cents(inv.get("total"))
    total = sum(billed.values())
    if total:
        shares = sorted(((v / float(total), k) for k, v in billed.items()), reverse=True)
        hhi = sum((s * 100) ** 2 for s, _ in shares)
        top_share, top_id = shares[0]
        if top_share > 0.4:
            found.append({"severity": "high" if top_share > 0.55 else "medium",
                          "kind": "concentration",
                          "what": "{} is {}% of the last six months of billing".format(
                              contacts.get(top_id, {}).get("name", top_id),
                              int(top_share * 100)),
                          "evidence": "concentration index {}, {} customers billed".format(
                              int(hhi), len(shares))})

    # unbilled finished work
    for p in projects:
        if p.get("status") != "done":
            continue
        m = D.project_margin(p["id"])
        if m["minutes"] > 0 and m["revenue"] == 0:
            found.append({"severity": "high", "kind": "unbilled work",
                          "what": "{} is finished with {} hours logged and nothing invoiced".format(
                              p["name"], round(m["minutes"] / 60.0, 1)),
                          "evidence": "project {}, closed {}".format(
                              p["id"], p.get("closed_on") or "date not set")})

    # invoicing cadence
    issued = sorted(D.d(i["issued"]) for i in invoices if D.d(i.get("issued")))
    if len(issued) >= 4:
        gaps = [(b - a).days for a, b in zip(issued, issued[1:])]
        med = _median(gaps)
        since = (ref - issued[-1]).days
        if med and since > med * 2.5 and since > 14:
            found.append({"severity": "medium", "kind": "invoicing stopped",
                          "what": "{} days since the last invoice, usual gap is {}".format(
                              since, int(med)),
                          "evidence": "last was {} on {}".format(
                              "an invoice", D.iso(issued[-1]))})

    # receipts
    threshold = D.cents(D.config().get("receipt_threshold") or "75.00")
    missing = [e for e in expenses if (e.get("receipt") or "").lower() not in ("yes", "y", "true")
               and D.cents(e.get("amount")) > threshold]
    if missing:
        found.append({"severity": "low", "kind": "missing receipts",
                      "what": "{} expenses over {} have no receipt".format(
                          len(missing), D.money(threshold, sym)),
                      "evidence": ", ".join(e["id"] for e in missing[:6])})

    order = {"high": 0, "medium": 1, "low": 2}
    found.sort(key=lambda f: order.get(f["severity"], 3))
    return found
