"""Adds the two files the agent layer writes: an append only log of tick runs,
and the work registry the ticks open and close rows in."""
import csv
import os

DESCRIPTION = "tick run log and work registry"

WORK_COLS = ["id", "title", "kind", "status", "opened", "closed", "owner",
             "tick", "blocked_by", "notes"]


def up(data_dir):
    made = []
    runs = os.path.join(data_dir, "runs.jsonl")
    if not os.path.exists(runs):
        with open(runs, "w", encoding="utf-8") as fh:
            fh.write("")
        made.append("runs.jsonl")
    work = os.path.join(data_dir, "work.csv")
    if not os.path.exists(work):
        with open(work, "w", encoding="utf-8", newline="") as fh:
            csv.writer(fh).writerow(WORK_COLS)
        made.append("work.csv")
    if not made:
        return "already present"
    return "created " + " and ".join(made)
