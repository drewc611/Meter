window.OS_DATA = {
 "generated": "2026-09-06",
 "brand": {
  "product_name": "Operator OS",
  "product_slug": "operator-os",
  "tagline": "The whole business, on your machine, in files you own.",
  "author": "REPLACE_ME",
  "support_email": "REPLACE_ME",
  "site": "REPLACE_ME",
  "version": "2.0.0",
  "note": "This file is the only place the product name lives. Run scripts/rename.py to change it everywhere."
 },
 "config": {
  "business_name": "Northbank Coaching",
  "operator": "Dean Lowrie",
  "trade": "career and leadership coaching",
  "currency": "USD",
  "currency_symbol": "$",
  "hourly_rate": "180.00",
  "target_margin_pct": "45",
  "tax_rate_pct": "0",
  "tax_set_aside_pct": "27",
  "invoice_terms_days": "14",
  "capacity_hours_per_week": "22",
  "opening_cash": "16240.00",
  "week_starts": "monday",
  "quiet_hours": "18:30-08:00",
  "receipt_threshold": "75.00",
  "cash_buffer": "0.00",
  "books_open_date": ""
 },
 "overdue_tasks": [
  {
   "id": "t0003",
   "project_id": "p0002",
   "title": "Session four, Roland A, third date offered",
   "due": "2026-09-03",
   "priority": "now",
   "status": "todo",
   "estimate_min": "90",
   "done_on": "",
   "blocked_by": "",
   "notes": "He has moved it twice. Neither cancellation was charged."
  },
  {
   "id": "t0004",
   "project_id": "p0002",
   "title": "Rewrite the 360 summary Roland asked for",
   "due": "2026-09-05",
   "priority": "high",
   "status": "blocked",
   "estimate_min": "120",
   "done_on": "",
   "blocked_by": "Roland has not sent the raw export",
   "notes": "Not in the package. Not on any invoice."
  },
  {
   "id": "t0015",
   "project_id": "",
   "title": "Chase INV-0412 at Ashbury, second reminder",
   "due": "2026-08-31",
   "priority": "high",
   "status": "todo",
   "estimate_min": "15",
   "done_on": "",
   "blocked_by": "",
   "notes": "Thirty eight days past due. Devin says accounts pay on their own schedule."
  }
 ],
 "due_today": [
  {
   "id": "t0005",
   "project_id": "p0003",
   "title": "Session two, Ben O",
   "due": "2026-09-06",
   "priority": "high",
   "status": "todo",
   "estimate_min": "60",
   "done_on": "",
   "blocked_by": "",
   "notes": ""
  }
 ],
 "deals_needing_action": [
  {
   "id": "d0001",
   "contact_id": "c0003",
   "title": "Six session package, Tamsin V",
   "value": "2400.00",
   "stage": "quoted",
   "confidence": "55",
   "opened": "2026-08-26",
   "expected_close": "2026-09-15",
   "next_action": "Ask her directly whether she is asking her employer or paying herself",
   "next_action_due": "2026-09-04",
   "status": "open",
   "closed_on": "",
   "lost_reason": ""
  },
  {
   "id": "d0003",
   "contact_id": "c0006",
   "title": "Ashbury coaching pool, cycle two",
   "value": "9600.00",
   "stage": "qualified",
   "confidence": "50",
   "opened": "2026-08-13",
   "expected_close": "2026-10-16",
   "next_action": "",
   "next_action_due": "",
   "status": "open",
   "closed_on": "",
   "lost_reason": ""
  }
 ],
 "cash": {
  "opening": 1624000,
  "horizon": 90,
  "d30": {
   "best": 2566000,
   "weighted": 2312000
  },
  "d60": {
   "best": 6028000,
   "weighted": 4574000
  },
  "d90": {
   "best": 6290000,
   "weighted": 4836000
  },
  "low_point": {
   "cents": 1624000,
   "on": "2026-09-06"
  }
 },
 "capacity": {
  "committed_hours": 88.5,
  "available_hours": 88.0,
  "load_pct": 100.6,
  "through": "2026-10-04"
 },
 "late_invoice_cents": 440000,
 "late_invoice_count": 2,
 "aging": {
  "current": {
   "count": 1,
   "cents": 480000
  },
  "1-30": {
   "count": 1,
   "cents": 120000
  },
  "31-60": {
   "count": 1,
   "cents": 320000
  },
  "61-90": {
   "count": 0,
   "cents": 0
  },
  "90+": {
   "count": 0,
   "cents": 0
  }
 },
 "owed": [
  {
   "number": "INV-0412",
   "who": "Devin Marsh",
   "cents": 320000,
   "late": 38,
   "due": "2026-07-30",
   "bucket": "31-60"
  },
  {
   "number": "INV-0449",
   "who": "Jasper Klein",
   "cents": 120000,
   "late": 2,
   "due": "2026-09-04",
   "bucket": "1-30"
  },
  {
   "number": "INV-0450",
   "who": "Hilary Quan",
   "cents": 480000,
   "late": 0,
   "due": "2026-10-06",
   "bucket": "current"
  }
 ],
 "deals": [
  {
   "title": "Six session package, Tamsin V",
   "who": "Tamsin Vale",
   "cents": 240000,
   "stage": "quoted",
   "confidence": "55",
   "next_action": "Ask her directly whether she is asking her employer or paying herself",
   "next_action_due": "2026-09-04"
  },
  {
   "title": "Cordell leadership programme, 8 managers",
   "who": "Hilary Quan",
   "cents": 1440000,
   "stage": "negotiating",
   "confidence": "65",
   "next_action": "Send the two option scope, six sessions or eight",
   "next_action_due": "2026-09-09"
  },
  {
   "title": "Ashbury coaching pool, cycle two",
   "who": "Devin Marsh",
   "cents": 960000,
   "stage": "qualified",
   "confidence": "50",
   "next_action": "",
   "next_action_due": ""
  },
  {
   "title": "Executive package extension, 4 sessions",
   "who": "Roland Achebe",
   "cents": 320000,
   "stage": "new",
   "confidence": "40",
   "next_action": "Raise the extension at session five, not after session six",
   "next_action_due": "2026-09-11"
  }
 ],
 "problems": [],
 "warnings": [
  "deals d0003 (Ashbury coaching pool, cycle two): open with nothing scheduled to happen next"
 ],
 "projects": [
  {
   "name": "Six session package, Marla D",
   "status": "active",
   "health": "amber",
   "due": "2026-09-22",
   "margin_pct": 38.5,
   "revenue": 240000
  },
  {
   "name": "Executive package, Roland A",
   "status": "active",
   "health": "red",
   "due": "2026-09-15",
   "margin_pct": 52.8,
   "revenue": 480000
  },
  {
   "name": "Three session package, Ben O",
   "status": "active",
   "health": "green",
   "due": "2026-09-27",
   "margin_pct": 75.6,
   "revenue": 135000
  },
  {
   "name": "Group cohort, autumn",
   "status": "active",
   "health": "amber",
   "due": "2026-10-18",
   "margin_pct": 66.7,
   "revenue": 720000
  }
 ],
 "books": {
  "problems": [],
  "notes": [
   "27 entries, all balanced",
   "trial balance nets to zero",
   "money owed ties to the aging report at $9,200.00"
  ]
 },
 "pnl": {
  "income": 3395000,
  "expense": 215400,
  "profit": 3179600,
  "margin_pct": 93.7
 },
 "sim": {
  "ruin_pct": 0.0,
  "ruin_day": null,
  "d90": {
   "p10": 3472291,
   "p50": 4803187,
   "p90": 5918122
  },
  "low": {
   "p10": 1624000,
   "p50": 1624000,
   "p90": 1624000
  },
  "overhead_per_week": 8700
 },
 "anomalies": [
  {
   "severity": "low",
   "kind": "missing receipts",
   "what": "1 expenses over $75.00 have no receipt",
   "evidence": "e0011"
  }
 ],
 "log": {
  "changes": 82,
  "last": "2026-09-06T14:40:56Z",
  "chain_ok": true,
  "hand_edits": 0
 },
 "timeline": [
  {
   "date": "2026-09-06",
   "weighted": 1726000,
   "label": "invoice INV-0449 2d late",
   "kind": "invoice"
  },
  {
   "date": "2026-09-06",
   "weighted": 1918000,
   "label": "invoice INV-0412 38d late",
   "kind": "invoice"
  },
  {
   "date": "2026-09-13",
   "weighted": 2238000,
   "label": "Ashbury coaching pool retainer",
   "kind": "recurring"
  },
  {
   "date": "2026-09-15",
   "weighted": 2231800,
   "label": "Professional indemnity insurance",
   "kind": "recurring"
  },
  {
   "date": "2026-09-18",
   "weighted": 2224000,
   "label": "Scheduling and video software",
   "kind": "recurring"
  },
  {
   "date": "2026-09-24",
   "weighted": 2207500,
   "label": "Monthly supervision",
   "kind": "recurring"
  },
  {
   "date": "2026-09-27",
   "weighted": 2204000,
   "label": "Guild of Coaches membership",
   "kind": "recurring"
  },
  {
   "date": "2026-09-29",
   "weighted": 2336000,
   "label": "deal Six session package, Tamsin V",
   "kind": "deal"
  },
  {
   "date": "2026-09-30",
   "weighted": 2312000,
   "label": "Coworking desk",
   "kind": "recurring"
  },
  {
   "date": "2026-10-11",
   "weighted": 2440000,
   "label": "deal Executive package extension, 4 sessions",
   "kind": "deal"
  },
  {
   "date": "2026-10-12",
   "weighted": 2896000,
   "label": "invoice INV-0450 on time",
   "kind": "invoice"
  },
  {
   "date": "2026-10-13",
   "weighted": 3216000,
   "label": "Ashbury coaching pool retainer",
   "kind": "recurring"
  },
  {
   "date": "2026-10-15",
   "weighted": 3209800,
   "label": "Professional indemnity insurance",
   "kind": "recurring"
  },
  {
   "date": "2026-10-17",
   "weighted": 4145800,
   "label": "deal Cordell leadership programme, 8 managers",
   "kind": "deal"
  },
  {
   "date": "2026-10-18",
   "weighted": 4138000,
   "label": "Scheduling and video software",
   "kind": "recurring"
  },
  {
   "date": "2026-10-24",
   "weighted": 4121500,
   "label": "Monthly supervision",
   "kind": "recurring"
  },
  {
   "date": "2026-10-27",
   "weighted": 4118000,
   "label": "Guild of Coaches membership",
   "kind": "recurring"
  },
  {
   "date": "2026-10-30",
   "weighted": 4598000,
   "label": "deal Ashbury coaching pool, cycle two",
   "kind": "deal"
  },
  {
   "date": "2026-10-30",
   "weighted": 4574000,
   "label": "Coworking desk",
   "kind": "recurring"
  },
  {
   "date": "2026-11-13",
   "weighted": 4894000,
   "label": "Ashbury coaching pool retainer",
   "kind": "recurring"
  },
  {
   "date": "2026-11-15",
   "weighted": 4887800,
   "label": "Professional indemnity insurance",
   "kind": "recurring"
  },
  {
   "date": "2026-11-18",
   "weighted": 4880000,
   "label": "Scheduling and video software",
   "kind": "recurring"
  },
  {
   "date": "2026-11-24",
   "weighted": 4863500,
   "label": "Monthly supervision",
   "kind": "recurring"
  },
  {
   "date": "2026-11-27",
   "weighted": 4860000,
   "label": "Guild of Coaches membership",
   "kind": "recurring"
  },
  {
   "date": "2026-11-30",
   "weighted": 4836000,
   "label": "Coworking desk",
   "kind": "recurring"
  }
 ]
};
