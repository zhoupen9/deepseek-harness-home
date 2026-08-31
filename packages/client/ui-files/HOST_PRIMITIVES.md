# Host-side workspace-files primitives — requirements to implement

This document is the implementation spec for the server-side (Host) work that
the rewritten ui-files explorer depends on. The client half
(src/client/files-remote.ts) already codes against the contract below and
degrades gracefully to its session-known reconstruction until these primitives
exist, so the two halves can land independently.

## 1. Why a new namespace (not the existing directory picker)

The browser cannot touch the filesystem; every directory/file fact must cross
the wire from the Host. The only listing verb the Host exposes to clients today
is directoryPickerController.list -> ctx.remote.directoryPicker.list, and it is
deliberately directories-only:

- packages/host/directory-picker-browse/src/index.ts skips every non-directory
  dirent (if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue).
- DirectoryEntry carries only { name, path, hidden } — no file kind, size, or
  mtime — and there is no file-read verb anywhere on the wire.

That contract serves workspace *picking* and must not change. Add a separate
namespace instead.

## 2. Namespace and wiring

- New Host service workspaceFilesController (seam-style, like
  directoryPickerController), exposing two @Remote verbs that surface as
  ctx.remote.workspaceFiles on the client. Both verbs are AGENT-scoped: the
  Host methods take an injected `agent: Agent` first parameter (its session
  cwd is the fence root), and the generated client methods therefore take the
  session id first — `agentId: SessionId`:
  - list(agentId: SessionId, path?: string, signal?: AbortSignal): Promise<WorkspaceFilesListing>
  - read(agentId: SessionId, path: string, signal?: AbortSignal): Promise<WorkspaceFilesContent>
  Callers MUST pass the session id; passing only the path misroutes the path
  as the agent id ("session <path> not found").
- VCS (git) status is a capability of `list`, NOT a third verb: each entry
  carries its status inline (section 3 / 4.5) so the lazy-tree client needs one
  round-trip per level. When git is absent or broken, `list` returns
  `vcs: { kind: 'none' }` / `{ kind: 'error' }` and listing still succeeds.
- A new ./remote contribution module (mirroring packages/api/*/remote) that:
  1. declaration-merges the namespace into ClientRemote
     (@deepseek-ai/dsh-api-gateway/client);
  2. provides the $mount contribution;
  3. is added to the assembly list in packages/api/remotes/src/client/index.ts.
- Register the controller as a Host Loader entry so it ships with the web
  bundle (@deepseek-ai/dsh-web-app) alongside dsh-host-directory-picker-browse.

Each verb returns the standard ClientResult<T> envelope
({ ok: true, value } | { ok: false, error }) so the client accessor
(files-remote.ts) can unwrap it uniformly with every other namespace.

## 3. Wire types

    /** VCS status of one file, collapsed index+worktree (v1: one icon per file). */
    type VcsFileStatus =
      | 'modified' | 'added' | 'deleted'
      | 'renamed' | 'untracked' | 'ignored' | 'conflicted'

    /** Repo context of a listing. */
    type VcsContext =
      | { kind: 'none' }                             // no repo at/above the path
      | { kind: 'error'; message: string }           // git present but failed
      | { kind: 'git'; root: string; worktree: string }
                                                    // root = worktree top-level,
                                                    // worktree = the .git dir path

    /** One listed child: a directory or a file. */
    interface WorkspaceFilesEntry {
      name: string
      path: string          // absolute host path; clients never join segments
      kind: 'dir' | 'file'
      hidden: boolean       // POSIX dot-prefix; Windows hidden attr if available
      size?: number         // bytes; present iff kind === 'file'
      modifiedAt?: number   // epoch ms; present iff kind === 'file'
      vcs?: VcsFileStatus   // present iff listing.vcs.kind === 'git' AND the
                            // entry's status is notable. Files: modified/added/
                            // deleted/renamed/untracked/ignored/conflicted (a
                            // clean tracked file carries no vcs field).
                            // Directories: 'ignored' when the entire directory
                            // is git-ignored (!! dir/), otherwise absent.
      vcsDirty?: boolean    // dirs only, present (true) iff listing.vcs.kind === 'git'
                            // AND a descendant differs (modified/added/deleted/
                            // renamed/untracked/conflicted; ignored-only does not count)
    }

    /** One directory level plus ancestry. */
    interface WorkspaceFilesListing {
      path: string                              // absolute path of the listed dir
      home: string                              // host account home (breadcrumb root)
      crumbs: WorkspaceFilesEntry[]             // root -> listed dir, kind 'dir', no vcs
      entries: WorkspaceFilesEntry[]            // direct children, dirs then files
      truncated: boolean                        // true when entries hit the bound
      vcs: VcsContext                           // repo context; 'git' enables vcs fields
    }

    /** Bounded read of one text file. */
    interface WorkspaceFilesContent {
      path: string
      size: number          // bytes
      binary: boolean       // true when the file is not valid UTF-8 text
      truncated: boolean    // true when content was cut at the read bound
      content: string       // decoded text; '' when binary
      totalLines: number    // 0 when binary
    }

## 4. Behavior requirements

### 4.1 Root fence (security-critical)

The explorer is workspace-scoped. list and read MUST refuse any target outside
the session workspace root:

- The controller resolves the session's cwd (the same value SessionSummary.cwd
  carries) as the ceiling.
