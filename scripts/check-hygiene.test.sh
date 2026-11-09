#!/usr/bin/env bash
# Tests for scripts/check-hygiene.sh: private files tracked by git must fail the check (Sprint 7 T1).
set -u
here="$(cd "$(dirname "$0")" && pwd)"
check="$here/check-hygiene.sh"
fails=0
run_case() { # name, expected exit (0 = clean), files to add...
  local name="$1" want="$2"; shift 2
  local dir; dir="$(mktemp -d)"
  git -C "$dir" init -q
  for f in "$@"; do mkdir -p "$dir/$(dirname "$f")"; echo x > "$dir/$f"; git -C "$dir" add "$f"; done
  (cd "$dir" && bash "$check" >/dev/null 2>&1); local got=$?
  if { [ "$want" = 0 ] && [ "$got" = 0 ]; } || { [ "$want" != 0 ] && [ "$got" != 0 ]; }; then echo "ok   $name"; else echo "FAIL $name (exit $got)"; fails=$((fails+1)); fi
  rm -rf "$dir"
}
run_case "clean repo passes"              0 README.md frontend/src/a.ts
run_case "workbook fails"                 1 "Ravi Finnest Finance Tracker.xlsx"
run_case "nested workbook fails"          1 docs/data/family.XLSX
run_case "bank statement fails"           1 private/sbi_investments.csv
run_case "private-data folder fails"      1 private-data/notes.txt
run_case "secrets file fails"             1 backend/src/main/resources/application-secrets.yml
run_case "secrets example passes"         0 backend/src/main/resources/application-secrets.example.yml
exit $fails
