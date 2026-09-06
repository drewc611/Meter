#!/usr/bin/env bash
# Every proof this repo makes, in one run. Exits non zero if any of them fails.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
FAIL=0
line() { printf "\n%s\n%s\n" "$1" "------------------------------------------------------------"; }
ok()   { printf "  ok    %s\n" "$1"; }
bad()  { printf "  FAIL  %s\n" "$1"; FAIL=1; }

line "Unit tests"
for t in tests/test_*.py; do
  if python3 "$t" >/tmp/os-test.log 2>&1; then
    ok "$(basename "$t")  $(grep -Ei 'passed' /tmp/os-test.log | tail -1 | tr -s ' ')"
  else
    bad "$(basename "$t")"; tail -6 /tmp/os-test.log | sed 's/^/        /'
  fi
done

line "Every command, every workspace"
CMDS=("validate --errors-only" "brief" "week" "cash 90" "aging" "margin" "tax" "capacity"
      "books post" "books check" "books pnl" "books balance" "books accounts"
      "sim --trials=400" "whatfirst --trials=300" "anomalies" "console"
      "log 5" "drift" "routing" "ticks" "tick money-tick" "reconcile" "work"
      "adapters" "imports" "plugin list" "plugin verify" "rates" "find a"
      "query select id from invoices limit 2")
for w in workspaces/*/; do
  w="$(basename "$w")"
  export OPERATOR_OS_DATA="/tmp/verify-$w"; rm -rf "$OPERATOR_OS_DATA"
  ./os use "$w" >/dev/null 2>&1 || { bad "$w: use"; continue; }
  ./os migrate >/dev/null 2>&1 || { bad "$w: migrate"; continue; }
  BAD=0
  for c in "${CMDS[@]}"; do
    if ! ./os $c >/tmp/os-cmd.log 2>&1; then BAD=1; bad "$w: os $c"; tail -3 /tmp/os-cmd.log | sed 's/^/        /'; fi
  done
  [ $BAD -eq 0 ] && ok "$w: ${#CMDS[@]} commands clean"
done

line "Kernel proofs"
export OPERATOR_OS_DATA=/tmp/verify-kernel; rm -rf "$OPERATOR_OS_DATA" "$ROOT/data.rebuilt"
./os use 01-field-service >/dev/null && ./os migrate >/dev/null
./os add contacts name="Proof Person" status=lead source=referral >/dev/null
./os set contacts c0011 status=active >/dev/null
./os rebuild 2>&1 | grep -q "Matches your live data exactly" && ok "rebuild from the log matches the live data" || bad "rebuild does not match"
./os drift 2>&1 | grep -q "Nothing was edited by hand" && ok "no unlogged changes" || bad "unexplained drift"
./os undo 2 --yes >/dev/null 2>&1 && ok "undo reverses cleanly" || bad "undo failed"
./os books post >/dev/null && ./os books check 2>&1 | grep -q "The books agree" && ok "books tie to the reports" || bad "books do not tie"

line "Refusals"
export OPERATOR_OS_DATA=/tmp/verify-refuse; rm -rf "$OPERATOR_OS_DATA"
./os use 01-field-service >/dev/null && ./os migrate >/dev/null
./os add contacts name="Nope" status=not_a_status >/dev/null 2>&1
./os validate --errors-only >/tmp/v.log 2>&1
grep -q "expected one of" /tmp/v.log && ok "a bad status is caught by validate" || bad "validate missed a bad status"

line "No leaked personal or employer content"
if grep -rniE "usps|everforth|ecs federal|andrew|clark|charleston|govcloud|drewc611|843-697|abhishek|citadel" \
   --include="*.md" --include="*.py" --include="*.json" --include="*.html" --include="*.js" \
   --include="*.sh" --include="*.ps1" --include="*.yml" --include="*.csv" . \
   | grep -v "^./data" | grep -v node_modules | grep -v "run_all.sh" >/tmp/leak.log 2>&1; then
  bad "possible leak"; head -5 /tmp/leak.log | sed 's/^/        /'
else
  ok "clean"
fi

printf "\n%s\n" "------------------------------------------------------------"
if [ $FAIL -eq 0 ]; then echo "  Everything this repo claims, checked."; else echo "  Something above failed."; fi
exit $FAIL
