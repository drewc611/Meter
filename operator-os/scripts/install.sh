#!/usr/bin/env bash
# Operator OS installer for macOS and Linux.
# Safe to run more than once. It never touches data/ if data/ already exists.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="$(python3 -c "import json;print(json.load(open('$HERE/brand.json'))['product_name'])" 2>/dev/null || echo "Operator OS")"

say()  { printf "  %s\n" "$*"; }
step() { printf "\n%s\n%s\n" "$*" "------------------------------------------------------------"; }

step "$NAME install"

PY=""
for c in python3 python; do
  if command -v "$c" >/dev/null 2>&1; then
    V="$("$c" -c 'import sys;print("%d.%d"%sys.version_info[:2])' 2>/dev/null || echo 0.0)"
    MAJ="${V%%.*}"; MIN="${V##*.}"
    if [ "$MAJ" -ge 3 ] && [ "$MIN" -ge 9 ]; then PY="$c"; break; fi
  fi
done
if [ -z "$PY" ]; then
  say "Python 3.9 or newer is required and was not found."
  say ""
  say "  Install it with:   brew install python"
  say "  Or download it:    https://www.python.org/downloads/"
  say ""
  say "Then run this installer again."
  exit 1
fi
say "python            $($PY -c 'import sys;print(sys.version.split()[0])')"

if command -v git >/dev/null 2>&1; then
  say "git               $(git --version | awk '{print $3}')"
else
  say "git               not found. Optional, but you lose version history."
  say "                  Install with: xcode-select --install"
fi

if [ ! -w "$HERE" ]; then
  say "This folder is not writable. Move the repo into your home folder and retry."
  exit 1
fi
say "folder            writable"

chmod +x "$HERE/os" 2>/dev/null || true
chmod +x "$HERE/scripts/os.py" 2>/dev/null || true

if [ -f "$HERE/data/business.yml" ]; then
  say "data              already exists, left untouched"
else
  "$PY" "$HERE/scripts/os.py" init >/dev/null
  say "data              created at data/"
fi

SHELLRC=""
case "${SHELL:-}" in
  */zsh)  SHELLRC="$HOME/.zshrc" ;;
  */bash) SHELLRC="$HOME/.bashrc" ;;
esac
if [ -n "$SHELLRC" ] && ! grep -q "OPERATOR_OS_HOME" "$SHELLRC" 2>/dev/null; then
  {
    echo ""
    echo "# $NAME"
    echo "export OPERATOR_OS_HOME=\"$HERE\""
    echo "alias os=\"\$OPERATOR_OS_HOME/os\""
  } >> "$SHELLRC"
  say "shortcut          'os' added to $(basename "$SHELLRC")"
  say "                  run: source $SHELLRC"
else
  say "shortcut          already set, or shell not recognised"
  say "                  you can always run ./os from this folder"
fi

step "Installed"
say "Next, in order:"
say ""
say "  ./os doctor                    check this machine"
say "  ./os use                       look at the eight encoded businesses"
say "  ./os use 01-field-service      load one and look around"
say "  ./os brief                     see it running"
say ""
say "When you are ready to make it yours:"
say ""
say "  ./os use 01-field-service --empty"
say "  ./os setup"
say "  ./os brief"
say ""
say "That last command printing your own business name is the finish line."
printf "\n"
