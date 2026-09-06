#!/usr/bin/env python3
"""Rebuild demo/data.json from the workspaces, for the browser engine."""
import json
import os
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "lib"))


def main():
    out = {}
    for w in sorted(os.listdir(os.path.join(ROOT, "workspaces"))):
        data = tempfile.mkdtemp(prefix="demo-")
        os.environ["OPERATOR_OS_DATA"] = data
        for m in ("osdata", "books", "migrate", "events", "risk", "query"):
            sys.modules.pop(m, None)
        import osdata as D
        import migrate
        import books
        seed = json.load(open(os.path.join(ROOT, "workspaces", w, "seed.json")))
        D.render_seed(seed, log=False)
        migrate.run()
        books.post()
        persona = open(os.path.join(ROOT, "workspaces", w, "persona.md")).read()
        blurb = next((l[2:].strip() for l in persona.split("\n") if l.startswith("> ")), "")
        out[w] = {"config": D.config(), "blurb": blurb, "today": D.iso(D.today()),
                  "tables": {n: D.load(n) for n in D.SCHEMA},
                  "accounts": [dict({"code": c}, **v) for c, v in books.accounts().items()]}
        shutil.rmtree(data, ignore_errors=True)
    path = os.path.join(ROOT, "demo", "data.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print("Wrote {} ({} workspaces, {} bytes)".format(path, len(out), os.path.getsize(path)))
    print("Now run: python3 tests/test_parity.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
