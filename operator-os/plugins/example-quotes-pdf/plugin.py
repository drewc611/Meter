"""
Quotes as PDF.

Reads one row of quotes.csv and writes a printable page to data/out/. No
network, no libraries, no fonts to download. The CSS is inline so the file
survives being emailed, copied to a phone, or opened five years from now.

Capabilities: commands, tools. Not writes. This plugin never changes a row.
"""

import html
import os

CSS = """
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #f4f4f2; color: #14140f;
       font: 15px/1.5 "Helvetica Neue", Helvetica, Arial, sans-serif; }
.sheet { width: 190mm; min-height: 277mm; margin: 12mm auto; padding: 16mm;
         background: #fff; border: 1px solid #ddd; }
h1 { font-size: 26px; margin: 0 0 2px; letter-spacing: .3px; }
h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.4px;
     color: #6b6b60; margin: 26px 0 8px; font-weight: 600; }
.top { display: flex; justify-content: space-between; align-items: flex-start;
       border-bottom: 2px solid #14140f; padding-bottom: 12px; }
.muted { color: #6b6b60; }
.right { text-align: right; }
.big { font-size: 30px; font-weight: 700; }
table { width: 100%; border-collapse: collapse; margin-top: 4px; }
th { text-align: left; font-size: 11px; text-transform: uppercase;
     letter-spacing: 1.2px; color: #6b6b60; padding: 0 0 6px; font-weight: 600; }
td { padding: 9px 0; border-top: 1px solid #e6e6e0; vertical-align: top; }
td.num, th.num { text-align: right; white-space: nowrap; }
tr.total td { border-top: 2px solid #14140f; font-weight: 700; font-size: 18px; }
.grid { display: flex; gap: 28px; }
.grid > div { flex: 1; }
.note { white-space: pre-wrap; }
.flag { margin-top: 18px; padding: 9px 12px; border-left: 4px solid #b23b2e;
        background: #fdf0ee; font-size: 13px; }
footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e6e6e0;
         font-size: 11px; color: #6b6b60; }
@media print {
  body { background: #fff; }
  .sheet { width: auto; margin: 0; border: 0; padding: 0; min-height: 0; }
  @page { size: A4; margin: 16mm; }
}
"""

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<style>{{CSS}}</style></head>
<body><div class="sheet">
  <div class="top">
    <div>
      <h1>{{BUSINESS}}</h1>
      <div class="muted">{{OPERATOR}}{{TRADE}}</div>
    </div>
    <div class="right">
      <div class="muted">Quote</div>
      <div class="big">{{NUMBER}}</div>
      <div class="muted">{{STATUS}}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <h2>For</h2>
      <div>{{CONTACT}}</div>
      <div class="muted">{{COMPANY}}</div>
      <div class="muted">{{EMAIL}}</div>
      <div class="muted">{{PHONE}}</div>
    </div>
    <div>
      <h2>Dates</h2>
      <div>Issued {{ISSUED}}</div>
      <div>Valid until {{EXPIRES}}</div>
      <div class="muted">{{DECIDED}}</div>
    </div>
  </div>

  <h2>Work</h2>
  <div class="note">{{WORK}}</div>

  <h2>Price</h2>
  <table>
    <tr><th>Line</th><th class="num">Amount</th></tr>
    <tr><td>Subtotal</td><td class="num">{{SUBTOTAL}}</td></tr>
    <tr><td>Tax</td><td class="num">{{TAX}}</td></tr>
    <tr class="total"><td>Total</td><td class="num">{{TOTAL}}</td></tr>
  </table>
  {{FLAG}}
  <footer>{{FOOTER}}</footer>
