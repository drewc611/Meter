window.OS_DATA = {
 "generated": "2026-09-11",
 "brand": {
  "product_name": "Operator OS",
  "product_slug": "operator-os",
  "tagline": "The whole business, on your machine, in files you own.",
  "author": "REPLACE_ME",
  "support_email": "REPLACE_ME",
  "site": "https://usemeritai.com/operator-os",
  "version": "2.0.0",
  "note": "This file is the only place the product name lives. Run scripts/rename.py to change it everywhere."
 },
 "config": {
  "business_name": "Fernbrook Marketing",
  "operator": "Priya Sethna",
  "trade": "marketing campaigns and content production, subcontracted delivery",
  "currency": "USD",
  "currency_symbol": "$",
  "hourly_rate": "75.00",
  "target_margin_pct": "35",
  "tax_rate_pct": "0",
  "tax_set_aside_pct": "27",
  "invoice_terms_days": "30",
  "capacity_hours_per_week": "35",
  "opening_cash": "9600.00",
  "week_starts": "monday",
  "quiet_hours": "18:00-08:00",
  "receipt_threshold": "75.00",
  "cash_buffer": "0.00",
  "books_open_date": ""
 },
 "overdue_tasks": [
  {
   "id": "t0001",
   "project_id": "p0005",
   "title": "Lock the phase 2 subcontractor budget before booking Jules or Sasha",
   "due": "2026-09-10",
   "priority": "now",
   "status": "todo",
   "estimate_min": "45",
   "done_on": "",
   "blocked_by": "",
   "notes": "Phase 1 came in at 8.3 percent margin. Do not repeat it."
  },
  {
   "id": "t0003",
   "project_id": "",
   "title": "Write the change order clause for extra creative rounds",
   "due": "2026-09-07",
   "priority": "high",
   "status": "todo",
   "estimate_min": "60",
   "done_on": "",
   "blocked_by": "",
   "notes": "So a reshoot or an extra round never again gets absorbed silently."
  },
  {
   "id": "t0010",
   "project_id": "",
   "title": "Reconcile freelancer invoices against the Vance and Ostrander budgets",
   "due": "2026-09-04",
   "priority": "high",
   "status": "todo",
   "estimate_min": "60",
   "done_on": "",
   "blocked_by": "",
   "notes": "This is the number that should have been checked before either project closed."
  },
  {
   "id": "t0013",
   "project_id": "",
   "title": "Reconcile the card statement",
   "due": "2026-09-08",
   "priority": "normal",
   "status": "todo",
   "estimate_min": "45",
   "done_on": "",
   "blocked_by": "",
   "notes": ""
  }
 ],
 "due_today": [],
 "deals_needing_action": [
  {
   "id": "d0003",
   "contact_id": "c0008",
   "title": "Farouk Dental social retainer renewal",
   "value": "7200.00",
   "stage": "qualified",
   "confidence": "55",
   "opened": "2026-09-05",
   "expected_close": "2026-10-11",
   "next_action": "",
   "next_action_due": "",
   "status": "open",
   "closed_on": "",
   "lost_reason": ""
  }
 ],
 "cash": {
  "opening": 960000,
  "horizon": 90,
  "d30": {
   "best": 1884000,
   "weighted": 1837500
  },
  "d60": {
   "best": 6968000,
   "weighted": 4861500
  },
  "d90": {
   "best": 6962000,
   "weighted": 4855500
  },
  "low_point": {
   "cents": 960000,
   "on": "2026-09-11"
  }
 },
 "capacity": {
  "committed_hours": 2.8,
  "available_hours": 140.0,
  "load_pct": 2.0,
  "through": "2026-10-09"
 },
 "late_invoice_cents": 0,
 "late_invoice_count": 0,
 "aging": {
  "current": {
   "count": 1,
   "cents": 930000
  },
  "1-30": {
   "count": 0,
   "cents": 0
  },
  "31-60": {
   "count": 0,
   "cents": 0
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
   "number": "INV-6260",
   "who": "Nora Vance",
   "cents": 930000,
   "late": 0,
   "due": "2026-09-27",
   "bucket": "current"
  }
 ],
 "deals": [
  {
   "title": "Ashby & Wren brand campaign",
   "who": "Colin Ashby",
   "cents": 1680000,
   "stage": "quoted",
   "confidence": "50",
   "next_action": "Follow up before the quote expires",
   "next_action_due": "2026-09-15"
  },
  {
   "title": "Ostrander Outdoor Gear, fall product launch phase 2",
   "who": "Reuben Ostrander",
   "cents": 2240000,
   "stage": "negotiating",
   "confidence": "60",
   "next_action": "Lock the subcontractor budget into the price before sending the revised scope",
   "next_action_due": "2026-09-14"
  },
  {
   "title": "Farouk Dental social retainer renewal",
   "who": "Yasmin Farouk",
   "cents": 720000,
   "stage": "qualified",
   "confidence": "55",
   "next_action": "",
   "next_action_due": ""
  }
 ],
 "problems": [],
 "warnings": [
  "deals d0003 (Farouk Dental social retainer re): open with nothing scheduled to happen next"
 ],
 "projects": [
  {
   "name": "Vance Realty rebrand and campaign, phase 2",
   "status": "active",
   "health": "amber",
   "due": "2026-10-11",
   "margin_pct": 58.3,
   "revenue": 930000
  },
  {
   "name": "Ashby & Wren pitch deck",
   "status": "planned",
   "health": "",
   "due": "2026-10-01",
   "margin_pct": 0.0,
   "revenue": 0
  }
 ],
 "books": {
  "problems": [],
  "notes": [
   "35 entries, all balanced",
   "trial balance nets to zero",
   "money owed ties to the aging report at $9,300.00"
  ]
 },
 "pnl": {
  "income": 5600000,
  "expense": 3046000,
  "profit": 2554000,
  "margin_pct": 45.6
 },
 "sim": {
  "ruin_pct": 0.0,
  "ruin_day": null,
  "d90": {
   "p10": 3042000,
   "p50": 4722000,
   "p90": 6962000
  },
  "low": {
   "p10": 960000,
   "p50": 960000,
   "p90": 960000
  },
  "overhead_per_week": 0
 },
 "anomalies": [
  {
   "severity": "medium",
   "kind": "margin outlier",
   "what": "Ostrander Outdoor Gear - fall launch phase 1 came in at -5.4% against a typical 27.5%",
   "evidence": "revenue $11,200.00, cost $11,800.00"
  },
  {
   "severity": "medium",
   "kind": "concentration",
   "what": "Nora Vance is 52% of the last six months of billing",
   "evidence": "concentration index 3603, 4 customers billed"
  }
 ],
 "log": {
  "changes": 88,
  "last": "2026-09-11T01:35:26Z",
  "chain_ok": true,
  "hand_edits": 0
 },
 "timeline": [
  {
   "date": "2026-09-12",
   "weighted": 1843500,
   "label": "invoice INV-6260 on time",
   "kind": "invoice"
  },
  {
   "date": "2026-09-17",
   "weighted": 1831500,
   "label": "Project management software",
   "kind": "recurring"
  },
  {
   "date": "2026-09-21",
   "weighted": 1793500,
   "label": "Studio and co-working desk",
   "kind": "recurring"
  },
  {
   "date": "2026-09-29",
   "weighted": 1883500,
   "label": "Farouk Dental social retainer",
   "kind": "recurring"
  },
  {
   "date": "2026-10-01",
   "weighted": 1837500,
   "label": "Health insurance",
   "kind": "recurring"
  },
  {
   "date": "2026-10-17",
   "weighted": 1825500,
   "label": "Project management software",
   "kind": "recurring"
  },
  {
   "date": "2026-10-21",
   "weighted": 1787500,
   "label": "Studio and co-working desk",
   "kind": "recurring"
  },
  {
   "date": "2026-10-26",
   "weighted": 2237500,
   "label": "Brandt & Fisk quarterly content retainer",
   "kind": "recurring"
  },
  {
   "date": "2026-10-29",
   "weighted": 3581500,
   "label": "deal Ostrander Outdoor Gear, fall product launch phase 2",
   "kind": "deal"
  },
  {
   "date": "2026-10-29",
   "weighted": 3671500,
   "label": "Farouk Dental social retainer",
   "kind": "recurring"
  },
  {
   "date": "2026-11-01",
   "weighted": 4511500,
   "label": "deal Ashby & Wren brand campaign",
   "kind": "deal"
  },
  {
   "date": "2026-11-01",
   "weighted": 4465500,
   "label": "Health insurance",
   "kind": "recurring"
  },
  {
   "date": "2026-11-10",
   "weighted": 4861500,
   "label": "deal Farouk Dental social retainer renewal",
   "kind": "deal"
  },
  {
   "date": "2026-11-17",
   "weighted": 4849500,
   "label": "Project management software",
   "kind": "recurring"
  },
  {
   "date": "2026-11-21",
   "weighted": 4811500,
   "label": "Studio and co-working desk",
   "kind": "recurring"
  },
  {
   "date": "2026-11-29",
   "weighted": 4901500,
   "label": "Farouk Dental social retainer",
   "kind": "recurring"
  },
  {
   "date": "2026-12-01",
   "weighted": 4855500,
   "label": "Health insurance",
   "kind": "recurring"
  }
 ]
};
