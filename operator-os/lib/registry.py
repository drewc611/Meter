"""
Command registry.

Commands are discovered, not hardcoded. Core commands live in lib/commands.
Plugins add their own through the same interface, so a plugin command is
indistinguishable from a built in one at the prompt, which is the point.
"""

import importlib.util
import os
import sys

LIB = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(LIB)


class Command(object):
    def __init__(self, name, fn, group, summary, source, group_blurb=""):
        self.name = name
        self.fn = fn
        self.group = group
        self.summary = summary
        self.source = source
        self.group_blurb = group_blurb


class Registry(object):
    def __init__(self):
        self.commands = {}
        self.groups = []
        self.group_blurbs = {}
        self._source = "core"
        self.problems = []

    def add(self, name, fn, group="other", summary="", group_blurb=""):
        if name in self.commands:
            self.problems.append("{} tried to redefine the command '{}', which {} already provides".format(
                self._source, name, self.commands[name].source))
            return
        self.commands[name] = Command(name, fn, group, summary, self._source, group_blurb)
        if group not in self.groups:
            self.groups.append(group)
        if group_blurb:
            self.group_blurbs[group] = group_blurb

    def get(self, name):
        return self.commands.get(name)

    def names(self):
        return sorted(self.commands)

    def by_group(self):
        out = []
        for g in self.groups:
            items = sorted((c for c in self.commands.values() if c.group == g),
                           key=lambda c: c.name)
            out.append((g, self.group_blurbs.get(g, ""), items))
        return out


def _load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def discover(with_plugins=True):
    reg = Registry()
    if LIB not in sys.path:
        sys.path.insert(0, LIB)

    cdir = os.path.join(LIB, "commands")
    for f in sorted(os.listdir(cdir)):
        if not f.endswith(".py") or f.startswith("_"):
            continue
        mod = _load_module(os.path.join(cdir, f), "oscmd_" + f[:-3])
        if hasattr(mod, "register"):
            reg._source = "core"
            mod.register(reg)

    if with_plugins:
        try:
            import plugins as P
            for plug in P.enabled():
                reg._source = "plugin " + plug["name"]
                try:
                    P.register_commands(plug, reg)
                except Exception as exc:
                    reg.problems.append("plugin {} failed to load its commands: {}".format(
                        plug["name"], exc))
        except ImportError:
            pass
        except Exception as exc:
            reg.problems.append("plugin system error: {}".format(exc))
    reg._source = "core"
    return reg
