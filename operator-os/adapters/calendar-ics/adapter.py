"""
Calendar .ics export.

This adapter proposes time entries, and only time entries. An event earns a
proposal when its title looks like the name of a project you already have. Every
other event in the file is left alone and produces nothing, because your dentist
appointment is not billable work and this adapter has no way to know what is.

All day events are skipped. An event with a start and no end has no duration,
and inventing one would be inventing hours.

Duration comes from DTSTART and DTEND. The event title goes in the notes so the
line is checkable against the calendar it came from. Billable is set to yes,
because the event matched a project, and that is the thing worth arguing with.

The external id is the event UID, which calendars keep stable across edits.
"""

import os
import re
import sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(ROOT, "lib")
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402

ADAPTER = {
    "name": "calendar-ics",
    "title": "Calendar .ics export",
    "reads": ["time"],
    "writes": [],
    "needs": "an .ics file exported from your calendar, covering the days you worked",
    "network": False,
}

MATCH_FLOOR = 0.5
DEAD_PROJECT = ("cancelled",)


def _unfold(text):
    """RFC 5545 wraps long lines and continues them with a leading space."""
    out = []
    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if line[:1] in (" ", "\t") and out:
            out[-1] += line[1:]
        else:
            out.append(line)
    return out


def _read(path):
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def _events(path):
    events, cur = [], None
    for line in _unfold(_read(path)):
        stripped = line.strip()
        if stripped == "BEGIN:VEVENT":
            cur = {}
            continue
        if stripped == "END:VEVENT":
            if cur is not None:
                events.append(cur)
            cur = None
            continue
        if cur is None or ":" not in line:
            continue
        head, value = line.split(":", 1)
        key = head.split(";", 1)[0].strip().upper()
        params = head.split(";")[1:]
        if key in ("UID", "SUMMARY", "DTSTART", "DTEND"):
            cur[key] = value.strip()
            if key.startswith("DT"):
                cur[key + "_PARAMS"] = ";".join(params).upper()
    return events


def _stamp(value):
    """Returns (datetime or None, all_day)."""
    if not value:
        return None, False
    v = value.strip().rstrip("Z")
    if re.match(r"^\d{8}T\d{6}$", v):
        return datetime.strptime(v, "%Y%m%dT%H%M%S"), False
    if re.match(r"^\d{8}$", v):
        return datetime.strptime(v, "%Y%m%d"), True
    return None, False


def sniff(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            head = fh.read(400)
    except Exception:
        return 0.0
    if "BEGIN:VCALENDAR" in head:
        return 0.98
    if path.lower().endswith(".ics"):
        return 0.4
    return 0.0


def _best_project(title, projects):
    import adapters as A
    best, best_sim = None, 0.0
    for p in projects:
        if p.get("status") in DEAD_PROJECT:
            continue
        sim = A.similar(title, p.get("name"))
        if sim > best_sim:
            best, best_sim = p, sim
    if best_sim < MATCH_FLOOR:
        return None, 0.0
    return best, best_sim


def pull(path, ctx):
    projects = ctx["projects"]
    proposals = []
    for ev in _events(path):
        title = " ".join((ev.get("SUMMARY") or "").split())
        if not title:
            continue
        project, sim = _best_project(title, projects)
        if project is None:
            continue
        start, all_day = _stamp(ev.get("DTSTART"))
        end, _ = _stamp(ev.get("DTEND"))
        if start is None or end is None or all_day:
            continue
        minutes = int((end - start).total_seconds() // 60)
        if minutes <= 0:
            continue
        uid = (ev.get("UID") or "").strip() or ctx["digest"](title, ev.get("DTSTART"))
        row = {
            "date": D.iso(start.date()),
            "project_id": project["id"],
            "task_id": "",
            "minutes": str(minutes),
            "billable": "yes",
            "rate": "",
            "notes": title[:70],
        }
        proposals.append({
            "external_id": "calendar-ics:{}".format(uid),
            "entity": "time",
            "row": row,
            "action": "create",
            "match_id": None,
            "confidence": round(min(0.95, 0.5 + 0.45 * sim), 2),
            "why": "{} on {} reads like project {}, {} minutes".format(
                title[:34], row["date"], project.get("name", "")[:28], minutes),
        })
    return proposals
