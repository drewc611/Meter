"""
Mailbox .mbox export.

This adapter reads headers and nothing else. It stops at the blank line that
ends a message's headers and does not look at a single line of any message body.
Nothing from a body reaches a row, a note, or the screen. What it takes is the
sender's name, the sender's address, the date, and the subject line. That is the
whole of it, and it is written here so you can hold the code to it.

It proposes a contact for a sender who is not already in contacts.csv. A sender
who is already there gets nothing, because you already know them.

It never proposes anything for an address marked do_not_contact. That check runs
first, before the check for whether the address is known at all, so the refusal
is explicit rather than accidental. Automated senders, the noreply and
mailer-daemon addresses, are skipped too. They are not people.
"""

import email.utils
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
    "name": "mailbox-mbox",
    "title": "Mailbox .mbox export",
    "reads": ["contacts"],
    "writes": [],
    "needs": "an .mbox export from your mail client, ideally one folder rather than everything",
    "network": False,
}

ROBOTS = ("noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon",
          "postmaster", "bounce", "notifications@", "automated@", "alerts@")

FROM_LINE = re.compile(r"^From \S+")
WANTED = ("from", "subject", "date")


def _messages(path):
    """Headers only. The body is skipped without being parsed."""
    msgs = []
    cur, in_headers, last = None, False, None
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.rstrip("\n").rstrip("\r")
            if FROM_LINE.match(line):
                if cur:
                    msgs.append(cur)
                cur, in_headers, last = {}, True, None
                continue
            if cur is None:
                continue
            if not in_headers:
                continue           # body. not read, not stored, not looked at
            if not line.strip():
                in_headers = False  # headers end here and so does our reading
                continue
            if line[:1] in (" ", "\t") and last:
                cur[last] = (cur[last] + " " + line.strip())[:300]
                continue
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            key = key.strip().lower()
            if key in WANTED:
                cur[key] = value.strip()[:300]
                last = key
            else:
                last = None
    if cur:
        msgs.append(cur)
    return msgs


def _when(raw):
    parsed = email.utils.parsedate_tz(raw or "")
    if not parsed:
        return None
    try:
        return datetime(*parsed[:3]).date()
    except (TypeError, ValueError):
        return None


def blocked(address, contacts):
    """Why this sender gets no proposal, or an empty string. Order matters."""
    addr = (address or "").strip().lower()
    if not addr or "@" not in addr:
        return "not an address"
    for c in contacts:
        if (c.get("email") or "").strip().lower() == addr:
            if c.get("status") == "do_not_contact":
                return "do_not_contact"
            return "already a contact"
    if any(r in addr for r in ROBOTS):
        return "automated sender"
    return ""


def sniff(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            head = fh.read(2000)
    except Exception:
        return 0.0
    first = head.split("\n", 1)[0]
    if FROM_LINE.match(first) and "@" in head:
        return 0.95
    if path.lower().endswith(".mbox"):
        return 0.4
    return 0.0


def pull(path, ctx):
    contacts = ctx["contacts"]
    proposals, seen = [], set()
    for msg in _messages(path):
        name, addr = email.utils.parseaddr(msg.get("from", ""))
        addr = (addr or "").strip().lower()
        if blocked(addr, contacts) or addr in seen:
            continue
        seen.add(addr)
        when = _when(msg.get("date")) or ctx["today"]
        subject = " ".join((msg.get("subject") or "").split())[:70]
        row = {
            "name": (name or addr.split("@")[0]).strip('"').strip()[:48],
            "company": "",
            "role": "",
            "email": addr,
            "phone": "",
            "source": "email",
            "status": "lead",
            "tags": "",
            "first_contact": D.iso(when),
            "last_contact": D.iso(when),
            "notes": "subject line: {}".format(subject) if subject else "",
        }
        proposals.append({
            "external_id": "mailbox-mbox:{}".format(addr),
            "entity": "contacts",
            "row": row,
            "action": "create",
            "match_id": None,
            "confidence": 0.75 if name else 0.6,
            "why": "{} wrote on {} and is not in contacts".format(
                addr, D.iso(when)),
        })
    return proposals
