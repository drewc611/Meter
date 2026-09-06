#!/usr/bin/env python3
"""
Operator OS launcher.

This file does one thing: find the command and run it. Every command lives in
lib/commands or in a plugin, and they are discovered rather than listed here, so
a plugin command works exactly like a built in one.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "lib"))

import registry as REG  # noqa: E402


def brand():
    try:
        with open(os.path.join(ROOT, "brand.json"), "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {"product_name": "Operator OS", "version": "0"}


def show_help(reg, group=None):
    b = brand()
    import osdata as D
    print("\n{} {}".format(b["product_name"], b.get("version", "")))
    for g, blurb, items in reg.by_group():
        if group and g != group:
            continue
        print("\n  {}{}".format(g, "   " + blurb if blurb else ""))
        for c in items:
            tag = "" if c.source == "core" else "   [{}]".format(c.source)
            print("    {:<12} {}{}".format(c.name, c.summary, tag))
    print("\n  Registries: {}".format(", ".join(D.SCHEMA)))
    print("  Data lives in: {}".format(D.DATA))
    print("  os help <group>   narrows this list\n")
    if reg.problems:
        print("  Problems loading commands:")
        for p in reg.problems:
            print("    " + p)
        print("")
    return 0


def main(argv):
    reg = REG.discover()
    if not argv or argv[0] in ("-h", "--help", "help"):
        return show_help(reg, argv[1] if len(argv) > 1 else None)
    name = argv[0]
    cmd = reg.get(name)
    if cmd is None:
        near = [n for n in reg.names() if n.startswith(name[:3])]
        print("No command '{}'.".format(name))
        if near:
            print("Did you mean: {}".format(", ".join(near)))
        print("Run `os help` for the list.")
        return 1
    return cmd.fn(argv[1:])


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except BrokenPipeError:
        try:
            sys.stdout.close()
        except Exception:
            pass
        os._exit(0)
    except KeyboardInterrupt:
        print("\nStopped. Nothing was written.")
        sys.exit(130)
