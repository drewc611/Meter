#!/usr/bin/env python3
"""Rename the product everywhere. The data layer is never touched."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {"data", ".git", "backups", "__pycache__", "node_modules"}
EXTS = {".md", ".py", ".sh", ".ps1", ".html", ".json", ".cmd", ".txt"}


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main(argv):
    if not argv:
        print('usage: python3 scripts/rename.py "Your Product Name"')
        return 1
    new_name = " ".join(argv).strip()
    new_slug = slugify(new_name)
    bp = os.path.join(ROOT, "brand.json")
    with open(bp, "r", encoding="utf-8") as fh:
        brand = json.load(fh)
    old_name, old_slug = brand["product_name"], brand["product_slug"]
    if old_name == new_name:
        print("Already called that.")
        return 0
    brand["product_name"], brand["product_slug"] = new_name, new_slug
    with open(bp, "w", encoding="utf-8") as fh:
        json.dump(brand, fh, indent=2)
        fh.write("\n")

    env_old = old_slug.replace("-", "_").upper() + "_"
    env_new = new_slug.replace("-", "_").upper() + "_"
    touched = 0
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if os.path.splitext(f)[1] not in EXTS:
                continue
            p = os.path.join(base, f)
            if os.path.abspath(p) == os.path.abspath(bp):
                continue
            with open(p, "r", encoding="utf-8") as fh:
                s = fh.read()
            out = s.replace(old_name, new_name).replace(old_slug, new_slug)
            out = out.replace(env_old, env_new)
            if out != s:
                with open(p, "w", encoding="utf-8") as fh:
                    fh.write(out)
                touched += 1
    print("Renamed '{}' to '{}' across {} files.".format(old_name, new_name, touched))
    print("The data folder was not touched.")
    print("Note: the environment variable is now {}DATA.".format(env_new))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