- A target path is accepted only if it is fully qualified (same fence as
  directory-picker-browse's fullyQualified) AND lies within the root (or equals
  it), after resolve().
- list/read of a path at or above the root's parent is refused with
  workspace-path-outside-root. The client never renders a "go up" above the
  root, so this is a Host-enforced backstop, not a UX nicety.
- Symlinks must not escape the fence: resolve the real path of every listed
  child and the read target (fs.realpath); a symlink that resolves outside the
  root is reported as a leaf entry but its read is refused
  (workspace-path-outside-root). Broken/cyclic links list as files with no
  size/modifiedAt and fail read with workspace-file-unreadable.

### 4.2 Listing (list)

- Stream the level with opendir (one dirent at a time), exactly like
  directory-picker-browse; never readdir a whole level into memory.
- Include BOTH directories and files. For each entry:
  - directories: kind 'dir' (symlinks-to-directory included after a stat probe,
    same as the picker);
  - files: kind 'file' with size and modifiedAt from a stat (symlinks-to-file
    included; broken/cyclic links kept as kind 'file' with no size/mtime).
- Sort directories first, then files, each alphabetical (the client also sorts,
  but the Host sort is the canonical order the spec promises).
- hidden: dot-prefix on POSIX; the Windows hidden attribute when exposed by the
  platform dirents (documented best-effort, same limitation the picker records).
  Hidden entries are returned and flagged, never dropped — the client owns the
  show/hide toggle.
- Bounding: maxEntries config, default 1000, counting directories AND files
  together; a cut level sets truncated: true. Reuse the bounded-window insertion
  strategy from directory-picker-browse (O(bound) memory).
- crumbs = the picker's ancestryCrumbs chain (root -> target), every crumb a
  kind 'dir' entry with hidden: false and no vcs/vcsDirty.
- Race EVERY fs await against signal (abort stops the scan and closes the
  handle), per directory-picker-browse's raceAbort.

### 4.3 Read (read)

- Accept a single file path under the root fence.
- Reject directories and non-regular files with workspace-file-unreadable (the
  explorer only reads regular files).
- Bound the read: maxBytes config, default 512 KiB. Read at most maxBytes + 1
  bytes; the extra byte proves truncation. truncated: true and content holds the
  first maxBytes bytes when the file is larger.
- Binary detection: attempt TextDecoder('utf-8', { fatal: true }) over the bytes.
  On failure set binary: true, content: '', totalLines: 0; do not base64 (the
  explorer never renders binary, and base64 on the wire is a non-goal for v1).
  A UTF-8 BOM is stripped.
- totalLines = the number of LF newlines in the decoded text (a trailing newline
  is a terminator, not an extra line — match the client's files-text.ts
  contentLines convention).
- Race every fs await against signal; an aborted read rejects with the signal
  reason and closes the handle.

### 4.4 Error vocabulary (closed set)

workspaceFilesController throws a typed error with one of:

| code | meaning |
| --- | --- |
| workspace-path-outside-root | target escapes the session workspace root |
| workspace-path-unreadable | target not fully qualified, or cannot be listed |
| workspace-file-unreadable | read target is a dir/non-regular file, unreadable, or broken link |
| workspace-path-not-found | target does not exist |

Mirror these onto the wire (like DirectoryPickerErrorCode) so the client can
map business codes without string matching. VCS failures are NOT in this
vocabulary: they surface as listing.vcs (see 4.5), never as a thrown error.

### 4.5 VCS (git) status

- Snapshot, not per-call git: compute ONE git status snapshot per worktree root,
  cached and reused across list calls, so a path's status cannot flip between
  two sibling list calls mid-render. Invalidate on the client's Refresh or a
  short TTL; a stale snapshot is acceptable (an explorer is point-in-time).
