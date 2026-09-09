"""Creates data/rules.csv, the keyword-to-category rules this plugin owns.

Same shape as example-trade-rates's migration: a DESCRIPTION and one
up(data_dir). Never overwrites a rules.csv that is already there.
"""
import csv
import os

DESCRIPTION = "expense category rules at data/rules.csv"

COLS = ["keyword", "category", "notes"]

STARTER = [
    ("uber", "travel", "also catches Uber Eats -- check before accepting"),
    ("lyft", "travel", ""),
    ("delta", "travel", ""),
    ("aws", "software", ""),
    ("github", "software", ""),
    ("google workspace", "software", ""),
    ("staples", "supplies", ""),
    ("linkedin", "marketing", ""),
]


def up(data_dir):
    path = os.path.join(data_dir, "rules.csv")
    if os.path.exists(path):
        return "rules.csv already there, left alone"
    os.makedirs(data_dir, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(COLS)
        w.writerows(STARTER)
    return "created rules.csv with {} rules".format(len(STARTER))
