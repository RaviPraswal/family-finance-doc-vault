#!/usr/bin/env bash
# Fails if private files are tracked by git: workbooks, bank statements, private-data/, real secrets (D-16).
set -euo pipefail
bad="$(git ls-files | grep -iE '\.xlsx$|(^|/)sbi_investments\.|(^|/)private-data/|(^|/)application-secrets\.yml$' || true)"
if [ -n "$bad" ]; then
  echo "Private files are tracked by git — remove them from the repo:" >&2
  echo "$bad" >&2
  exit 1
fi
echo "Hygiene check passed."
