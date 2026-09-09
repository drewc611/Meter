"""Turns the plugin folder into part of the running system.

Three things happen here, all of them additive. Nothing in a core registry is
read or written.

1. data/out/ appears. That is where plugins render files. It holds output, not
   records, and deleting it loses nothing.
2. data/plugins.state is written with a line per installed plugin, so the on and
   off decisions are a file you can read rather than something implied by each
   manifest.
3. Every enabled plugin that declares the migrations capability gets its own
   pending migrations run, and any file they create is recorded in
   data/.plugin-files as belonging to that plugin.

A plugin installed after this migration has run is not stranded. Its migrations
run on `os plugin enable <name>`, or on `os plugin migrate`.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "lib")
if LIB not in sys.path:
    sys.path.insert(0, LIB)

DESCRIPTION = "plugin state, data/out, and any plugin migrations"


def up(data_dir):
    import plugins as P

    os.makedirs(os.path.join(data_dir, "out"), exist_ok=True)

    installed = P.all()
    state = P.state()
    for plug in installed:
        if plug["name"] not in state:
            P.set_state(plug["name"], plug["enabled"])

    ran = []
    for plug in P.enabled():
        if "migrations" not in plug["capabilities"]:
            continue
        for fname, _note, _result in P.run_migrations(plug):
            ran.append("{}/{}".format(plug["name"], fname))

    parts = ["created data/out", "{} plugin(s) recorded in plugins.state".format(len(installed))]
    if ran:
        parts.append("ran " + ", ".join(ran))
    else:
        parts.append("no plugin migrations to run")
    return "; ".join(parts)
