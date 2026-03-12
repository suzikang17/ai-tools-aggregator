#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-.}"
cd "$REPO_ROOT"

# Check if there are changes to commit
if git diff --quiet data/tools.json data/sources.json; then
  echo "No data changes to push."
  exit 0
fi

git add data/tools.json data/sources.json
git commit -m "chore: update tools data [automated]"
git push origin main

echo "Data pushed to GitHub. Vercel will redeploy."
