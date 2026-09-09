"""Adds the import ledger, so an external record is never imported twice."""
import csv
import os

DESCRIPTION = "import ledger for adapters"

COLS = ["id", "adapter", "external_id", "entity", "row_id", "imported_on",
        "amount", "summary", "status"]


def up(data_dir):
    path = os.path.join(data_dir, "imports.csv")
    if os.path.exists(path):
        return "already present"
    with open(path, "w", encoding="utf-8", newline="") as fh:
        csv.writer(fh).writerow(COLS)
    return "created imports.csv with columns: " + ", ".join(COLS)
