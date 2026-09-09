"""
Schema migrations.

The data layer is files the buyer owns, so a version upgrade can never mean
"export and reimport". Migrations are numbered python files under migrations/
with one function: up(data_dir). They run in order, once, and the applied list
lives in data/.migrations so a rerun is a no operation.

Every migration backs the data folder up before it touches anything.
"""

import importlib.util
import os
import re
import shutil

import osdata as D

MIGDIR = os.path.join(D.ROOT, "migrations")
STATE = ".migrations"


def _state_path():
    return os.path.join(D.DATA, STATE)


def applied():
    p = _state_path()
    if not os.path.exists(p):
        return []
    with open(p, "r", encoding="utf-8") as fh:
        return [l.strip() for l in fh if l.strip()]


def available():
    if not os.path.isdir(MIGDIR):
        return []
    out = []
    for f in sorted(os.listdir(MIGDIR)):
        if re.match(r"^\d{3}_.+\.py$", f):
            out.append(f)
    return out


def pending():
    done = set(applied())
    return [f for f in available() if f not in done]


def _load(fname):
    path = os.path.join(MIGDIR, fname)
    spec = importlib.util.spec_from_file_location("mig_" + fname[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run(dry=False):
    todo = pending()
    if not todo:
        return []
    if not dry:
        backup = D.DATA + ".before-migrate"
        shutil.rmtree(backup, ignore_errors=True)
        if os.path.isdir(D.DATA):
            shutil.copytree(D.DATA, backup)
    done = []
    for f in todo:
        mod = _load(f)
        note = getattr(mod, "DESCRIPTION", "")
        if dry:
            done.append((f, note, "would run"))
            continue
        result = mod.up(D.DATA)
        with open(_state_path(), "a", encoding="utf-8") as fh:
            fh.write(f + "\n")
        done.append((f, note, result or "done"))
    return done


def schema_version():
    a = applied()
    return a[-1][:3] if a else "000"
