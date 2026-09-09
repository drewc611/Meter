"""Creates data/rates.csv, the rate card this plugin owns.

Same shape as a core migration: a DESCRIPTION and one up(data_dir). It adds a
file. It does not touch a core registry, and it never overwrites a rates.csv
that is already there.
"""
import csv
import os

DESCRIPTION = "rate card at data/rates.csv"

COLS = ["code", "label", "unit", "rate", "notes"]

STARTER = [
    ("CALLOUT", "Call out and diagnosis", "visit", "145.00",
     "First 60 minutes on site included"),
    ("LABOUR", "Labour", "hour", "95.00",
     "Keep this equal to hourly_rate in business.yml"),
    ("LABOUR-OOH", "Labour out of hours", "hour", "142.50",
     "Evenings, weekends and public holidays"),
    ("TRAVEL", "Travel beyond 20 miles", "mile", "0.68", ""),
    ("PLAN", "Maintenance plan", "year", "290.00",
     "Two visits, parts at cost"),
    ("MARKUP", "Materials markup", "percent", "22.00",
     "Added to trade price, not to retail price"),
]


def up(data_dir):
    path = os.path.join(data_dir, "rates.csv")
    if os.path.exists(path):
        return "rates.csv already there, left alone"
    os.makedirs(data_dir, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(COLS)
        w.writerows(STARTER)
    return "created rates.csv with {} rates".format(len(STARTER))