- Invocation (security-critical): run git with the workspace root as cwd and
  `-c core.hooksPath=/dev/null -c core.fsmonitor=false`, and never follow a
  `.git` FILE (gitlink / linked worktree / submodule) that resolves outside the
  fence. The reported `vcs.root` may legitimately lie ABOVE the workspace root
  (cwd is often a subdir of the repo); that is informational only — the 4.1
  fence still bounds what list/read will serve.
- Ignored != untracked: list returns ignored files on disk, so mark them
  `ignored` (git status --ignored / check-ignore), never `untracked`. A file
  with no index/HEAD entry and not ignored is `untracked`.
- Mapping: porcelain XY columns collapse to the enum — `??`->untracked,
  `!!`->ignored, `A`->added, `M`->modified, `D`->deleted, `R`->renamed,
  `U`/`AA`/`DD`/`AU`/`UA`/`DU`/`UD`->conflicted. v1 collapses staged+unstaged
  into one code; an `index`/`worktree` pair is the future extension point.
- vcsDirty (directory): true when any descendant has a notable status
  (modified/added/deleted/renamed/untracked/conflicted). Ignored-only
  descendants do NOT mark a dir dirty. Derive from the snapshot (prefix match
  on dirty paths), not a recursive walk.
- Ignored directory: an entirely-ignored directory (`!! dir/` from
  `git status --ignored`) carries `vcs: 'ignored'` on the DIRECTORY entry so
  the client grays it out; it is never vcsDirty.
- Directory status color (v1 limit): a directory is only marked dirty/not-dirty
  (`vcsDirty`) or ignored (`vcs: 'ignored'`). To color directories by the KIND
  of change (modified vs untracked vs deleted vs added), the host would need to
  aggregate descendant statuses into a directory-level `vcs` status (e.g.
  `vcs: 'modified' | 'untracked' | 'deleted' | ...` on the directory entry).
  Until then the client colors every dirty directory with the modified amber.
- Failure = context, not error: git missing -> `{ kind: 'none' }`; git present
  but a status run fails -> `{ kind: 'error', message }`. In both cases listing
  succeeds and entries simply omit vcs/vcsDirty.
- Bounding: cap the reported dirty set (vcs.maxDirtyPaths, section 5). Past the
  cap, stop annotating (entries omit vcs/vcsDirty) rather than failing; the
  tree stays browsable and status just degrades.

## 5. Config

    static Config = z.object({
      maxEntries: z.natural().min(1).default(1000),        // listing bound
      maxBytes:   z.natural().min(1).default(512 * 1024),  // read bound
      vcs: z.object({
        enabled:       z.boolean().default(true),          // master switch
        maxDirtyPaths: z.natural().min(1).default(20000),  // status-snapshot bound
      }).default({}),
    })

## 6. Non-goals (v1)

- No stat verb, no rename/delete/create, no multi-select, no search (the tree
  is navigated by lazy expansion only).
- No binary content transfer (binary files render a "binary" notice).
- No live-watch/refresh push (the client offers a manual Refresh).
- No cross-session browsing (each explorer is rooted at its session's cwd).
- VCS status is READ-ONLY decoration: no stage/unstage/commit/diff/blame verbs,
  no per-line gutter diff, and no two-column (staged vs unstaged) rendering.

## 7. Acceptance criteria

1. With the controller loaded, ctx.remote.workspaceFiles.list(root) returns
   directories AND files under a workspace, directories first.
2. read(path) returns bounded UTF-8 text with truncated/binary correct on a
   >512 KiB file and a PNG respectively.
3. list('/etc') and read of any path outside the workspace root are refused
   with workspace-path-outside-root; a symlink pointing outside the root lists
   but refuses to read.
4. An aborted signal rejects promptly and closes the handle (no leaked fd).
5. The client plugin, with this namespace present, renders a live directories
   AND files tree and reads file content on selection — with no other client
   change (see files-remote.ts).
6. Under a git repo, list(root) annotates modified/untracked/ignored files and
   sets vcsDirty on dirs containing them; outside a repo listing.vcs.kind is
   'none' and no entry carries vcs/vcsDirty.
7. A git-ignored file present on disk is reported ignored, not untracked; an
   entirely-ignored directory is reported with `vcs: 'ignored'` and is not
   vcsDirty.
8. A missing/broken git yields vcs 'none'/'error' and a successful listing (no
   throw).
9. Two sibling list calls served from the same snapshot return identical status
   for the same path; Refresh recomputes it.
