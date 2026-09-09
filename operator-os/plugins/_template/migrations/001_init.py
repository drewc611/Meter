"""First migration for __PLUGIN_NAME__.

Same shape as a core migration: a DESCRIPTION and one up(data_dir) that returns
a line saying what it did. It runs once. Adding files and columns is fine.
Rewriting a core registry is not.
"""
import os

DESCRIPTION = "__PLUGIN_NAME__ first run"


def up(data_dir):
    marker = os.path.join(data_dir, "__PLUGIN_NAME__.csv")
    if os.path.exists(marker):
        return "already there, left alone"
    with open(marker, "w", encoding="utf-8", newline="") as fh:
        fh.write("id,label,value\n")
    return "created __PLUGIN_NAME__.csv"