</div></body></html>
"""


def _fill(template, values):
    out = template
    for key, value in values.items():
        out = out.replace("{{" + key + "}}", value)
    return out


def _esc(value):
    return html.escape(str(value or ""))


def register(reg, ctx):

    def _quotes():
        return ctx.data.load("quotes")

    def _listing():
        rows = _quotes()
        if not rows:
            print("  quotes.csv has no rows yet.")
            return
        print("  {:<8} {:<10} {:<12} {:>12}".format("id", "number", "status", "total"))
        symbol = ctx.data.sym()
        for q in rows:
            print("  {:<8} {:<10} {:<12} {:>12}".format(
                q.get("id", ""), q.get("number", ""), q.get("status", ""),
                ctx.data.money(ctx.data.cents(q.get("total")), symbol)))

    def cmd_quote_sheet(args):
        if not args or args[0] in ("-h", "--help"):
            print("\nos quote-sheet <quote_id>   render one quote to data/out/ as printable HTML\n")
            _listing()
            print("")
            return 1
        wanted = args[0].strip().lower()
        match = None
        for q in _quotes():
            if wanted in (q.get("id", "").lower(), (q.get("number") or "").lower()):
                match = q
                break
        if match is None:
            print("\n  No quote '{}' in quotes.csv. What is there:\n".format(args[0]))
            _listing()
            print("")
            return 1

        cfg = ctx.config()
        symbol = cfg.get("currency_symbol") or "$"
        contacts = {c["id"]: c for c in ctx.data.load("contacts")}
        deals = {d["id"]: d for d in ctx.data.load("deals")}
        person = contacts.get(match.get("contact_id"), {})
        deal = deals.get(match.get("deal_id"), {})

        work = deal.get("title") or "See notes."
        if match.get("notes"):
            work = work + "\n\n" + match["notes"]

        expires = ctx.data.d(match.get("expires"))
        flag = ""
        if expires and expires < ctx.data.today() and match.get("status") == "sent":
            flag = '<div class="flag">This quote expired on {} and has not been ' \
                   'marked accepted or declined. Reprice before you resend it.</div>'.format(
                       _esc(match["expires"]))

        trade = cfg.get("trade")
        values = {
            "CSS": CSS,
            "TITLE": "{} {}".format(cfg.get("business_name") or "Quote",
                                    match.get("number") or match.get("id")),
            "BUSINESS": _esc(cfg.get("business_name")),
            "OPERATOR": _esc(cfg.get("operator")),
            "TRADE": _esc("  |  " + trade) if trade else "",
            "NUMBER": _esc(match.get("number") or match.get("id")),
            "STATUS": _esc(match.get("status")),
            "CONTACT": _esc(person.get("name") or match.get("contact_id") or "Not linked to a contact"),
            "COMPANY": _esc(person.get("company")),
            "EMAIL": _esc(person.get("email")),
            "PHONE": _esc(person.get("phone")),
            "ISSUED": _esc(match.get("issued") or "not recorded"),
            "EXPIRES": _esc(match.get("expires") or "no expiry recorded"),
            "DECIDED": _esc("Decided " + match["decided_on"]) if match.get("decided_on") else "",
            "WORK": _esc(work),
            "SUBTOTAL": _esc(ctx.data.money(ctx.data.cents(match.get("subtotal")), symbol)),
            "TAX": _esc(ctx.data.money(ctx.data.cents(match.get("tax")), symbol)),
            "TOTAL": _esc(ctx.data.money(ctx.data.cents(match.get("total")), symbol)),
            "FLAG": flag,
            "FOOTER": _esc("{} {} rendered from quotes.csv row {} on {}. Figures come "
                           "from the file, not from this page.".format(
                               cfg.get("business_name") or "", match.get("number") or "",
                               match.get("id"), ctx.data.iso(ctx.data.today()))),
        }

        target = ctx.out_path("quote-{}.html".format(
            (match.get("number") or match["id"]).replace("/", "-")))
        with open(target, "w", encoding="utf-8") as fh:
            fh.write(_fill(PAGE, values))

        print("\nQuote {}   {}   {}".format(
            match.get("number") or match["id"],
            person.get("name") or match.get("contact_id") or "no contact",
            values["TOTAL"]))
        print("  written to {}".format(target))
        print("  {} bytes, no network calls, no external files".format(
            os.path.getsize(target)))
        if flag:
            print("  flagged on the sheet: expired {} and still marked sent".format(
                match.get("expires")))
        print("\n  Finish line: open that file in a browser. The total on the page")
        print("  reads {} and the name reads {}. Then print to PDF.\n".format(
            values["TOTAL"], person.get("name") or match.get("contact_id") or "no contact"))
        return 0

    reg.add("quote-sheet", cmd_quote_sheet,
            group="plugin",
            summary="render a quote to printable HTML in data/out",
            group_blurb="added by plugins")


def tools():
    return ["tools/quote-sheet/SKILL.md"]


def check(ctx):
    problems = []
    skill = os.path.join(ctx.path, "tools", "quote-sheet", "SKILL.md")
    if not os.path.exists(skill):
        problems.append("tools/quote-sheet/SKILL.md is missing")
    try:
        ctx.data.load("quotes")
    except Exception as exc:
        problems.append("cannot read quotes.csv: {}".format(exc))
    return problems
