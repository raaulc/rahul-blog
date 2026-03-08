#!/bin/bash
set -e

VAULT="${1:-/Users/rahul/Documents/home-mac}"

echo "Running transform from vault: $VAULT"
node scripts/transform.js --vault "$VAULT"

if git diff --quiet && git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git add src/content/posts/ public/images/
git commit -m "publish: $(date '+%Y-%m-%d %H:%M')"
git push

echo "Done -- Vercel is deploying now."
