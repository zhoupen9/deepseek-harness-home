#!/usr/bin/env bash
# Restore this DeepSeek Harness home (~/.dsh) on a new machine.
#
# Non-destructive by construction:
#   * never runs `git clean`, `git reset --hard`, or any `rm`/`rm -rf` on the
#     harness home (only its own mktemp workspace is removed)
#   * gitignored/untracked local state (credentials, sessions, storages,
#     attachments, settings) is left exactly where it is
#   * any existing file that the checkout would overwrite is first copied into
#     <target>/.restore-backup-<UTC>/ and reported
#   * paths holding local state are listed before and after, and any change is
#     reported as a failure
#
# Standalone: it needs only git, so it can be fetched and run before the repo
# exists (it bootstraps ~/.dsh itself).
#
#   bash restore.sh [options]
#
#     --repo URL     git remote to restore from
#                    (default $DSH_HOME_REPO or https://github.com/zhoupen9/deepseek-harness-home.git)
#     --ref REF      branch to restore (default: main)
#     --target DIR   harness home (default: $DSH_HOME or ~/.dsh)
#     --no-build     skip `pnpm setup` (dependency install + plugin rebuild + verify)
#     --force        allow discarding local modifications to tracked files
#     --dry-run      print the plan and change nothing
#
set -euo pipefail

DEFAULT_REPO="https://github.com/zhoupen9/deepseek-harness-home.git"
DEFAULT_REF="main"

# Local state that a restore must never touch. Relative to the target.
PRESERVE=(
  .credentials.yaml
  .anonymous-user-id
  settings.yaml
  sessions
  storages
  attachments
  .plugin-manager
  node_modules
)

REPO_URL="${DSH_HOME_REPO:-$DEFAULT_REPO}"
REF="$DEFAULT_REF"
TARGET="${DSH_HOME:-$HOME/.dsh}"
BUILD=1
FORCE=0
DRY=0

say()  { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY" = 1 ]; then say "   would run: $*"; else "$@"; fi; }

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)     REPO_URL="${2:-}"; [ -n "$REPO_URL" ] || die "--repo needs a value"; shift 2 ;;
    --ref)      REF="${2:-}";      [ -n "$REF" ] || die "--ref needs a value"; shift 2 ;;
    --target)   TARGET="${2:-}";   [ -n "$TARGET" ] || die "--target needs a value"; shift 2 ;;
    --no-build) BUILD=0; shift ;;
    --force)    FORCE=1; shift ;;
    --dry-run)  DRY=1; shift ;;
    -h|--help)  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)          die "unknown option: $1 (try --help)" ;;
  esac
done

command -v git >/dev/null 2>&1 || die "git is required but was not found"

# Resolve the target to an absolute path without requiring it to exist yet.
case "$TARGET" in
  "~"|"~/"*) TARGET="$HOME/${TARGET#"~/"}" ;;
esac
TARGET="$(cd "$(dirname "$TARGET")" 2>/dev/null && pwd || printf '%s' "$(dirname "$TARGET")")/$(basename "$TARGET")"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$TARGET/.restore-backup-$STAMP"
TMPDIR_RESTORE="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_RESTORE"' EXIT

step "Restoring $TARGET"
say "  repo:   $REPO_URL"
say "  ref:    $REF"
say "  build:  $([ "$BUILD" = 1 ] && echo 'pnpm setup' || echo 'skipped')"
[ "$DRY" = 1 ] && say "  mode:   dry run (nothing will change)"

# --- 1. repository -----------------------------------------------------------
if [ -e "$TARGET/.git" ]; then
  step "Existing repository"
  current="$(git -C "$TARGET" remote get-url origin 2>/dev/null || true)"
  if [ -z "$current" ]; then
    say "  adding origin $REPO_URL"
    run git -C "$TARGET" remote add origin "$REPO_URL"
  elif [ "$current" != "$REPO_URL" ]; then
    die "origin is $current, not $REPO_URL (re-run with --repo '$current' to keep it)"
  else
    say "  origin already $REPO_URL"
  fi

  # Local edits to tracked files are the only thing a checkout would destroy.
  edited="$(git -C "$TARGET" status --porcelain --untracked-files=no || true)"
  if [ -n "$edited" ]; then
    if [ "$FORCE" = 1 ]; then
      warn "local modifications will be discarded (backed up first):"
      printf '%s\n' "$edited" | sed 's/^/    /' >&2
    else
      printf '%s\n' "$edited" | sed 's/^/    /' >&2
      die "local modifications to tracked files; commit/stash them, or re-run with --force to discard (they are backed up first)"
    fi
  fi
else
  step "Preparing $TARGET (no repository yet)"
  run mkdir -p "$TARGET"
  if [ "$DRY" = 0 ]; then
    git -C "$TARGET" init -q
    git -C "$TARGET" symbolic-ref HEAD "refs/heads/$REF"
  fi
  run git -C "$TARGET" remote add origin "$REPO_URL"
