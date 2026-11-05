#!/usr/bin/env bash
# Update an already-restored DeepSeek Harness home (~/.dsh) from its git remote.
#
# Pull is fast-forward only, and the update is non-destructive:
#   * never runs `git clean`, `git reset --hard`, or any `rm` on the home
#   * untracked and gitignored local state (credentials, sessions, storages,
#     attachments, settings, .plugin-manager) is never touched
#   * untracked files that the incoming commit would overwrite are copied into
#     <target>/.restore-backup-<UTC>/ first
#   * local modifications to tracked files abort the update unless --force,
#     and are backed up when forced
#
# After the pull it repairs what a pull can break — stale profile links, changed
# dependencies, plugin source changes — by running `pnpm setup`, and reports how
# the change reaches the running app.
#
#   bash update.sh [options]
#
#     --ref REF      branch to update to (default: main)
#     --remote NAME  git remote to use (default: origin)
#     --target DIR   harness home (default: $DSH_HOME or ~/.dsh)
#     --no-build     pull only: never install or rebuild
#     --build        force `pnpm setup` even when nothing relevant changed
#     --force        allow discarding local modifications to tracked files
#     --dry-run      print the plan and change nothing
#
set -euo pipefail

REF="main"
REMOTE="origin"
TARGET="${DSH_HOME:-$HOME/.dsh}"
MODE="auto"          # auto | never | always
FORCE=0
DRY=0

say()  { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY" = 1 ]; then say "   would run: $*"; else "$@"; fi; }

while [ $# -gt 0 ]; do
  case "$1" in
    --ref)      REF="${2:-}";     [ -n "$REF" ] || die "--ref needs a value"; shift 2 ;;
    --remote)   REMOTE="${2:-}";  [ -n "$REMOTE" ] || die "--remote needs a value"; shift 2 ;;
    --target)   TARGET="${2:-}";  [ -n "$TARGET" ] || die "--target needs a value"; shift 2 ;;
    --no-build) MODE="never"; shift ;;
    --build)    MODE="always"; shift ;;
    --force)    FORCE=1; shift ;;
    --dry-run)  DRY=1; shift ;;
    -h|--help)  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)          die "unknown option: $1 (try --help)" ;;
  esac
done

command -v git >/dev/null 2>&1 || die "git is required but was not found"
case "$TARGET" in "~"|"~/"*) TARGET="$HOME/${TARGET#"~/"}" ;; esac
[ -e "$TARGET/.git" ] || die "$TARGET is not a git checkout; run scripts/restore.sh first"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$TARGET/.restore-backup-$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git_() { git -C "$TARGET" "$@"; }

step "Updating $TARGET"
say "  remote: $REMOTE/$REF"
[ "$DRY" = 1 ] && say "  mode:   dry run (nothing will change)"

git_ remote get-url "$REMOTE" >/dev/null 2>&1 || die "remote '$REMOTE' is not configured in $TARGET"

# --- 1. guard local state ---------------------------------------------------
step "Checking the worktree"
edited="$(git_ status --porcelain --untracked-files=no || true)"
git_ diff --name-only HEAD -- > "$TMP/modified_all" 2>/dev/null || true

# Two kinds of tracked churn are machine-generated and expected:
#   * pnpm-lock.yaml        rewritten by `pnpm setup` / a different pnpm build
#   * packages/client/*/lib built output; CSS-module hashes derive from the
#                           absolute source path, so a build at another path
#                           always differs from the committed artifact
# They are backed up, then overwritten — they never block the update.
benign_re='^(profiles/[^/]+/pnpm-lock\.yaml|packages/client/[^/]+/lib/)'
grep -vE "$benign_re" "$TMP/modified_all" > "$TMP/blocking" || true
grep -E "$benign_re" "$TMP/modified_all" > "$TMP/benign" || true

backup_file() {
  rel="$1"
  mkdir -p "$(dirname "$BACKUP/$rel")"
  cp -p "$TARGET/$rel" "$BACKUP/$rel"
  say "  backed up $rel"
}

if [ -s "$TMP/benign" ]; then
  say "  machine-generated churn (lockfile / built lib): $(wc -l < "$TMP/benign" | tr -d ' ') file(s), continuing"
fi
if [ -s "$TMP/blocking" ]; then
  if [ "$FORCE" = 1 ]; then
    warn "local modifications to tracked files will be discarded only if an update is applied (backed up first):"
    sed 's/^/    /' "$TMP/blocking" >&2
  else
    sed 's/^/    /' "$TMP/blocking" >&2
    die "local modifications to tracked files; commit/stash them, or re-run with --force (they are backed up first)"
  fi
fi

BEFORE="$(git_ rev-parse HEAD)"
say "  HEAD $BEFORE ($(git_ rev-parse --abbrev-ref HEAD))"

# --- 2. fetch + fast-forward only ------------------------------------------
step "Fetching $REMOTE/$REF"
run git_ fetch --prune "$REMOTE" "$REF"
[ "$DRY" = 1 ] && { say "   (dry run: stopping before the merge plan)"; exit 0; }

AFTER="$(git_ rev-parse "$REMOTE/$REF")"
if [ "$BEFORE" = "$AFTER" ]; then
  say "  already up to date at $(git_ rev-parse --short HEAD)"
  exit 0
fi

git_ merge-base --is-ancestor "$BEFORE" "$AFTER" || die "history diverged: $BEFORE is not an ancestor of $REMOTE/$REF. Resolve manually (git pull --rebase); this script never rewrites history."

