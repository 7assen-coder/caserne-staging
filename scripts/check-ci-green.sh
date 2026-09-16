#!/usr/bin/env bash
# Fail if the latest GitHub Actions CI run on a branch is not success.
# Requires: gh auth login
set -euo pipefail

BRANCH="${1:-demo/oracle-hassen}"
if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found — skip CI check" >&2
  exit 0
fi

CONCLUSION=$(gh run list --workflow=ci.yml --branch "$BRANCH" --limit 1 --json conclusion -q '.[0].conclusion // empty')
if [[ -z "$CONCLUSION" ]]; then
  echo "No CI run found for branch $BRANCH" >&2
  exit 1
fi
if [[ "$CONCLUSION" != "success" ]]; then
  echo "CI conclusion=$CONCLUSION (want success) for $BRANCH" >&2
  exit 1
fi
echo "CI green on $BRANCH"
