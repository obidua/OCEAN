#!/usr/bin/env bash
# One-click push script for difi-ocean
# Usage:
#   ./scripts/push.sh                 # Auto message with timestamp
#   ./scripts/push.sh -m "feat: update UI"
#   ./scripts/push.sh -b feature/xyz -m "msg"
#   NO_PULL=1 ./scripts/push.sh       # Skip pull --rebase step

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Ensure we're in a git repository
if [ ! -d .git ]; then
  echo "❌ Error: This directory is not a git repository: $ROOT_DIR" >&2
  exit 1
fi

# Parse args
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
MSG="chore: sync repo on $(date '+%Y-%m-%d %H:%M:%S')"

while [[ ${1-} ]]; do
  case "$1" in
    -m|--message)
      shift; MSG="${1-}"; [ -z "${MSG}" ] && { echo "❌ Commit message cannot be empty"; exit 1; } ;;
    -b|--branch)
      shift; BRANCH="${1-}"; [ -z "${BRANCH}" ] && { echo "❌ Branch cannot be empty"; exit 1; } ;;
    -h|--help)
      grep "^#" "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)
      echo "Unknown argument: $1"; exit 1 ;;
  esac
  shift || true
done

# Check remote
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "❌ Error: No 'origin' remote configured. Add it with:\n  git remote add origin <git-url>" >&2
  exit 1
fi

# Ensure branch exists locally
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "ℹ️ Creating local branch '$BRANCH'"
  git checkout -b "$BRANCH"
else
  git checkout "$BRANCH"
fi

# Add changes
git add -A

# If no staged changes, exit gracefully
if git diff --cached --quiet; then
  echo "✔️  No changes to commit. Working tree clean."
  # Still attempt a pull to sync, unless NO_PULL=1
  if [ "${NO_PULL:-0}" != "1" ]; then
    echo "↻ Pulling latest changes for '$BRANCH' (rebase/autostash)…"
    git pull --rebase --autostash origin "$BRANCH" || {
      echo "⚠️  Pull --rebase failed. Resolve conflicts and re-run."; exit 1; }
  fi
  echo "🚀 Nothing to push. Up to date."
  exit 0
fi

# Commit
echo "📝 Committing with message: $MSG"
# Prevent commit failure if user config missing
if ! git -c user.useConfigOnly=true commit -m "$MSG" 2>/dev/null; then
  echo "ℹ️ Setting local git user (not global)"
  git config user.name "auto-bot"
  git config user.email "auto-bot@local"
  git commit -m "$MSG"
fi

# Pull latest (rebase) unless skipped
if [ "${NO_PULL:-0}" != "1" ]; then
  echo "↻ Pulling latest changes for '$BRANCH' (rebase/autostash)…"
  git pull --rebase --autostash origin "$BRANCH" || {
    echo "⚠️  Pull --rebase failed. Resolve conflicts (git rebase --abort) and re-run."; exit 1; }
fi

# Push (set upstream on first push)
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  echo "⬆️  Pushing to origin/$BRANCH"
  git push origin "$BRANCH"
else
  echo "⬆️  First push: setting upstream to origin/$BRANCH"
  git push -u origin "$BRANCH"
fi

LAST_COMMIT="$(git rev-parse --short HEAD)"
echo "✅ Push complete. Branch: $BRANCH @ $LAST_COMMIT"
