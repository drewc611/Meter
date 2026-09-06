"""Maps free text expense categories onto account codes, once, so the books
can post automatically from here on."""
import csv
import os

DESCRIPTION = "map expense categories to accounts"

MAP = {
    "materials": "5000", "subcontractor": "5000", "manufacturing": "5000",
    "packaging": "5000", "fulfilment": "5000", "stock": "1200",
    "fuel": "6100", "vehicle": "6100", "travel": "6100",
    "premises": "6200", "rent": "6200", "studio": "6200",
    "software": "6300", "overhead": "6300", "phone": "6300", "platform": "6300",
    "insurance": "6400", "compliance": "6400", "licence": "6400",
    "tools": "6900", "marketing": "6900", "supervision": "6900",
    "training": "6900", "fees": "6900",
}


def up(data_dir):
    path = os.path.join(data_dir, "category_map.csv")
    if os.path.exists(path):
        return "already present"
    seen = set()
    epath = os.path.join(data_dir, "expenses.csv")
    if os.path.exists(epath):
        with open(epath, "r", encoding="utf-8-sig") as fh:
            for row in csv.DictReader(fh):
                c = (row.get("category") or "").strip().lower()
                if c:
                    seen.add(c)
    rows = []
    for cat in sorted(seen | set(MAP)):
        rows.append([cat, MAP.get(cat, "6900")])
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["category", "account"])
        w.writerows(rows)
    return "mapped {} categories".format(len(rows))
