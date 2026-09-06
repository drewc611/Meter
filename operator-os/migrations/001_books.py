"""Adds the double entry books: a chart of accounts and an empty journal."""
import csv
import os

DESCRIPTION = "chart of accounts and journal"

ACCOUNTS = [
    ("1000", "Bank", "asset", "Money you can actually spend"),
    ("1100", "Money owed to you", "asset", "Invoices sent and not yet paid"),
    ("1200", "Stock and materials", "asset", "Bought, not yet used or sold"),
    ("2000", "Money you owe", "liability", "Bills received and not yet paid"),
    ("2100", "Tax set aside", "liability", "Collected or accrued, not yours"),
    ("3000", "Owner capital", "equity", "What you put in and what you drew out"),
    ("4000", "Sales", "income", "Work invoiced"),
    ("5000", "Direct costs", "expense", "Materials and subcontractors on jobs"),
    ("6000", "Overheads", "expense", "Everything not tied to one job"),
    ("6100", "Vehicle", "expense", ""),
    ("6200", "Premises", "expense", ""),
    ("6300", "Software and phone", "expense", ""),
    ("6400", "Insurance and compliance", "expense", ""),
    ("6900", "Other", "expense", ""),
]


def up(data_dir):
    apath = os.path.join(data_dir, "accounts.csv")
    if not os.path.exists(apath):
        with open(apath, "w", encoding="utf-8", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["code", "name", "kind", "notes"])
            w.writerows(ACCOUNTS)
    jpath = os.path.join(data_dir, "journal.csv")
    if not os.path.exists(jpath):
        with open(jpath, "w", encoding="utf-8", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["id", "entry", "date", "account", "debit", "credit",
                        "memo", "source_type", "source_id"])
    return "created accounts.csv with {} accounts and an empty journal".format(len(ACCOUNTS))
