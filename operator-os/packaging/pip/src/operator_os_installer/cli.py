"""operator-os new <folder> -- unpack a fresh Operator OS folder.

Deliberately thin: find the bundled copy of the real tool, copy it to the
target folder, make the launcher executable, run its own `init` (same as
scripts/install.sh does), and print the same next-steps guidance
scripts/install.sh already gives a `git clone` user. Everything past this
point is the real tool, unmodified, running exactly as documented in
operator-os/README.md.
"""

from __future__ import annotations

import json
import shutil
import stat
import subprocess
import sys
from pathlib import Path

BUNDLE_DIR = Path(__file__).parent / "_bundle"


def _find_python(min_minor: int = 9) -> str | None:
    for candidate in ("python3", "python"):
        exe = shutil.which(candidate)
        if not exe:
            continue
        try:
            out = subprocess.run(
                [exe, "-c", "import sys; print(sys.version_info[0], sys.version_info[1])"],
                capture_output=True,
                text=True,
                timeout=10,
            ).stdout.split()
            major, minor = int(out[0]), int(out[1])
        except Exception:
            continue
        if major >= 3 and minor >= min_minor:
            return exe
    return None


def _brand_name() -> str:
    try:
        with open(BUNDLE_DIR / "brand.json", encoding="utf-8") as fh:
            return json.load(fh)["product_name"]
    except Exception:
        return "Operator OS"


def new(target: Path) -> int:
    if not BUNDLE_DIR.exists():
        print("This install is missing its bundled copy of the tool -- broken package build.", file=sys.stderr)
        return 1

    if target.exists() and any(target.iterdir()):
        print(f"'{target}' already exists and isn't empty. Choose a new folder name, or remove it first.", file=sys.stderr)
        return 1

    shutil.copytree(BUNDLE_DIR, target, dirs_exist_ok=True)

    launcher = target / "os"
    if launcher.exists():
        launcher.chmod(launcher.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    name = _brand_name()
    print(f"\n{name}\n" + "-" * 60)
    print(f"Unpacked into {target}")

    python = _find_python()
    if python is None:
        print("\nPython 3.9+ not found on this machine -- install it, then run:")
        print(f"  cd {target} && ./scripts/install.sh   (or .\\scripts\\install.ps1 on Windows)")
        return 0

    if not (target / "data" / "business.yml").exists():
        subprocess.run([python, str(target / "scripts" / "os.py"), "init"], check=False, stdout=subprocess.DEVNULL)
        print("data              created at data/")

    print("\nNext, in order:\n")
    print(f"  cd {target}")
    print("  ./os doctor                    check this machine")
    print("  ./os use                       look at the eight encoded businesses")
    print("  ./os use 01-field-service      load one and look around")
    print("  ./os brief                     see it running")
    print("\nWhen you are ready to make it yours:\n")
    print("  ./os use 01-field-service --empty")
    print("  ./os setup")
    print("  ./os brief")
    print("\nThat last command printing your own business name is the finish line.\n")
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv

    if not argv or argv[0] in ("-h", "--help"):
        print("usage: operator-os new <folder>")
        print("\nUnpacks a fresh Operator OS folder at <folder>. Everything after that")
        print("runs from inside it, via ./os -- see that folder's own README.md.")
        return 0

    if argv[0] == "--version":
        from . import __version__

        print(__version__)
        return 0

    if argv[0] != "new" or len(argv) < 2:
        print("usage: operator-os new <folder>", file=sys.stderr)
        return 1

    return new(Path(argv[1]).expanduser())


if __name__ == "__main__":
    raise SystemExit(main())