fi

step "Fetching $REF"
run git -C "$TARGET" fetch --prune origin "$REF"
if [ "$DRY" = 0 ]; then
  git -C "$TARGET" rev-parse --verify FETCH_HEAD >/dev/null 2>&1 || die "fetch produced no FETCH_HEAD"
else
  say "   (dry run: skipping the checkout plan that depends on the fetch)"
  exit 0
fi

# --- 2. what would be overwritten -------------------------------------------
# Files that exist now, are not tracked by this repository's index yet, and
# also exist in the incoming tree: the app-created skeletons a checkout would
# clobber. They are copied aside, never deleted.
git -C "$TARGET" ls-tree -r --name-only FETCH_HEAD | sort > "$TMPDIR_RESTORE/incoming"
git -C "$TARGET" ls-files --others --exclude-standard | sort > "$TMPDIR_RESTORE/untracked"
comm -12 "$TMPDIR_RESTORE/untracked" "$TMPDIR_RESTORE/incoming" > "$TMPDIR_RESTORE/collisions" || true

backup_file() {
  rel="$1"
  dest="$BACKUP/$rel"
  mkdir -p "$(dirname "$dest")"
  cp -p "$TARGET/$rel" "$dest"
  say "  backed up $rel"
}

if [ -s "$TMPDIR_RESTORE/collisions" ]; then
  step "Files the restore would overwrite (copied to .restore-backup-$STAMP)"
  while IFS= read -r rel; do backup_file "$rel"; done < "$TMPDIR_RESTORE/collisions"
fi

if [ "$FORCE" = 1 ] && [ -n "${edited:-}" ]; then
  step "Backing up local modifications"
  git -C "$TARGET" diff --name-only >> "$TMPDIR_RESTORE/modified" || true
  git -C "$TARGET" diff --cached --name-only >> "$TMPDIR_RESTORE/modified" || true
  while IFS= read -r rel; do
    [ -n "$rel" ] && [ -e "$TARGET/$rel" ] && backup_file "$rel"
  done < <(sort -u "$TMPDIR_RESTORE/modified")
fi

# --- 3. local state snapshot ------------------------------------------------
snapshot() {
  out="$1"; : > "$out"
  for rel in "${PRESERVE[@]}"; do
    if [ -e "$TARGET/$rel" ]; then
      find "$TARGET/$rel" -type f 2>/dev/null | sed "s|^$TARGET/||" | sort >> "$out"
    fi
  done
}
snapshot "$TMPDIR_RESTORE/before"

# --- 4. checkout ------------------------------------------------------------
step "Checking out $REF"
# -f is required only for the backed-up collisions; the branch is reset to the
# fetched commit, which is what "restore" means here.
git -C "$TARGET" -c advice.detachedHead=false checkout -f -B "$REF" FETCH_HEAD
git -C "$TARGET" branch --set-upstream-to="origin/$REF" "$REF" >/dev/null 2>&1 || true
say "  HEAD $(git -C "$TARGET" rev-parse --short HEAD) ($REF)"

# --- 5. prove local state survived -----------------------------------------
step "Verifying local state"
snapshot "$TMPDIR_RESTORE/after"
if diff -u "$TMPDIR_RESTORE/before" "$TMPDIR_RESTORE/after" > "$TMPDIR_RESTORE/state.diff"; then
  count=$(wc -l < "$TMPDIR_RESTORE/after" | tr -d ' ')
  say "  unchanged: $count file(s) under ${PRESERVE[*]}"
else
  sed 's/^/    /' "$TMPDIR_RESTORE/state.diff" >&2
  die "local state changed during restore (diff above); inspect $BACKUP and the paths listed"
fi

# --- 6. dependencies, build, verify ----------------------------------------
if [ "$BUILD" = 1 ]; then
  step "Installing dependencies and rebuilding plugins"
  command -v node >/dev/null 2>&1 || die "node not found; install Node >= 22.19 and re-run with --no-build to skip this step"
  command -v pnpm >/dev/null 2>&1 || die "pnpm not found; install pnpm >= 9 and re-run with --no-build to skip this step"
  ( cd "$TARGET" && pnpm setup )
else
  step "Skipping dependency install (--no-build)"
  say "  run later: cd $TARGET && pnpm setup"
fi

# --- 7. summary -------------------------------------------------------------
step "Done"
say "  restored  $TARGET at $(git -C "$TARGET" rev-parse --short HEAD) ($REF)"
if [ -d "$BACKUP" ]; then
  say "  backup    $BACKUP (nothing was deleted; review, then remove it yourself)"
else
  say "  backup    none needed"
fi
say ""
say "  Next: recreate $TARGET/.credentials.yaml (DEEPSEEK_API_KEY), or sign in in the app."
say "        Optional providers: ANYSEARCH_API_KEY, ZAI_CODING_CN_API_KEY."
say "        sessions/, storages/, attachments/ were left untouched; they are not restored from git."
