/*
 * Operator OS engine, JavaScript port.
 *
 * This is a faithful port of lib/osdata.py, lib/books.py, lib/query.py and the
 * deterministic half of lib/risk.py. It exists so the demo runs the real thing
 * in a browser instead of replaying a recording. Its output is compared against
 * the python engine, line for line, by demo/parity.js.
 */
(function () {
  "use strict";

  var SCHEMA = {
    contacts: {cols: ["id","name","company","role","email","phone","source","status","tags","first_contact","last_contact","notes"], prefix:"c",
      enums:{status:["lead","active","past","dormant","do_not_contact"]}, refs:{}},
    deals: {cols:["id","contact_id","title","value","stage","confidence","opened","expected_close","next_action","next_action_due","status","closed_on","lost_reason"], prefix:"d",
      enums:{stage:["new","qualified","quoted","negotiating","won","lost"], status:["open","won","lost"]}, refs:{contact_id:"contacts"}},
    quotes: {cols:["id","deal_id","contact_id","number","issued","expires","subtotal","tax","total","status","decided_on","notes"], prefix:"q",
      enums:{status:["draft","sent","accepted","declined","expired"]}, refs:{deal_id:"deals", contact_id:"contacts"}},
    projects: {cols:["id","contact_id","deal_id","name","status","start","due","budget","hours_estimate","health","next_milestone","closed_on"], prefix:"p",
      enums:{status:["planned","active","blocked","done","cancelled"], health:["green","amber","red",""]}, refs:{contact_id:"contacts", deal_id:"deals"}},
    tasks: {cols:["id","project_id","title","due","priority","status","estimate_min","done_on","blocked_by","notes"], prefix:"t",
      enums:{status:["todo","doing","blocked","done","dropped"], priority:["low","normal","high","now"]}, refs:{project_id:"projects"}},
    time: {cols:["id","date","project_id","task_id","minutes","billable","rate","notes"], prefix:"h",
      enums:{billable:["yes","no"]}, refs:{project_id:"projects", task_id:"tasks"}},
    invoices: {cols:["id","project_id","contact_id","number","issued","due","subtotal","tax","total","status","paid_on","method","notes"], prefix:"i",
      enums:{status:["draft","sent","part_paid","paid","written_off"]}, refs:{project_id:"projects", contact_id:"contacts"}},
    expenses: {cols:["id","date","vendor","category","amount","project_id","billable","method","receipt","notes"], prefix:"e",
      enums:{billable:["yes","no"]}, refs:{project_id:"projects"}},
    recurring: {cols:["id","label","type","amount","cadence","next_date","category","notes"], prefix:"r",
      enums:{type:["income","cost"], cadence:["weekly","fortnightly","monthly","quarterly","yearly"]}, refs:{}}
  };
  var MONEY_COLS = ["value","subtotal","tax","total","amount","budget","rate"];
  var DATE_HINTS = ["_on","date","due","issued","expires","start","opened",
                    "expected_close","first_contact","last_contact","next_date"];
  var BAR = new Array(63).join("-");

  /* ---------------------------------------------------------------- helpers */

  function pad(s, n) { s = String(s); return s.length >= n ? s : s + new Array(n - s.length + 1).join(" "); }
  function lpad(s, n) { s = String(s); return s.length >= n ? s : new Array(n - s.length + 1).join(" ") + s; }
  function clip(s, n) { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n) : s; }
  function fixed(n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
  // Python rounds halves to even. Without this the demo disagrees with the repo
  // on any value that lands exactly on a half, which is more often than you think.
  function pyRound(x, d) {
    var f = Math.pow(10, d), y = Number((x * f).toPrecision(15));
    var fl = Math.floor(y);
    if (Math.abs(y - fl - 0.5) < 1e-9) return ((fl % 2 === 0) ? fl : fl + 1) / f;
    return Math.round(y) / f;
  }

  function cents(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return Math.round(v * 100);
    var s = String(v).trim().replace(/[^0-9.\-]/g, "");
    if (!s || s === "-" || s === "." || s === "-.") return 0;
    var f = parseFloat(s);
    if (isNaN(f)) return 0;
    return Math.round(f * 100 + (f >= 0 ? 1e-9 : -1e-9));
  }
  function groupInt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function money(c, sym) {
    sym = sym === undefined ? "$" : sym;
    var neg = c < 0; c = Math.abs(Math.round(c));
    var s = sym + groupInt(Math.floor(c / 100)) + "." + String(c % 100).padStart(2, "0");
    return neg ? "-" + s : s;
  }
  function plain(c) {
    var neg = c < 0 ? "-" : ""; c = Math.abs(Math.round(c));
    return neg + Math.floor(c / 100) + "." + String(c % 100).padStart(2, "0");
  }
  var DAY = 86400000;
  function dparse(v, dflt) {
    if (!v) return dflt === undefined ? null : dflt;
    var s = String(v).trim().replace(/\//g, "-");
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return dflt === undefined ? null : dflt;
  }
  function iso(ms) {
    if (ms === null || ms === undefined) return "";
    var d = new Date(ms);
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") +
      "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  function days(a, b) { return Math.round((a - b) / DAY); }
  function addDays(ms, n) { return ms + n * DAY; }
  function addMonths(ms, n) {
    var d = new Date(ms), y = d.getUTCFullYear(), mo = d.getUTCMonth() + n;
    y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12;
    var leap = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
    var len = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo];
    return Date.UTC(y, mo, Math.min(d.getUTCDate(), len));
  }
  function advance(ms, cad) {
    if (cad === "weekly") return addDays(ms, 7);
    if (cad === "fortnightly") return addDays(ms, 14);
    if (cad === "quarterly") return addMonths(ms, 3);
    if (cad === "yearly") return addMonths(ms, 12);
    return addMonths(ms, 1);
  }
  function endsWithAny(s, list) {
    for (var i = 0; i < list.length; i++) if (s.slice(-list[i].length) === list[i]) return true;
    return false;
  }

  /* ---------------------------------------------------------------- engine */

  function Engine(ws) {
    this.ws = ws;
    this.cfg = ws.config;
    this.tables = {};
    for (var k in SCHEMA) this.tables[k] = (ws.tables[k] || []).map(function (r) { return Object.assign({}, r); });
    this.today = dparse(ws.today);
    this.sym = this.cfg.currency_symbol || "$";
    this.journal = null;
  }
  var P = Engine.prototype;

  P.load = function (n) { return this.tables[n] || []; };
  P.head = function (t) { return "\n" + t + "\n" + BAR; };
  P.kv = function (l, v) { return "  " + pad(l, 26) + v; };

  P.invoiceOpen = function (inv) {
    if (["paid", "written_off", "draft"].indexOf(inv.status) >= 0) return 0;
    return cents(inv.total);
  };
  P.daysLate = function (inv) {
    var due = dparse(inv.due); if (!due) return 0;
    return Math.max(0, days(this.today, due));
  };
  P.payLag = function (cid, dflt) {
    var lags = [];
    this.load("invoices").forEach(function (inv) {
      if (inv.contact_id !== cid || inv.status !== "paid") return;
      var a = dparse(inv.issued), b = dparse(inv.paid_on);
      if (a && b) lags.push(days(b, a));
    });
    if (!lags.length) return dflt;
    lags.sort(function (x, y) { return x - y; });
    return lags[Math.floor(lags.length / 2)];
  };
  P.aging = function () {
    var self = this, b = {current: [], "1-30": [], "31-60": [], "61-90": [], "90+": []};
    this.load("invoices").forEach(function (inv) {
      var open = self.invoiceOpen(inv); if (open <= 0) return;
      var late = self.daysLate(inv), key;
      if (late === 0) key = "current"; else if (late <= 30) key = "1-30";
      else if (late <= 60) key = "31-60"; else if (late <= 90) key = "61-90"; else key = "90+";
      b[key].push([inv, open, late]);
    });
    return b;
  };
  P.cashflow = function (horizon) {
    var self = this, terms = parseInt(this.cfg.invoice_terms_days || 14, 10);
    var opening = cents(this.cfg.opening_cash), ev = [];
    this.load("invoices").forEach(function (inv) {
      var open = self.invoiceOpen(inv); if (open <= 0) return;
      var issued = dparse(inv.issued, self.today);
      var lag = self.payLag(inv.contact_id, terms);
      var expected = Math.max(self.today, addDays(issued, lag));
      var late = self.daysLate(inv);
      var conf = late === 0 ? 0.95 : late <= 30 ? 0.85 : late <= 60 ? 0.6 : 0.35;
      ev.push({date: expected, cents: open, confidence: conf,
        label: "invoice " + (inv.number || inv.id) + " " + (late === 0 ? "on time" : late + "d late"),
        kind: "invoice"});
    });
    this.load("deals").forEach(function (dl) {
      if (dl.status !== "open") return;
      var close = dparse(dl.expected_close);
      if (!close || close > addDays(self.today, horizon)) return;
      var conf = parseFloat(dl.confidence || 0) / 100.0;
      if (!(conf > 0)) return;
      ev.push({date: Math.max(self.today, addDays(close, terms)), cents: cents(dl.value),
        confidence: conf, label: "deal " + (dl.title || dl.id), kind: "deal"});
    });
    this.load("recurring").forEach(function (rec) {
      var nxt = dparse(rec.next_date); if (!nxt) return;
      var sign = rec.type === "income" ? 1 : -1, amt = cents(rec.amount) * sign;
      var cur = nxt, guard = 0;
      while (cur <= addDays(self.today, horizon) && guard < 400) {
        if (cur >= self.today) ev.push({date: cur, cents: amt, confidence: 1.0,
          label: rec.label || rec.id, kind: "recurring"});
        cur = advance(cur, rec.cadence || "monthly"); guard++;
      }
    });
    ev.sort(function (a, b) { return a.date - b.date; });
    var timeline = [], bal = opening, weighted = opening;
    ev.forEach(function (e) {
      bal += e.cents; weighted += Math.round(e.cents * e.confidence);
      timeline.push(Object.assign({}, e, {balance: bal, weighted: weighted}));
    });
    function at(n) {
      var cut = addDays(self.today, n), b = opening, w = opening;
      ev.forEach(function (e) { if (e.date <= cut) { b += e.cents; w += Math.round(e.cents * e.confidence); } });
      return [b, w];
    }
    var summary = {opening: opening, horizon: horizon};
    [30, 60, 90].forEach(function (h) {
      if (h <= horizon) { var r = at(h); summary["d" + h] = {best: r[0], weighted: r[1]}; }
    });
    var lowest = opening, lowOn = this.today;
    timeline.forEach(function (e) { if (e.weighted < lowest) { lowest = e.weighted; lowOn = e.date; } });
    summary.low_point = {cents: lowest, on: iso(lowOn)};
    return [timeline, summary];
  };
  P.projectMargin = function (pid) {
    var rate = cents(this.cfg.hourly_rate), revenue = 0, spend = 0, minutes = 0;
    this.load("invoices").forEach(function (i) {
      if (i.project_id === pid && ["draft", "written_off"].indexOf(i.status) < 0) revenue += cents(i.total);
    });
    this.load("expenses").forEach(function (e) { if (e.project_id === pid) spend += cents(e.amount); });
    this.load("time").forEach(function (t) { if (t.project_id === pid) minutes += parseInt(t.minutes || 0, 10); });
    var labour = Math.round(minutes / 60.0 * rate), profit = revenue - spend - labour;
    return {project_id: pid, revenue: revenue, expenses: spend, labour: labour,
      minutes: minutes, profit: profit, margin_pct: revenue ? profit / revenue * 100.0 : 0.0};
  };
  P.ytdNet = function () {
    var self = this, y = new Date(this.today).getUTCFullYear(), start = Date.UTC(y, 0, 1);
    var income = 0, spend = 0;
    this.load("invoices").forEach(function (i) {
      if (i.status !== "paid") return;
      var d = dparse(i.paid_on, start);
      if (d >= start && d <= self.today) income += cents(i.total);
    });
    this.load("expenses").forEach(function (e) {
      var d = dparse(e.date, start);
      if (d >= start && d <= self.today) spend += cents(e.amount);
    });
    return {income: income, expenses: spend, net: income - spend, from: iso(start), to: iso(this.today)};
  };
  P.taxSetAside = function () {
    var pct = parseFloat(this.cfg.tax_set_aside_pct || 25), n = this.ytdNet();
    return Object.assign({}, n, {pct: pct, set_aside: Math.round(Math.max(0, n.net) * pct / 100.0)});
  };
  P.capacity = function () {
    var self = this, weekly = parseFloat(this.cfg.capacity_hours_per_week || 30);
    var horizon = addDays(this.today, 28), minutes = 0;
    this.load("tasks").forEach(function (t) {
      if (["done", "dropped"].indexOf(t.status) >= 0) return;
      var due = dparse(t.due);
      if (due && due >= self.today && due <= horizon) minutes += parseInt(t.estimate_min || 0, 10);
    });
    var committed = minutes / 60.0, available = weekly * 4;
    return {committed_hours: pyRound(committed, 1), available_hours: available,
      load_pct: available ? pyRound(committed / available * 100.0, 1) : 0.0, through: iso(horizon)};
  };
  P.brief = function () {
    var self = this;
    var tasks = this.load("tasks").filter(function (t) { return ["done", "dropped"].indexOf(t.status) < 0; });
    var far = addDays(this.today, 3650);
    var overdue = tasks.filter(function (t) { return (dparse(t.due) || far) < self.today; });
    var dueToday = tasks.filter(function (t) { return dparse(t.due) === self.today; });
    var ag = this.aging(), lateKeys = ["1-30", "31-60", "61-90", "90+"], lateMoney = 0, lateN = 0;
    lateKeys.forEach(function (k) { ag[k].forEach(function (r) { lateMoney += r[1]; lateN++; }); });
    var stale = this.load("deals").filter(function (d) {
      if (d.status !== "open") return false;
      var nad = dparse(d.next_action_due);
      return !nad || nad <= self.today;
    });
    var cf = this.cashflow(90);
    return {date: iso(this.today), business: this.cfg.business_name, overdue_tasks: overdue,
      due_today: dueToday, late_invoice_cents: lateMoney, late_invoice_count: lateN,
      deals_needing_action: stale, cash: cf[1], capacity: this.capacity()};
  };

  /* ---------------------------------------------------------------- validate */

  P.validate = function () {
    var self = this, problems = [], warnings = [];
    Object.keys(SCHEMA).forEach(function (name) {
      var spec = SCHEMA[name], seen = {};
      self.load(name).forEach(function (r, idx) {
        var where = name + ".csv line " + (idx + 2), rid = r.id || "";
        if (!rid) problems.push(where + ": missing id");
        else if (seen[rid]) problems.push(where + ": duplicate id " + rid);
        else seen[rid] = 1;
        Object.keys(spec.enums).forEach(function (col) {
          var v = r[col] || "";
          if (v && spec.enums[col].indexOf(v) < 0)
            problems.push(where + ": " + col + " is '" + v + "', expected one of " +
              spec.enums[col].filter(function (a) { return a; }).join("/"));
        });
        Object.keys(spec.refs).forEach(function (col) {
          var v = r[col] || "", target = spec.refs[col];
          if (v && !self.load(target).some(function (t) { return t.id === v; }))
            problems.push(where + ": " + col + " points at " + v + " which is not in " + target + ".csv");
        });
        spec.cols.forEach(function (col) {
          if (endsWithAny(col, DATE_HINTS) && r[col] && dparse(r[col]) === null)
            problems.push(where + ": " + col + " is not a date ('" + r[col] + "')");
        });
      });
    });
    this.load("invoices").forEach(function (inv) {
      if (inv.status === "paid" && !inv.paid_on)
        problems.push("invoices " + inv.id + ": marked paid with no paid_on date");
      if (inv.paid_on && ["paid", "part_paid"].indexOf(inv.status) < 0)
        problems.push("invoices " + inv.id + ": has paid_on but status is " + (inv.status || "blank"));
    });
    this.load("deals").forEach(function (d) {
      if (d.status === "open" && !d.next_action)
        warnings.push("deals " + d.id + " (" + clip(d.title || "", 32) + "): open with nothing scheduled to happen next");
    });
    this.load("quotes").forEach(function (q) {
      if (q.status === "sent" && q.expires && dparse(q.expires) && dparse(q.expires) < self.today)
        warnings.push("quotes " + (q.number || q.id) + ": expired on " + q.expires + " and was never marked won or lost");
    });
    this.load("projects").forEach(function (p) {
      if (p.status === "active" && p.due && dparse(p.due) && dparse(p.due) < self.today)
        warnings.push("projects " + (p.name || p.id) + ": still active but was due " + p.due);
    });
    this.load("expenses").forEach(function (e) {
      if (e.billable === "yes" && e.project_id && cents(e.amount) > 0) {
        var billed = self.load("invoices").some(function (i) {
          return i.project_id === e.project_id && i.status !== "draft";
        });
        if (!billed) warnings.push("expenses " + e.id + ": billable " + e.amount +
          " against " + e.project_id + " with no invoice raised");
      }
    });
    return [problems, warnings];
  };

  var API = {Engine: Engine, SCHEMA: SCHEMA, cents: cents, money: money,
    plain: plain, dparse: dparse, iso: iso, days: days, addDays: addDays,
    pad: pad, lpad: lpad, clip: clip, fixed: fixed, BAR: BAR, advance: advance,
    groupInt: groupInt, pyRound: pyRound};
  if (typeof module !== "undefined" && module.exports) { module.exports = API; }
  else { window.OS = API; }
})();

/* ------------------------------------------------------------------ part two
 * Command renderers. Every string here is built to match the python output
 * character for character, because demo/parity.js compares them literally.
 */
(function (API) {
  "use strict";
  var Engine = API.Engine, SCHEMA = API.SCHEMA, cents = API.cents, money = API.money,
      plain = API.plain, dparse = API.dparse, iso = API.iso, days = API.days,
      addDays = API.addDays, pad = API.pad, lpad = API.lpad, clip = API.clip,
      BAR = API.BAR, advance = API.advance;
  var P = Engine.prototype;

  var pyRound = API.pyRound;
  function f1(x) { return pyRound(x, 1).toFixed(1); }

  P.out = function (lines) { return lines.join("\n"); };

  /* ------------------------------------------------------------- brief */
  P.cmdBrief = function () {
    var b = this.brief(), s = this.sym, L = [];
    L.push(this.head(b.business + "  |  " + b.date));
    L.push(this.kv("cash now", money(b.cash.opening, s)));
    [30, 60, 90].forEach(function (h) {
      var k = "d" + h;
      if (b.cash[k]) L.push("  " + pad("cash in " + h + " days", 26) +
        money(b.cash[k].weighted, s) + "   (best case " + money(b.cash[k].best, s) + ")");
    });
    L.push(this.kv("lowest point", money(b.cash.low_point.cents, s) + " on " + b.cash.low_point.on));
    var c = b.capacity;
    L.push(this.kv("load next 4 weeks", f1(c.load_pct) + "% (" + f1(c.committed_hours) +
      " of " + f1(c.available_hours) + " hours)"));
    if (b.late_invoice_count) {
      L.push(this.kv("owed to you, late", money(b.late_invoice_cents, s) + " across " +
        b.late_invoice_count + " invoice" + (b.late_invoice_count === 1 ? "" : "s")));
    }
    if (b.overdue_tasks.length) {
      L.push(this.head("Overdue (" + b.overdue_tasks.length + ")"));
      b.overdue_tasks.slice(0, 10).forEach(function (t) {
        L.push("  " + t.id + "  " + pad(clip(t.title, 44), 44) + " due " + t.due);
      });
    }
    if (b.due_today.length) {
      L.push(this.head("Due today (" + b.due_today.length + ")"));
      b.due_today.forEach(function (t) {
        L.push("  " + t.id + "  " + pad(clip(t.title, 44), 44) + " " + t.priority);
      });
    }
    if (b.deals_needing_action.length) {
      L.push(this.head("Deals waiting on you (" + b.deals_needing_action.length + ")"));
      b.deals_needing_action.slice(0, 10).forEach(function (d) {
        L.push("  " + d.id + "  " + pad(clip(d.title || "", 30), 30) + " " +
          lpad(money(cents(d.value), s), 12) + "  " + (d.next_action || "NO NEXT ACTION"));
      });
    }
    if (!(b.overdue_tasks.length || b.due_today.length || b.deals_needing_action.length))
      L.push("\nNothing overdue, nothing due today, no deal waiting on you.");
    L.push("");
    return this.out(L);
  };

  /* ------------------------------------------------------------- aging */
  P.cmdAging = function () {
    var self = this, ag = this.aging(), s = this.sym, L = [], total = 0;
    L.push(this.head("Who owes you"));
    var names = {};
    this.load("contacts").forEach(function (c) { names[c.id] = c.name; });
    ["current", "1-30", "31-60", "61-90", "90+"].forEach(function (key) {
      var rows = ag[key]; if (!rows.length) return;
      var sub = rows.reduce(function (a, r) { return a + r[1]; }, 0);
      total += sub;
      var label = key === "current" ? "not due yet" : key + " days late";
      L.push("");
      L.push("  " + pad(label, 18) + "   " + money(sub, s));
      rows.slice().sort(function (a, b) { return b[2] - a[2]; }).forEach(function (r) {
        var inv = r[0], who = names[inv.contact_id] !== undefined ? names[inv.contact_id] : inv.contact_id;
        L.push("    " + pad(inv.number || inv.id, 10) + " " + pad(clip(who, 24), 24) + " " +
          lpad(money(r[1], s), 12) + "  due " + inv.due);
      });
    });
    L.push("");
    L.push("  " + pad("total outstanding", 18) + "   " + money(total, s));
    L.push("");
    return this.out(L);
  };

  /* ------------------------------------------------------------- cash */
  P.cmdCash = function (args) {
    var horizon = 90;
    (args || []).forEach(function (a) { if (/^\d+$/.test(a)) horizon = parseInt(a, 10); });
    var r = this.cashflow(horizon), timeline = r[0], sm = r[1], s = this.sym, L = [];
    L.push(this.head("Cash, next " + horizon + " days"));
    L.push(this.kv("opening", money(sm.opening, s)));
    [30, 60, 90].forEach(function (h) {
      var k = "d" + h; if (!sm[k]) return;
      L.push("  " + pad("day " + h, 26) + lpad(money(sm[k].weighted, s), 14) +
        "  weighted   " + lpad(money(sm[k].best, s), 14) + "  if everything lands");
    });
    L.push(this.kv("low point", money(sm.low_point.cents, s) + " on " + sm.low_point.on));
    if (sm.low_point.cents < 0)
      L.push("\n  You run out of money on " + sm.low_point.on + ". That is the number that matters.");
    if ((args || []).indexOf("--detail") >= 0) {
      L.push(this.head("Every movement"));
      timeline.forEach(function (e) {
        L.push("  " + iso(e.date) + "  " + lpad(money(e.cents, s), 12) + "  " +
          lpad(Math.trunc(e.confidence * 100), 3) + "%  " + pad(clip(e.label, 34), 34) + " " +
          lpad(money(e.weighted, s), 14));
      });
    }
    L.push("");
    return this.out(L);
  };

  /* ------------------------------------------------------------- margin */
  P.cmdMargin = function (args) {
    var self = this, s = this.sym, target = parseFloat(this.cfg.target_margin_pct || 0);
    var rows = [];
    this.load("projects").forEach(function (p) {
      if (args && args.length && args.indexOf(p.id) < 0 && args.indexOf(p.name) < 0) return;
      var m = self.projectMargin(p.id);
      if (m.revenue === 0 && m.expenses === 0 && m.minutes === 0) return;
      rows.push([p, m]);
    });
    var finished = rows.filter(function (r) { return ["done", "cancelled"].indexOf(r[0].status) >= 0; });
    var running = rows.filter(function (r) { return ["done", "cancelled"].indexOf(r[0].status) < 0; });
    var L = [];
    function block(title, group, judge) {
      if (!group.length) return;
      L.push(self.head(title));
      L.push("  " + pad("project", 28) + " " + lpad("revenue", 11) + " " + lpad("cost", 11) +
        " " + lpad("profit", 11) + " " + lpad("margin", 8));
      group.slice().sort(function (a, b) { return a[1].margin_pct - b[1].margin_pct; })
        .forEach(function (pair) {
          var p = pair[0], m = pair[1];
          var flag = (judge && m.revenue && m.margin_pct < target) ? "  under target" : "";
          L.push("  " + pad(clip(p.name, 28), 28) + " " + lpad(money(m.revenue, s), 11) + " " +
            lpad(money(m.expenses + m.labour, s), 11) + " " + lpad(money(m.profit, s), 11) + " " +
            lpad(f1(m.margin_pct), 7) + "%" + flag);
        });
    }
    block("Finished work   (target " + Math.trunc(target) + "%)", finished, true);
    block("Still running   (partly billed, judge nothing yet)", running, false);
    if (!rows.length) { L.push(this.head("Margin")); L.push("  No project has money or time against it yet."); }
    if (finished.length) {
      var rev = finished.reduce(function (a, r) { return a + r[1].revenue; }, 0);
      var prof = finished.reduce(function (a, r) { return a + r[1].profit; }, 0);
      L.push("\n  " + pad("all finished work", 28) + " " + lpad(money(rev, s), 11) + " " +
        lpad(money(prof, s), 23) + " " + lpad(f1(rev ? prof / rev * 100.0 : 0.0), 7) + "%");
    }
    L.push("");
    return this.out(L);
  };

  /* ------------------------------------------------------------- tax, capacity, week */
  P.cmdTax = function () {
    var t = this.taxSetAside(), s = this.sym, L = [];
    L.push(this.head("Tax set aside   " + t.from + " to " + t.to));
    L.push(this.kv("collected", money(t.income, s)));
    L.push(this.kv("spent", money(t.expenses, s)));
    L.push(this.kv("net", money(t.net, s)));
    L.push(this.kv("set aside at " + Math.trunc(t.pct) + "%", money(t.set_aside, s)));
    L.push("\n  This is an estimate for planning, not a tax filing. Give it to whoever");
    L.push("  does your return.");
    L.push("");
    return this.out(L);
  };
  P.cmdCapacity = function () {
    var c = this.capacity(), L = [];
    L.push(this.head("Capacity through " + c.through));
    L.push(this.kv("committed", f1(c.committed_hours) + " hours"));
    L.push(this.kv("available", f1(c.available_hours) + " hours"));
    L.push(this.kv("load", f1(c.load_pct) + "%"));
    if (c.load_pct > 100)
      L.push("\n  You have promised more than you can deliver. Something moves or something drops.");
    else if (c.load_pct < 50)
      L.push("\n  Half your capacity is unsold. That is a demand problem, not a delivery one.");
    L.push("");
    return this.out(L);
  };
  P.cmdWeek = function () {
    var self = this, s = this.sym, ref = this.today, start = addDays(ref, -6), L = [];
    function inWin(v) { var d = dparse(v); return d !== null && d >= start && d <= ref; }
    var paid = this.load("invoices").filter(function (i) { return i.status === "paid" && inWin(i.paid_on); });
    var sent = this.load("invoices").filter(function (i) { return inWin(i.issued); });
    var spent = this.load("expenses").filter(function (e) { return inWin(e.date); });
    var done = this.load("tasks").filter(function (t) { return t.status === "done" && inWin(t.done_on); });
    L.push(this.head("Week to " + iso(ref)));
    L.push(this.kv("collected", money(paid.reduce(function (a, i) { return a + cents(i.total); }, 0), s) +
      " across " + paid.length + " invoice(s)"));
    L.push(this.kv("invoiced", money(sent.reduce(function (a, i) { return a + cents(i.total); }, 0), s) +
      " across " + sent.length + " invoice(s)"));
    L.push(this.kv("spent", money(spent.reduce(function (a, e) { return a + cents(e.amount); }, 0), s)));
    L.push(this.kv("tasks finished", done.length));
    var stuck = this.load("tasks").filter(function (t) { return t.status === "blocked"; });
    if (stuck.length) {
      L.push(this.head("Blocked (" + stuck.length + ")"));
      stuck.forEach(function (t) {
        L.push("  " + t.id + "  " + pad(clip(t.title, 40), 40) + " " + clip(t.notes, 24));
      });
    }
    L.push("");
    return this.out(L);
  };

  /* ------------------------------------------------------------- validate, find */
  P.cmdValidate = function (args) {
    var self = this, r = this.validate(), problems = r[0], warnings = r[1], L = [];
    if (problems.length) {
      L.push(this.head("Broken data: " + problems.length));
      problems.forEach(function (p) { L.push("  " + p); });
    }
    if (warnings.length && (args || []).indexOf("--errors-only") < 0) {
      L.push(this.head("Worth your attention: " + warnings.length));
      warnings.forEach(function (w) { L.push("  " + w); });
    }
    if (!problems.length) {
      var counts = Object.keys(SCHEMA).map(function (n) { return self.load(n).length + " " + n; }).join(", ");
      L.push("\nData is sound. " + counts);
      if (warnings.length) L.push("Nothing is broken. The list above is the business asking for a decision.");
      L.push("");
      return this.out(L);
    }
    L.push("\nNothing was changed. Fix the broken rows, then run `os validate` again.\n");
    return this.out(L);
  };
  P.cmdFind = function (args) {
    var self = this, needle = (args || []).join(" ").toLowerCase(), L = [], found = 0;
    if (!needle) return "os find <text>   searches every registry";
    Object.keys(SCHEMA).forEach(function (name) {
      self.load(name).forEach(function (r) {
        var blob = Object.keys(r).map(function (k) { return r[k]; }).join(" ").toLowerCase();
        if (blob.indexOf(needle) >= 0) {
          found++;
          var label = r.name || r.title || r.label || r.number || "";
          L.push("  " + pad(name, 10) + " " + pad(r.id, 8) + " " + clip(label, 52));
        }
      });
    });
    if (!found) L.push("  Nothing matches '" + needle + "'.");
    return this.out(L);
  };
})(typeof module !== "undefined" && module.exports ? module.exports : window.OS);

/* ---------------------------------------------------------------- part three
 * The query language and the books. Ports of lib/query.py and lib/books.py.
 */
(function (API) {
  "use strict";
  var Engine = API.Engine, SCHEMA = API.SCHEMA, cents = API.cents, money = API.money,
      plain = API.plain, dparse = API.dparse, iso = API.iso, days = API.days,
      addDays = API.addDays, pad = API.pad, lpad = API.lpad, clip = API.clip;
  var P = Engine.prototype;
  var pyRound = API.pyRound;
  function f1(x) { return pyRound(x, 1).toFixed(1); }
  // Python prints a rounded float as 15.0, not 15. Match that exactly.
  function pyf(x, places) {
    var v = pyRound(x, places);
    return Number.isInteger(v) ? v.toFixed(1) : String(v);
  }
  function r1(x) { return pyf(x, 1); }

  /* ------------------------------------------------------------- virtuals */
  P.virtuals = function (entity) {
    var self = this, today = this.today;
    var names = {}, projs = {};
    this.load("contacts").forEach(function (c) { names[c.id] = c.name || c.id; });
    this.load("projects").forEach(function (p) { projs[p.id] = p.name || p.id; });
    var terms = parseInt(this.cfg.invoice_terms_days || 14, 10);
    if (entity === "invoices") return {
      contact_name: function (r) { return names[r.contact_id] || ""; },
      project_name: function (r) { return projs[r.project_id] || ""; },
      days_late: function (r) { return self.daysLate(r); },
      open_amount: function (r) { return plain(self.invoiceOpen(r)); },
      paid_lag: function (r) { return (r.paid_on && r.issued) ? days(dparse(r.paid_on), dparse(r.issued)) : ""; },
      expected_lag: function (r) { return self.payLag(r.contact_id, terms); },
      age: function (r) { return days(today, dparse(r.issued, today)); }
    };
    if (entity === "deals") return {
      contact_name: function (r) { return names[r.contact_id] || ""; },
      days_open: function (r) { return days(today, dparse(r.opened, today)); },
      weighted_value: function (r) { return plain(Math.trunc(cents(r.value) * (parseFloat(r.confidence || 0) / 100.0))); },
      days_to_close: function (r) { return r.expected_close ? days(dparse(r.expected_close), today) : ""; },
      action_overdue: function (r) {
        return ((!r.next_action_due || dparse(r.next_action_due, today) <= today) && r.status === "open") ? "yes" : "no";
      }
    };
    if (entity === "projects") return {
      contact_name: function (r) { return names[r.contact_id] || ""; },
      revenue: function (r) { return plain(self.projectMargin(r.id).revenue); },
      cost: function (r) { var m = self.projectMargin(r.id); return plain(m.expenses + m.labour); },
      profit: function (r) { return plain(self.projectMargin(r.id).profit); },
      margin_pct: function (r) { return pyf(self.projectMargin(r.id).margin_pct, 1); },
      hours: function (r) { return pyf(self.projectMargin(r.id).minutes / 60.0, 1); },
      days_over: function (r) {
        return (r.due && dparse(r.due) && dparse(r.due) < today &&
          ["done", "cancelled"].indexOf(r.status) < 0) ? days(today, dparse(r.due)) : 0;
      }
    };
    if (entity === "tasks") return {
      project_name: function (r) { return projs[r.project_id] || ""; },
      days_overdue: function (r) {
        return (r.due && dparse(r.due) && dparse(r.due) < today &&
          ["done", "dropped"].indexOf(r.status) < 0) ? days(today, dparse(r.due)) : 0;
      },
      hours: function (r) { return pyf(parseInt(r.estimate_min || 0, 10) / 60.0, 2); }
    };
    if (entity === "contacts") {
      var invs = this.load("invoices"), deals = this.load("deals");
      return {
        total_billed: function (r) {
          return plain(invs.filter(function (i) { return i.contact_id === r.id && i.status !== "draft"; })
            .reduce(function (a, i) { return a + cents(i.total); }, 0));
        },
        outstanding: function (r) {
          return plain(invs.filter(function (i) { return i.contact_id === r.id; })
            .reduce(function (a, i) { return a + self.invoiceOpen(i); }, 0));
        },
        median_pay_lag: function (r) {
          var lags = invs.filter(function (i) {
            return i.contact_id === r.id && i.status === "paid" && i.paid_on && i.issued;
          }).map(function (i) { return days(dparse(i.paid_on), dparse(i.issued)); });
          if (!lags.length) return "";
          lags.sort(function (a, b) { return a - b; });
          return lags[Math.floor(lags.length / 2)];
        },
        open_deals: function (r) {
          return deals.filter(function (x) { return x.contact_id === r.id && x.status === "open"; }).length;
        },
        days_since_contact: function (r) {
          return (r.last_contact && dparse(r.last_contact)) ? days(today, dparse(r.last_contact)) : "";
        }
      };
    }
    if (entity === "expenses") return {
      project_name: function (r) { return projs[r.project_id] || ""; },
      age: function (r) { return days(today, dparse(r.date, today)); }
    };
    if (entity === "time") return {
      project_name: function (r) { return projs[r.project_id] || ""; },
      hours: function (r) { return pyf(parseInt(r.minutes || 0, 10) / 60.0, 2); },
      value: function (r) {
        return plain(Math.trunc(parseInt(r.minutes || 0, 10) / 60.0 * cents(r.rate || self.cfg.hourly_rate)));
      }
    };
    if (entity === "recurring") return {
      annual: function (r) {
        var per = {weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, yearly: 1}[r.cadence] || 12;
        return plain(cents(r.amount) * per);
      },
      days_away: function (r) { return (r.next_date && dparse(r.next_date)) ? days(dparse(r.next_date), today) : ""; }
    };
    return {};
  };

  /* ------------------------------------------------------------- lexer */
  var TOKEN = /\s*(?:('[^']*'|"[^"]*")|(<=|>=|!=|<>|=|<|>)|([(),*])|([A-Za-z_][A-Za-z0-9_.]*)|(-?\d+(?:\.\d+)?))/y;
  function lex(s) {
    var out = [], pos = 0;
    while (pos < s.length) {
      TOKEN.lastIndex = pos;
      var m = TOKEN.exec(s);
      if (!m) {
        if (/\s/.test(s[pos])) { pos++; continue; }
        throw new Error("cannot read '" + s[pos] + "' at position " + pos);
      }
      pos = TOKEN.lastIndex;
      if (m[1] !== undefined) out.push(["str", m[1]]);
      else if (m[2] !== undefined) out.push(["op", m[2]]);
      else if (m[3] !== undefined) out.push(["punct", m[3]]);
      else if (m[4] !== undefined) out.push(["word", m[4]]);
      else out.push(["num", m[5]]);
    }
    return out;
  }
  P.coerce = function (v) {
    if (typeof v !== "string") return v;
    var s = v.trim();
    if (s[0] === "'" || s[0] === '"') return s.slice(1, -1);
    var low = s.toLowerCase();
    if (low === "today") return iso(this.today);
    if (low === "null" || low === "blank") return "";
    var m = /^today([+-])(\d+)$/.exec(low);
    if (m) return iso(addDays(this.today, (m[1] === "+" ? 1 : -1) * parseInt(m[2], 10)));
    return v;
  };
  function asNumber(v) {
    var s = String(v).replace(/,/g, "").replace(/\$/g, "");
    if (s.trim() === "") return null;
    var f = Number(s);
    return isNaN(f) ? null : f;
  }
  P.compare = function (left, op, right) {
    right = this.coerce(right);
    var ln = asNumber(left), rn = asNumber(right), a, b;
    if (ln !== null && rn !== null) { a = ln; b = rn; }
    else { a = String(left).toLowerCase(); b = String(right).toLowerCase(); }
    switch (op) {
      case "=": case "==": return a === b;
      case "!=": case "<>": return a !== b;
      case "<": return a < b;
      case ">": return a > b;
      case "<=": return a <= b;
      case ">=": return a >= b;
    }
    throw new Error("unknown operator " + op);
  };
  function Parser(t) { this.t = t; this.i = 0; }
  Parser.prototype.peek = function () { return this.i < this.t.length ? this.t[this.i] : [null, null]; };
  Parser.prototype.next = function () { var x = this.peek(); this.i++; return x; };
  Parser.prototype.acceptWord = function (w) {
    var p = this.peek();
    if (p[0] === "word" && p[1].toLowerCase() === w) { this.next(); return true; }
    return false;
  };
  Parser.prototype.expectWord = function (w) {
    if (!this.acceptWord(w)) throw new Error("expected '" + w + "' near token " + (this.i + 1));
  };
  Parser.prototype.parse = function () {
    this.expectWord("select");
    var cols = this.colList();
    this.expectWord("from");
    var t = this.next();
    if (t[0] !== "word" || !SCHEMA[t[1]])
      throw new Error("'" + t[1] + "' is not a registry. One of: " + Object.keys(SCHEMA).join(", "));
    var entity = t[1], where = null;
    if (this.acceptWord("where")) where = this.expr();
    var order = null, dir = "asc";
    if (this.acceptWord("order")) {
      this.expectWord("by");
      order = this.next()[1];
      if (this.acceptWord("desc")) dir = "desc"; else this.acceptWord("asc");
    }
    var limit = null;
    if (this.acceptWord("limit")) limit = parseInt(this.next()[1], 10);
    return {cols: cols, entity: entity, where: where, order: order, dir: dir, limit: limit};
  };
  Parser.prototype.colList = function () {
    var cols = [];
    for (;;) {
      var p = this.peek();
      if (p[0] === "punct" && p[1] === "*") { this.next(); cols.push("*"); }
      else if (p[0] === "word") { this.next(); cols.push(p[1]); }
      else throw new Error("expected a column name");
      p = this.peek();
      if (p[0] === "punct" && p[1] === ",") { this.next(); continue; }
      break;
    }
    return cols;
  };
  Parser.prototype.expr = function () {
    var node = this.term();
    for (;;) { if (this.acceptWord("or")) node = ["or", node, this.term()]; else return node; }
  };
  Parser.prototype.term = function () {
    var node = this.factor();
    for (;;) { if (this.acceptWord("and")) node = ["and", node, this.factor()]; else return node; }
  };
  Parser.prototype.factor = function () {
    if (this.acceptWord("not")) return ["not", this.factor()];
    var p = this.peek();
    if (p[0] === "punct" && p[1] === "(") {
      this.next();
      var node = this.expr();
      if (this.next()[1] !== ")") throw new Error("missing closing bracket");
      return node;
    }
    var t = this.next();
    if (t[0] !== "word") throw new Error("expected a column name in the condition");
    var col = t[1];
    if (this.acceptWord("in")) {
      if (this.next()[1] !== "(") throw new Error("expected ( after in");
      var vals = [];
      for (;;) { var v = this.next()[1]; if (v === ")") break; if (v !== ",") vals.push(v); }
      return ["in", col, vals];
    }
    if (this.acceptWord("like")) return ["like", col, this.next()[1]];
    var o = this.next();
    if (o[0] !== "op") throw new Error("expected a comparison after '" + col + "'");
    return ["cmp", col, o[1], this.next()[1]];
  };
  P.evaluate = function (node, row) {
    var self = this;
    switch (node[0]) {
      case "and": return this.evaluate(node[1], row) && this.evaluate(node[2], row);
      case "or": return this.evaluate(node[1], row) || this.evaluate(node[2], row);
      case "not": return !this.evaluate(node[1], row);
      case "cmp": return this.compare(row[node[1]] === undefined ? "" : row[node[1]], node[2], node[3]);
      case "in":
        var vals = node[2].map(function (v) { return String(self.coerce(v)).toLowerCase(); });
        return vals.indexOf(String(row[node[1]] === undefined ? "" : row[node[1]]).toLowerCase()) >= 0;
      case "like":
        var pat = String(this.coerce(node[2])).toLowerCase().replace(/%/g, ".*");
        return new RegExp(pat).test(String(row[node[1]] === undefined ? "" : row[node[1]]).toLowerCase());
    }
    throw new Error("bad condition");
  };
  P.query = function (text) {
    var self = this, plan = new Parser(lex(text)).parse(), entity = plan.entity;
    var vcols = this.virtuals(entity), rows = [];
    this.load(entity).forEach(function (r) {
      var full = Object.assign({}, r);
      Object.keys(vcols).forEach(function (n) {
        try { full[n] = vcols[n](r); } catch (e) { full[n] = ""; }
      });
      rows.push(full);
    });
    if (plan.where) rows = rows.filter(function (r) { return self.evaluate(plan.where, r); });
    if (plan.order) {
      var col = plan.order;
      rows = rows.map(function (r, i) { return [r, i]; });
      rows.sort(function (A, B) {
        var a = A[0][col], b = B[0][col];
        var an = asNumber(a), bn = asNumber(b);
        var ka = an !== null ? [0, an, ""] : [1, 0, String(a === undefined ? "" : a).toLowerCase()];
        var kb = bn !== null ? [0, bn, ""] : [1, 0, String(b === undefined ? "" : b).toLowerCase()];
        for (var i = 0; i < 3; i++) {
          if (ka[i] < kb[i]) return plan.dir === "desc" ? 1 : -1;
          if (ka[i] > kb[i]) return plan.dir === "desc" ? -1 : 1;
        }
        return A[1] - B[1];
      });
      rows = rows.map(function (x) { return x[0]; });
    }
    if (plan.limit) rows = rows.slice(0, plan.limit);
    var cols = plan.cols;
    if (cols.length === 1 && cols[0] === "*") cols = SCHEMA[entity].cols;
    var unknown = cols.filter(function (c) { return SCHEMA[entity].cols.indexOf(c) < 0 && !vcols[c]; });
    if (unknown.length)
      throw new Error("no column '" + unknown[0] + "' on " + entity + ". Available: " +
        SCHEMA[entity].cols.concat(Object.keys(vcols).sort()).join(", "));
    return [cols, rows.map(function (r) {
      var o = {}; cols.forEach(function (c) { o[c] = r[c] === undefined ? "" : r[c]; }); return o;
    })];
  };
  var MONEYISH = ["amount", "total", "value", "revenue", "cost", "profit", "budget",
                  "rate", "outstanding", "billed", "annual", "weighted"];
  P.cmdQuery = function (args) {
    var self = this;
    if (!args.length) return "  Give it a query. Try:  query select number, contact_name, days_late from invoices where days_late > 0";
    if (args[0] === "--columns") {
      var ent = args[1];
      if (!SCHEMA[ent]) return "  Pick a registry: " + Object.keys(SCHEMA).join(", ");
      return this.head("Columns on " + ent) + "\n  stored:   " + SCHEMA[ent].cols.join(", ") +
        "\n  computed: " + Object.keys(this.virtuals(ent)).sort().join(", ") + "\n";
    }
    var res;
    try { res = this.query(args.join(" ")); }
    catch (e) { return "\n  " + e.message + "\n"; }
    var cols = res[0], rows = res[1];
    if (!rows.length) return "\n  No rows match.\n";
    function fmt(col, v) {
      var hit = MONEYISH.some(function (m) { return col.indexOf(m) >= 0; });
      var digits = String(v).replace(/\./g, "").replace(/-/g, "");
      if (hit && digits.length > 0 && /^[0-9]+$/.test(digits)) return money(cents(v), self.sym);
      return String(v);
    }
    var shown = rows.map(function (r) {
      var o = {}; cols.forEach(function (c) { o[c] = fmt(c, r[c]); }); return o;
    });
    var w = {};
    cols.forEach(function (c) {
      w[c] = Math.max(c.length, Math.max.apply(null, shown.map(function (r) { return String(r[c]).length; })));
    });
    var L = [this.head(rows.length + " row" + (rows.length === 1 ? "" : "s"))];
    L.push("  " + cols.map(function (c) { return pad(c, w[c]); }).join("  "));
    L.push("  " + cols.map(function (c) { return new Array(w[c] + 1).join("-"); }).join("  "));
    shown.forEach(function (r) { L.push("  " + cols.map(function (c) { return pad(r[c], w[c]); }).join("  ")); });
    L.push("");
    return L.join("\n");
  };

  /* ------------------------------------------------------------- books */
  var BANK = "1000", RECEIVABLE = "1100", TAX_HELD = "2100", CAPITAL = "3000",
      SALES = "4000", DIRECT = "5000", OTHER = "6900";
  P.accounts = function () {
    var out = {};
    (this.ws.accounts || []).forEach(function (a) { out[a.code] = a; });
    return out;
  };
  P.categoryMap = function () {
    var MAP = {materials: "5000", subcontractor: "5000", manufacturing: "5000",
      packaging: "5000", fulfilment: "5000", stock: "1200", fuel: "6100",
      vehicle: "6100", travel: "6100", premises: "6200", rent: "6200", studio: "6200",
      software: "6300", overhead: "6300", phone: "6300", platform: "6300",
      insurance: "6400", compliance: "6400", licence: "6400", tools: "6900",
      marketing: "6900", supervision: "6900", training: "6900", fees: "6900"};
    var out = {};
    Object.keys(MAP).forEach(function (k) { out[k] = MAP[k]; });
    this.load("expenses").forEach(function (e) {
      var c = (e.category || "").trim().toLowerCase();
      if (c && !out[c]) out[c] = OTHER;
    });
    return out;
  };
  function line(entry, date, account, debit, credit, memo, stype, sid) {
    return {entry: entry, date: date || "", account: account,
      debit: debit ? plain(debit) : "", credit: credit ? plain(credit) : "",
      memo: memo, source_type: stype, source_id: sid};
  }
  P.derive = function () {
    var self = this, cmap = this.categoryMap(), entries = [];
    var opening = cents(this.cfg.opening_cash);
    var openDate = this.cfg.books_open_date || iso(this.today);
    if (opening) entries.push([
      line("OPEN", openDate, BANK, opening, 0, "Opening balance", "opening", "opening"),
      line("OPEN", openDate, CAPITAL, 0, opening, "Opening balance", "opening", "opening")]);
    this.load("invoices").forEach(function (inv) {
      if (inv.status === "draft") return;
      var total = cents(inv.total), sub = cents(inv.subtotal) || total, tax = cents(inv.tax);
      if (sub + tax !== total) { sub = total - tax; }
      var num = inv.number || inv.id, e = "INV-" + inv.id;
      var lines = [line(e, inv.issued, RECEIVABLE, total, 0, "Invoice " + num, "invoice", inv.id),
                   line(e, inv.issued, SALES, 0, sub, "Invoice " + num, "invoice", inv.id)];
      if (tax) lines.push(line(e, inv.issued, TAX_HELD, 0, tax, "Tax on " + num, "invoice", inv.id));
      entries.push(lines);
      if (inv.status === "paid" && inv.paid_on) {
        entries.push([line("PAY-" + inv.id, inv.paid_on, BANK, total, 0, "Payment of " + num, "payment", inv.id),
                      line("PAY-" + inv.id, inv.paid_on, RECEIVABLE, 0, total, "Payment of " + num, "payment", inv.id)]);
      } else if (inv.status === "written_off") {
        var d = inv.due || inv.issued;
        entries.push([line("WO-" + inv.id, d, OTHER, total, 0, "Written off " + num, "writeoff", inv.id),
                      line("WO-" + inv.id, d, RECEIVABLE, 0, total, "Written off " + num, "writeoff", inv.id)]);
      }
    });
    this.load("expenses").forEach(function (ex) {
      var amt = cents(ex.amount); if (!amt) return;
      var cat = (ex.category || "").trim().toLowerCase();
      var acct = cmap[cat] || OTHER;
      if (ex.project_id) acct = cmap[cat] || DIRECT;
      var memo = ((ex.vendor || "") + " " + (ex.category || "")).trim();
      entries.push([line("EXP-" + ex.id, ex.date, acct, amt, 0, memo, "expense", ex.id),
                    line("EXP-" + ex.id, ex.date, BANK, 0, amt, memo, "expense", ex.id)]);
    });
    return entries;
  };
  P.getJournal = function () {
    if (this.journal) return this.journal;
    var rows = [];
    this.derive().forEach(function (lines) { lines.forEach(function (l) { rows.push(Object.assign({}, l)); }); });
    rows = rows.map(function (r, i) { return [r, i]; });
    rows.sort(function (A, B) {
      var a = A[0], b = B[0];
      if ((a.date || "") < (b.date || "")) return -1;
      if ((a.date || "") > (b.date || "")) return 1;
      if ((a.entry || "") < (b.entry || "")) return -1;
      if ((a.entry || "") > (b.entry || "")) return 1;
      return A[1] - B[1];
    });
    this.journal = rows.map(function (x, i) {
      x[0].id = "j" + String(i + 1).padStart(5, "0");
      return x[0];
    });
    return this.journal;
  };
  P.balances = function (upto, frm) {
    var out = {};
    this.getJournal().forEach(function (r) {
      var dt = r.date || "";
      if (upto && dt > upto) return;
      if (frm && dt < frm) return;
      out[r.account] = (out[r.account] || 0) + cents(r.debit) - cents(r.credit);
    });
    return out;
  };
  P.pnl = function (frm, to) {
    var acc = this.accounts(), bal = this.balances(to, frm), income = [], expense = [];
    Object.keys(bal).sort().forEach(function (code) {
      var kind = (acc[code] || {}).kind || "", name = (acc[code] || {}).name || code, v = bal[code];
      if (kind === "income") income.push({code: code, name: name, amount: -v});
      else if (kind === "expense") expense.push({code: code, name: name, amount: v});
    });
    var ti = income.reduce(function (a, r) { return a + r.amount; }, 0);
    var te = expense.reduce(function (a, r) { return a + r.amount; }, 0);
    return {income: income, expense: expense, total_income: ti, total_expense: te,
      profit: ti - te, margin_pct: ti ? (ti - te) / ti * 100.0 : 0.0};
  };
  P.balanceSheet = function (upto) {
    var acc = this.accounts(), bal = this.balances(upto), assets = [], liabilities = [], equity = [];
    var pl = this.pnl(null, upto);
    Object.keys(bal).sort().forEach(function (code) {
      var kind = (acc[code] || {}).kind || "", name = (acc[code] || {}).name || code, v = bal[code];
      if (kind === "asset") assets.push({code: code, name: name, amount: v});
      else if (kind === "liability") liabilities.push({code: code, name: name, amount: -v});
      else if (kind === "equity") equity.push({code: code, name: name, amount: -v});
    });
    var ta = assets.reduce(function (a, r) { return a + r.amount; }, 0);
    var tl = liabilities.reduce(function (a, r) { return a + r.amount; }, 0);
    var te = equity.reduce(function (a, r) { return a + r.amount; }, 0);
    return {assets: assets, liabilities: liabilities, equity: equity, total_assets: ta,
      total_liabilities: tl, total_equity: te, retained: pl.profit,
      check: ta - (tl + te + pl.profit)};
  };
  P.booksCheck = function () {
    var self = this, problems = [], notes = [], rows = this.getJournal();
    if (!rows.length) return [["the journal is empty, run `os books post`"], []];
    var byEntry = {};
    rows.forEach(function (r) { byEntry[r.entry] = (byEntry[r.entry] || 0) + cents(r.debit) - cents(r.credit); });
    Object.keys(byEntry).sort().forEach(function (k) {
      if (byEntry[k] !== 0) problems.push("entry " + k + " does not balance, out by " + money(byEntry[k], self.sym));
    });
    notes.push(problems.length ? Object.keys(byEntry).length + " entries checked"
      : Object.keys(byEntry).length + " entries, all balanced");
    var tb = rows.reduce(function (a, r) { return a + cents(r.debit) - cents(r.credit); }, 0);
    if (tb !== 0) problems.push("trial balance does not net to zero, out by " + money(tb, this.sym));
    else notes.push("trial balance nets to zero");
    var arBooks = this.balances()[RECEIVABLE] || 0, ag = this.aging(), arReport = 0;
    Object.keys(ag).forEach(function (k) { ag[k].forEach(function (r) { arReport += r[1]; }); });
    if (arBooks !== arReport)
      problems.push("money owed disagrees: books say " + money(arBooks, this.sym) +
        ", the aging report says " + money(arReport, this.sym));
    else notes.push("money owed ties to the aging report at " + money(arBooks, this.sym));
    return [problems, notes];
  };
  P.cmdBooks = function (args) {
    var self = this, sub = args[0] || "trial", s = this.sym, L = [];
    if (sub === "check") {
      var r = this.booksCheck();
      L.push(this.head("Books check"));
      r[1].forEach(function (n) { L.push("  ok    " + n); });
      r[0].forEach(function (p) { L.push("  WRONG " + p); });
      L.push("\n  " + (r[0].length ?
        "Fix the lines marked WRONG, then run `os books post` and check again." :
        "The books agree with the reports."));
      L.push("");
      return L.join("\n");
    }
    if (sub === "pnl" || sub === "profit") {
      var frm = args[1] || null, to = args[2] || null, r2 = this.pnl(frm, to);
      L.push(this.head("Profit and loss" + "  " + (frm || "the beginning") + " to " + (to || "today")));
      r2.income.forEach(function (row) { L.push("  " + pad(row.name, 34) + " " + lpad(money(row.amount, s), 14)); });
      L.push("  " + pad("income", 34) + " " + lpad(money(r2.total_income, s), 14));
      L.push("");
      r2.expense.forEach(function (row) { L.push("  " + pad(row.name, 34) + " " + lpad(money(row.amount, s), 14)); });
      L.push("  " + pad("costs", 34) + " " + lpad(money(r2.total_expense, s), 14));
      L.push("\n  " + pad("profit", 34) + " " + lpad(money(r2.profit, s), 14) + "   " + f1(r2.margin_pct) + "%");
      L.push("");
      return L.join("\n");
    }
    if (sub === "balance" || sub === "sheet") {
      var upto = args[1] || null, r3 = this.balanceSheet(upto);
      L.push(this.head("Balance sheet" + (upto ? "  as at " + upto : "")));
      L.push("  what you have");
      r3.assets.forEach(function (row) { L.push("    " + pad(row.name, 32) + " " + lpad(money(row.amount, s), 14)); });
      L.push("    " + pad("total", 32) + " " + lpad(money(r3.total_assets, s), 14));
      L.push("\n  what you owe");
      r3.liabilities.forEach(function (row) { L.push("    " + pad(row.name, 32) + " " + lpad(money(row.amount, s), 14)); });
      L.push("    " + pad("total", 32) + " " + lpad(money(r3.total_liabilities, s), 14));
      L.push("\n  what is yours");
      r3.equity.forEach(function (row) { L.push("    " + pad(row.name, 32) + " " + lpad(money(row.amount, s), 14)); });
      L.push("    " + pad("profit this period", 32) + " " + lpad(money(r3.retained, s), 14));
      L.push("    " + pad("total", 32) + " " + lpad(money(r3.total_equity + r3.retained, s), 14));
      L.push("\n  " + pad("balances", 34) + " " + (r3.check === 0 ? "yes" : "NO, out by " + money(r3.check, s)));
      L.push("");
      return L.join("\n");
    }
    if (sub === "accounts") {
      L.push(this.head("Chart of accounts"));
      var acc = this.accounts();
      Object.keys(acc).forEach(function (code) {
        var a = acc[code];
        L.push("  " + pad(code, 6) + " " + pad(a.name, 28) + " " + pad(a.kind, 10) + " " + (a.notes || ""));
      });
      L.push("");
      return L.join("\n");
    }
    var acc2 = this.accounts(), bal = this.balances(args[1] || null), rows = [];
    Object.keys(acc2).concat(Object.keys(bal)).filter(function (v, i, a) { return a.indexOf(v) === i; })
      .sort().forEach(function (code) {
        var v = bal[code] || 0; if (v === 0) return;
        rows.push({code: code, name: (acc2[code] || {}).name || code,
          debit: v > 0 ? v : 0, credit: v < 0 ? -v : 0});
      });
    L.push(this.head("Trial balance"));
    L.push("  " + pad("code", 6) + " " + pad("account", 30) + " " + lpad("debit", 13) + " " + lpad("credit", 13));
    var td = 0, tc = 0;
    rows.forEach(function (r) {
      td += r.debit; tc += r.credit;
      L.push("  " + pad(r.code, 6) + " " + pad(r.name, 30) + " " +
        lpad(r.debit ? money(r.debit, s) : "", 13) + " " + lpad(r.credit ? money(r.credit, s) : "", 13));
    });
    L.push("  " + pad("", 6) + " " + pad("", 30) + " " + lpad(money(td, s), 13) + " " + lpad(money(tc, s), 13));
    L.push("\n  " + (td === tc ? "Balanced." : "NOT balanced, out by " + money(td - tc, s)));
    L.push("\n  Subcommands: post, check, pnl, balance, accounts, entry\n");
    return L.join("\n");
  };
})(typeof module !== "undefined" && module.exports ? module.exports : window.OS);

/* ----------------------------------------------------------------- part four
 * Simulation, anomalies, and the dispatcher the terminal talks to.
 *
 * The simulation runs in your browser with its own random number generator, so
 * its percentages differ slightly from the same command in the repo. Everything
 * above this line is deterministic and matches the python engine exactly.
 */
(function (API) {
  "use strict";
  var Engine = API.Engine, SCHEMA = API.SCHEMA, cents = API.cents, money = API.money,
      plain = API.plain, dparse = API.dparse, iso = API.iso, days = API.days,
      addDays = API.addDays, pad = API.pad, lpad = API.lpad, clip = API.clip, advance = API.advance;
  var P = Engine.prototype;
  var pyRound = API.pyRound;
  function f1(x) { return pyRound(x, 1).toFixed(1); }

  function Rng(seed) { this.s = seed >>> 0; }
  Rng.prototype.next = function () {
    this.s = (this.s * 1664525 + 1013904223) >>> 0;
    return this.s / 4294967296;
  };
  Rng.prototype.gauss = function (mu, sd) {
    var u = Math.max(1e-9, this.next()), v = this.next();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  Rng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };

  function collectionProbability(late) {
    if (late <= 0) return 0.97;
    if (late <= 30) return 0.93;
    if (late <= 60) return 0.78;
    if (late <= 90) return 0.55;
    return 0.3;
  }
  P.matchesRecurring = function (exp, recurring) {
    var amt = cents(exp.amount), vendor = (exp.vendor || "").trim().toLowerCase(),
        cat = (exp.category || "").trim().toLowerCase();
    return recurring.some(function (r) {
      if (r.type !== "cost") return false;
      var ramt = cents(r.amount), rlabel = (r.label || "").trim().toLowerCase(),
          rcat = (r.category || "").trim().toLowerCase();
      var near = ramt && Math.abs(amt - ramt) <= Math.max(200, ramt * 0.1);
      return near && (cat === rcat || (vendor && (rlabel.indexOf(vendor) >= 0 || vendor.indexOf(rlabel) >= 0)));
    });
  };
  P.overheadPerWeek = function () {
    var self = this, window = addDays(this.today, -180), recurring = this.load("recurring"), rows = [];
    this.load("expenses").forEach(function (e) {
      if (e.project_id) return;
      var dt = dparse(e.date);
      if (!dt || dt < window || dt > self.today) return;
      if (self.matchesRecurring(e, recurring)) return;
      rows.push([dt, cents(e.amount)]);
    });
    if (!rows.length) return [0, 0.3];
    var first = Math.min.apply(null, rows.map(function (r) { return r[0]; }));
    var spanDays = Math.max(7, days(this.today, first));
    var spanWeeks = Math.max(1, Math.round(spanDays / 7));
    var weeks = {};
    rows.forEach(function (r) {
      var i = Math.floor(days(r[0], first) / 7);
      weeks[i] = (weeks[i] || 0) + r[1];
    });
    var vals = [];
    for (var i = 0; i < spanWeeks; i++) vals.push(weeks[i] || 0);
    vals.sort(function (a, b) { return a - b; });
    var keep = vals.slice(0, Math.max(1, Math.floor(vals.length * 0.9)));
    var avg = keep.reduce(function (a, b) { return a + b; }, 0) / keep.length;
    var sd = Math.sqrt(keep.reduce(function (a, b) { return a + Math.pow(b - avg, 2); }, 0) / keep.length);
    var spread = avg ? Math.min(0.9, Math.max(0.15, sd / avg)) : 0.45;
    return [Math.round(avg), spread];
  };
  P.simulate = function (opts) {
    opts = opts || {};
    var self = this, trials = opts.trials || 1200, horizon = opts.horizon || 90;
    var forcePaid = opts.forcePaid || null;
    var terms = parseInt(this.cfg.invoice_terms_days || 14, 10);
    var opening = cents(this.cfg.opening_cash), rng = new Rng(7);
    var invoices = this.load("invoices").filter(function (i) { return self.invoiceOpen(i) > 0; });
    var deals = this.load("deals").filter(function (d) {
      return d.status === "open" && dparse(d.expected_close) &&
        dparse(d.expected_close) <= addDays(self.today, horizon);
    });
    var oh = this.overheadPerWeek(), weekly = oh[0], spread = oh[1];
    var lagCache = {};
    invoices.forEach(function (inv) {
      var cid = inv.contact_id;
      if (lagCache[cid]) return;
      var lags = [];
      self.load("invoices").forEach(function (i) {
        if (i.contact_id === cid && i.status === "paid" && i.issued && i.paid_on)
          lags.push(Math.max(0, days(dparse(i.paid_on), dparse(i.issued))));
      });
      lagCache[cid] = lags;
    });
    var fixed = [];
    this.load("recurring").forEach(function (rec) {
      var nxt = dparse(rec.next_date); if (!nxt) return;
      var sign = rec.type === "income" ? 1 : -1, amt = cents(rec.amount) * sign;
      var cur = nxt, guard = 0;
      while (cur <= addDays(self.today, horizon) && guard < 400) {
        if (cur >= self.today) fixed.push([days(cur, self.today), amt]);
        cur = advance(cur, rec.cadence || "monthly"); guard++;
      }
    });
    var at30 = [], at60 = [], at90 = [], mins = [], ruin = 0, ruinDays = [];
    for (var t = 0; t < trials; t++) {
      var ev = fixed.slice();
      invoices.forEach(function (inv) {
        var amt = self.invoiceOpen(inv), late = self.daysLate(inv);
        var certain = forcePaid && inv.id === forcePaid;
        var p = certain ? 1.0 : collectionProbability(late);
        if (rng.next() > p) return;
        var lag;
        if (certain) lag = terms;
        else {
          var lags = lagCache[inv.contact_id];
          if (lags && lags.length >= 2) lag = Math.max(0, Math.round(rng.pick(lags) * (0.75 + rng.next() * 0.6)));
          else lag = Math.max(0, Math.round(rng.gauss(terms * 1.35, terms * 0.6)));
        }
        var day = Math.max(0, days(addDays(dparse(inv.issued, self.today), lag), self.today));
        if (day <= horizon) ev.push([day, amt]);
      });
      deals.forEach(function (dl) {
        var conf = parseFloat(dl.confidence || 0) / 100.0;
        if (rng.next() > conf) return;
        var day = days(dparse(dl.expected_close), self.today) + terms + Math.round(rng.gauss(0, 6));
        if (day >= 0 && day <= horizon) ev.push([day, cents(dl.value)]);
      });
      if (weekly) {
        for (var wk = 1; wk <= Math.floor(horizon / 7); wk++)
          ev.push([wk * 7, -Math.round(weekly * Math.max(0.15, rng.gauss(1.0, spread)))]);
      }
      ev.sort(function (a, b) { return a[0] - b[0]; });
      var bal = opening, lo = opening, firstBelow = null, c30 = null, c60 = null, c90 = null;
      for (var i = 0; i < ev.length; i++) {
        bal += ev[i][1];
        if (bal < lo) lo = bal;
        if (bal < 0 && firstBelow === null) firstBelow = ev[i][0];
        if (ev[i][0] <= 30) c30 = bal;
        if (ev[i][0] <= 60) c60 = bal;
        if (ev[i][0] <= 90) c90 = bal;
      }
      at30.push(c30 === null ? opening : c30);
      at60.push(c60 === null ? opening : c60);
      at90.push(c90 === null ? opening : c90);
      mins.push(lo);
      if (firstBelow !== null) { ruin++; ruinDays.push(firstBelow); }
    }
    function pct(v, p) {
      v = v.slice().sort(function (a, b) { return a - b; });
      if (!v.length) return 0;
      return v[Math.min(v.length - 1, Math.max(0, Math.round((v.length - 1) * p)))];
    }
    ruinDays.sort(function (a, b) { return a - b; });
    return {trials: trials, horizon: horizon, opening: opening,
      d30: {p10: pct(at30, .1), p50: pct(at30, .5), p90: pct(at30, .9)},
      d60: {p10: pct(at60, .1), p50: pct(at60, .5), p90: pct(at60, .9)},
      d90: {p10: pct(at90, .1), p50: pct(at90, .5), p90: pct(at90, .9)},
      low: {p10: pct(mins, .1), p50: pct(mins, .5), p90: pct(mins, .9)},
      ruin_pct: Math.round(ruin * 1000 / trials) / 10,
      ruin_day_p50: ruinDays.length ? ruinDays[Math.floor(ruinDays.length / 2)] : null,
      invoices_modelled: invoices.length, deals_modelled: deals.length,
      overhead_per_week: weekly};
  };
  P.cmdSim = function (args) {
    var horizon = 90, trials = 1200, s = this.sym;
    (args || []).forEach(function (a) {
      if (/^\d+$/.test(a)) horizon = parseInt(a, 10);
      if (a.indexOf("--trials=") === 0) trials = Math.max(200, Math.min(6000, parseInt(a.split("=")[1], 10)));
    });
    var r = this.simulate({trials: trials, horizon: horizon}), L = [];
    L.push(this.head("Cash simulation   " + r.trials + " runs over " + r.horizon + " days"));
    L.push("  " + pad("", 12) + " " + lpad("bad case", 14) + " " + lpad("middle", 14) + " " + lpad("good case", 14));
    L.push("  " + pad("", 12) + " " + lpad("1 in 10", 14) + " " + lpad("half the time", 14) + " " + lpad("1 in 10", 14));
    [["d30", "day 30"], ["d60", "day 60"], ["d90", "day 90"], ["low", "lowest"]].forEach(function (p) {
      var k = p[0]; if (!r[k]) return;
      L.push("  " + pad(p[1], 12) + " " + lpad(money(r[k].p10, s), 14) + " " +
        lpad(money(r[k].p50, s), 14) + " " + lpad(money(r[k].p90, s), 14));
    });
    L.push("");
    if (r.ruin_pct > 0) {
      L.push("  You run out of money in " + r.ruin_pct + "% of runs.");
      if (r.ruin_day_p50 !== null)
        L.push("  When it happens, it usually happens around day " + r.ruin_day_p50 + ".");
    } else {
      L.push("  You do not run out of money in any of " + r.trials + " runs.");
    }
    L.push("\n  Modelled: " + r.invoices_modelled + " unpaid invoices, " + r.deals_modelled +
      " open deals, " + money(r.overhead_per_week, s) + " a week of overhead.");
    L.push("  Payment timing comes from each customer's own history where there is any.");
    L.push("  This one runs in your browser, so the percentages move a little between runs.");
    L.push("");
    return L.join("\n");
  };
  P.cmdWhatFirst = function () {
    var self = this, s = this.sym, base = this.simulate({trials: 600});
    var names = {};
    this.load("contacts").forEach(function (c) { names[c.id] = c.name || c.id; });
    var invoices = this.load("invoices").filter(function (i) { return self.invoiceOpen(i) > 0; })
      .sort(function (a, b) { return self.invoiceOpen(b) - self.invoiceOpen(a); }).slice(0, 5);
    var rows = invoices.map(function (inv) {
      var alt = self.simulate({trials: 600, forcePaid: inv.id});
      return {number: inv.number || inv.id, who: names[inv.contact_id] || "",
        amount: self.invoiceOpen(inv), before: base.ruin_pct, after: alt.ruin_pct,
        delta: Math.round((base.ruin_pct - alt.ruin_pct) * 10) / 10,
        gain: alt.d90.p10 - base.d90.p10};
    });
    rows.sort(function (a, b) { return (b.delta - a.delta) || (b.gain - a.gain); });
    var L = [this.head("What to chase first")];
    if (base.ruin_pct === 0) {
      L.push("  You do not run out of money in any run, so nothing here is urgent");
      L.push("  for survival. The ranking below is by how much each collection");
      L.push("  lifts your bad case at day 90.\n");
    } else {
      L.push("  Right now you run out of money in " + base.ruin_pct + "% of runs.");
      L.push("  Each line shows what happens to that number if this one gets paid.\n");
    }
    L.push("  " + pad("invoice", 10) + " " + pad("customer", 20) + " " + lpad("amount", 11) +
      "  " + lpad("risk of running out", 16) + "  " + lpad("bad case gain", 14));
    rows.forEach(function (r) {
      L.push("  " + pad(r.number, 10) + " " + pad(clip(r.who, 20), 20) + " " + lpad(money(r.amount, s), 11) +
        "  " + lpad(r.before, 7) + "% to " + lpad(r.after, 5) + "%  " + lpad(money(r.gain, s), 14));
    });
    L.push("\n  Ranked by the change in odds, not by the size of the invoice.");
    L.push("  The biggest invoice is often not the one that matters most.\n");
    return L.join("\n");
  };

  P.anomalies = function () {
    var self = this, found = [], s = this.sym;
    var expenses = this.load("expenses"), invoices = this.load("invoices"), projects = this.load("projects");
    var contacts = {};
    this.load("contacts").forEach(function (c) { contacts[c.id] = c; });
    var seen = {};
    expenses.forEach(function (e) {
      var key = (e.vendor || "").trim().toLowerCase() + "|" + cents(e.amount);
      (seen[key] = seen[key] || []).push(e);
    });
    Object.keys(seen).forEach(function (key) {
      var rows = seen[key], amt = cents(rows[0].amount);
      if (rows.length < 2 || !amt) return;
      rows.sort(function (a, b) { return dparse(a.date, 0) - dparse(b.date, 0); });
      for (var i = 0; i < rows.length - 1; i++) {
        var da = dparse(rows[i].date), db = dparse(rows[i + 1].date);
        if (da && db && Math.abs(days(db, da)) <= 3)
          found.push({severity: "high", kind: "possible duplicate",
            what: (rows[i].vendor || "a supplier") + " charged " + money(amt, s) + " twice within 3 days",
            evidence: rows[i].id + " on " + rows[i].date + " and " + rows[i + 1].id + " on " + rows[i + 1].date});
      }
    });
    var byCat = {};
    expenses.forEach(function (e) {
      if (e.project_id) return;
      var c = (e.category || "uncategorised").toLowerCase();
      (byCat[c] = byCat[c] || []).push(e);
    });
    Object.keys(byCat).forEach(function (cat) {
      var rows = byCat[cat], amts = rows.map(function (r) { return cents(r.amount); });
      if (amts.length < 4) return;
      var sorted = amts.slice().sort(function (a, b) { return a - b; });
      var med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      var mean = amts.reduce(function (a, b) { return a + b; }, 0) / amts.length;
      var sd = Math.sqrt(amts.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / amts.length) || 1;
      rows.forEach(function (r) {
        var v = cents(r.amount);
        if (med && v > med * 3 && (v - med) / sd > 1.5)
          found.push({severity: "medium", kind: "unusual spend",
            what: money(v, s) + " at " + (r.vendor || "a supplier") + " is " +
              (Math.round(v / med * 10) / 10) + "x your usual " + cat + " spend",
            evidence: r.id + " on " + r.date + ", usual is " + money(Math.round(med), s)});
      });
    });
    projects.forEach(function (p) {
      if (p.status !== "done") return;
      var m = self.projectMargin(p.id);
      if (m.minutes > 0 && m.revenue === 0)
        found.push({severity: "high", kind: "unbilled work",
          what: p.name + " is finished with " + (Math.round(m.minutes / 60 * 10) / 10) +
            " hours logged and nothing invoiced",
          evidence: "project " + p.id + ", closed " + (p.closed_on || "date not set")});
    });
    var window = addDays(this.today, -180), billed = {}, total = 0;
    invoices.forEach(function (inv) {
      var dt = dparse(inv.issued);
      if (dt && dt >= window && inv.status !== "draft") {
        billed[inv.contact_id] = (billed[inv.contact_id] || 0) + cents(inv.total);
        total += cents(inv.total);
      }
    });
    if (total) {
      var pairs = Object.keys(billed).map(function (k) { return [billed[k] / total, k]; })
        .sort(function (a, b) { return b[0] - a[0]; });
      var hhi = pairs.reduce(function (a, p) { return a + Math.pow(p[0] * 100, 2); }, 0);
      if (pairs[0][0] > 0.4)
        found.push({severity: pairs[0][0] > 0.55 ? "high" : "medium", kind: "concentration",
          what: ((contacts[pairs[0][1]] || {}).name || pairs[0][1]) + " is " +
            Math.trunc(pairs[0][0] * 100) + "% of the last six months of billing",
          evidence: "concentration index " + Math.trunc(hhi) + ", " + pairs.length + " customers billed"});
    }
    var order = {high: 0, medium: 1, low: 2};
    found.sort(function (a, b) { return (order[a.severity] || 3) - (order[b.severity] || 3); });
    return found;
  };
  P.cmdAnomalies = function () {
    var found = this.anomalies();
    if (!found.length) return "\n  Nothing unusual. That is a real result, not an empty one.\n";
    var L = [this.head(found.length + " thing" + (found.length === 1 ? "" : "s") + " worth a look")];
    found.forEach(function (f) {
      L.push("  [" + f.severity + "] " + f.what);
      L.push("        " + f.evidence);
    });
    L.push("\n  These are statistical flags, not accusations. Each one is a question.\n");
    return L.join("\n");
  };

  /* ------------------------------------------------------------- dispatcher */
  var HELP = [
    ["brief", "what needs you today"],
    ["aging", "who owes you and how late they are"],
    ["cash [days] [--detail]", "the deterministic forecast"],
    ["sim [days]", "the same question with the odds attached"],
    ["whatfirst", "which single collection changes the odds most"],
    ["margin", "what each job actually made"],
    ["tax", "what to set aside"],
    ["capacity", "promised hours against real hours"],
    ["week", "what moved in the last seven days"],
    ["validate", "every row and every link, checked"],
    ["anomalies", "statistical flags across the whole business"],
    ["books [check|pnl|balance|accounts]", "double entry, derived from the rows"],
    ["query <osq>", "ask the registries anything"],
    ["find <text>", "search everything"],
    ["help", "this list"]
  ];
  P.cmdHelp = function () {
    var L = [this.head("Commands")];
    HELP.forEach(function (h) { L.push("  " + pad(h[0], 36) + h[1]); });
    L.push("\n  Registries: " + Object.keys(SCHEMA).join(", "));
    L.push("  Try:  query select name, outstanding, median_pay_lag from contacts where outstanding > 0");
    L.push("");
    return L.join("\n");
  };
  P.run = function (line) {
    var parts = String(line).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts[0] === "os") parts.shift();
    var cmd = (parts.shift() || "").toLowerCase();
    var raw = String(line).trim().replace(/^os\s+/, "").replace(/^\S+\s*/, "");
    try {
      switch (cmd) {
        case "brief": return this.cmdBrief();
        case "aging": return this.cmdAging();
        case "cash": return this.cmdCash(parts);
        case "sim": return this.cmdSim(parts);
        case "whatfirst": return this.cmdWhatFirst();
        case "margin": return this.cmdMargin(parts);
        case "tax": return this.cmdTax();
        case "capacity": return this.cmdCapacity();
        case "week": return this.cmdWeek();
        case "validate": return this.cmdValidate(parts);
        case "anomalies": return this.cmdAnomalies();
        case "books": return this.cmdBooks(parts);
        case "find": return this.cmdFind(parts);
        case "query": return this.cmdQuery(raw ? raw.split(/\s+/) : []);
        case "help": case "": return this.cmdHelp();
        case "clear": return "\x00clear";
        default:
          return "\n  No command '" + cmd + "' in this demo. Type help.\n" +
            "  The full repo has " + "40 or so, including the ones that change data.\n";
      }
    } catch (err) {
      return "\n  " + err.message + "\n";
    }
  };
})(typeof module !== "undefined" && module.exports ? module.exports : window.OS);
