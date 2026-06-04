#!/bin/sh
# Pre-commit: run fallow audit on changes vs merge-base (gate=new-only by default).
# Installed by scripts/install-fallow-git-hook.mjs (also: npm run fallow:hooks).
# Bypass once: git commit --no-verify

set -e

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 1

run_fallow() {
  if command -v fallow >/dev/null 2>&1; then
    fallow "$@"
  elif [ -x "./node_modules/.bin/fallow" ]; then
    ./node_modules/.bin/fallow "$@"
  else
    npx --no-install fallow "$@" 2>/dev/null || npx fallow "$@"
  fi
}

UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
if [ -n "$UPSTREAM" ]; then
  BASE="$(git merge-base "$UPSTREAM" HEAD 2>/dev/null || echo "$UPSTREAM")"
else
  BASE="main"
fi

run_fallow audit --base "$BASE" --quiet --gate-marker pre-commit