# Changes this update brings.
git_ diff --name-only "$BEFORE" "$AFTER" > "$TMP/changed"
git_ diff --name-only --diff-filter=A "$BEFORE" "$AFTER" | sort > "$TMP/added"
git_ ls-tree -r --name-only HEAD | sort > "$TMP/tracked"
git_ ls-files --others --exclude-standard | sort > "$TMP/untracked"
comm -12 "$TMP/untracked" "$TMP/added" > "$TMP/collisions" || true

if [ -s "$TMP/collisions" ]; then
  step "Untracked files the update would overwrite (copied aside)"
  while IFS= read -r rel; do backup_file "$rel"; done < "$TMP/collisions"
fi
step "Backing up files the checkout replaces"
while IFS= read -r rel; do [ -n "$rel" ] && [ -e "$TARGET/$rel" ] && backup_file "$rel"; done < <(cat "$TMP/benign" "$TMP/blocking" | sort -u)

step "Fast-forwarding"
say "  $(git_ log --oneline -1 "$AFTER")"
run git_ checkout -f -B "$REF" "$AFTER"
run git_ branch --set-upstream-to="$REMOTE/$REF" "$REF"
say "  now at $(git_ rev-parse --short HEAD)"

# --- 3. classify what changed ----------------------------------------------
step "Changes"
n=$(wc -l < "$TMP/changed" | tr -d ' ')
say "  $n file(s) changed"
if [ "$n" -le 20 ]; then sed 's/^/    /' "$TMP/changed"; else head -20 "$TMP/changed" | sed 's/^/    /'; say "    … ($((n-20)) more)"; fi

touch_plugins=0; touch_profiles=0; touch_bundles=0; touch_toolchain=0; touch_scripts=0
while IFS= read -r f; do
  case "$f" in
    packages/client/*)   touch_plugins=1 ;;
    packages/bundles/*)  touch_bundles=1 ;;
    profiles/*)          touch_profiles=1 ;;
    scripts/*)           touch_scripts=1 ;;
    package.json|pnpm-lock.yaml|tsconfig.base*.json) touch_toolchain=1 ;;
  esac
done < "$TMP/changed"

# Did the set of link: dependencies change? That is what leaves stale symlinks.
link_names() { git_ show "$1:profiles/desktop/package.json" 2>/dev/null | grep -o '"[^"]*"[[:space:]]*:[[:space:]]*"link:' | sort || true; }
link_names "$BEFORE" > "$TMP/links.before"
link_names "$AFTER"  > "$TMP/links.after"
links_changed=0
cmp -s "$TMP/links.before" "$TMP/links.after" || links_changed=1

say "  plugins=$touch_plugins bundles=$touch_bundles profiles=$touch_profiles toolchain=$touch_toolchain scripts=$touch_scripts links_changed=$links_changed"
[ "$links_changed" = 1 ] && { say "  link: dependencies changed:"; diff "$TMP/links.before" "$TMP/links.after" | sed 's/^/    /' || true; }

# --- 4. repair --------------------------------------------------------------
need=0
verify_failed=0
if [ "$MODE" = "always" ]; then need=1
elif [ "$MODE" = "auto" ]; then
  if [ "$touch_plugins" = 1 ] || [ "$touch_toolchain" = 1 ] || [ "$touch_scripts" = 1 ] || [ "$links_changed" = 1 ] || [ "$touch_profiles" = 1 ]; then need=1; fi
fi

if [ "$need" = 1 ]; then
  step "Repairing (install, relink, rebuild, verify)"
  command -v node >/dev/null 2>&1 || die "node not found; install Node >= 22.19 (or re-run with --no-build)"
  command -v pnpm >/dev/null 2>&1 || die "pnpm not found; install pnpm >= 9 (or re-run with --no-build)"
  ( cd "$TARGET" && pnpm setup )
else
  step "Repairing"
  if [ "$MODE" = "never" ]; then say "  skipped (--no-build)"
  else say "  not needed: no plugin, profile, toolchain, or script changes"
  fi
  if [ -f "$TARGET/scripts/client-plugins.mjs" ]; then
    say "  running the read-only check instead"
    ( cd "$TARGET" && pnpm verify ) || verify_failed=1
  fi
fi

# --- 5. what the user must do ----------------------------------------------
step "Done"
say "  updated $TARGET to $(git_ rev-parse --short HEAD) ($REF)"
if [ -d "$BACKUP" ]; then say "  backup  $BACKUP (nothing was deleted; review, then remove it yourself)"; fi
say ""
if [ "$verify_failed" = 1 ]; then
  die "the checkout is inconsistent: pnpm verify failed. Run: cd $TARGET && pnpm setup"
fi

if [ "$touch_bundles" = 1 ] || [ "$links_changed" = 1 ] || [ "$touch_profiles" = 1 ]; then
  say "  Bundle, profile, or link changes: reload the GUI tab. If the Edits / Changes / Git tabs"
  say "  or the header pills are missing after reloading, restart the desktop app so the"
  say "  composition is re-read from disk."
elif [ "$touch_plugins" = 1 ]; then
  say "  Client plugins were rebuilt: reload the GUI tab to load the new bundles."
else
  say "  No runtime-relevant changes: nothing to reload."
fi
say "  sessions/, storages/, attachments/, settings and credentials were not touched."
