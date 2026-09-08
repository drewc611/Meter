#!/usr/bin/env bash
# Regenerates src/operator_os_installer/_bundle/ from the tracked files in
# operator-os/ via `git archive` -- the same mechanism `git clone` uses, so
# untracked/gitignored content (data/, data.rebuilt/, backups/, __pycache__,
# console/data.json) can never end up in a published package by accident.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$HERE/../../.." && pwd)"
BUNDLE_DIR="$HERE/src/operator_os_installer/_bundle"

if ! git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  echo "Not inside a git checkout -- can't build a bundle without git archive." >&2
  exit 1
fi

rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

git -C "$REPO_ROOT" archive HEAD -- operator-os \
  | tar -x -C "$BUNDLE_DIR" --strip-components=1

# Packaging metadata lives alongside operator-os/, not inside it -- don't
# bundle this directory into itself.
rm -rf "$BUNDLE_DIR/packaging"

count=$(find "$BUNDLE_DIR" -type f | wc -l | tr -d ' ')
echo "Bundled $count tracked files into $BUNDLE_DIR"
