# Host-side git history primitives — implemented (reference)

This documents the Host `git` Remote namespace (`ctx.remote.git`) the ui-git
tab depends on. It is implemented and running: the client half
(`src/client/git-remote.ts` + `src/client/git-contract.ts`) codes against
exactly this contract. The tab falls back to a "requires host" notice on any
build that lacks the namespace.

## 1. Why a new namespace

The browser cannot run `git log` or read a repository; every commit, parent
link, ref, and repo fact must cross the wire from the Host. No existing Remote
namespace serves git history. The `workspaceFiles` namespace (`dsh-api-workspace-files-controller`)
decorates directory listings with VCS *status* only — it has no commit/history
verb, and its status vocabulary is per-file, not per-commit. Add a separate
namespace instead.

## 2. Namespace and wiring

- New Host service `gitController` (seam-style, like `WorkspaceFilesController`),
  exposing two `@Remote` verbs that surface as `ctx.remote.git` on the
  client. Both verbs are AGENT-scoped: the Host method takes an injected
  `agent: Agent` first parameter (its session cwd is the fence root), and the
  generated client method therefore takes the session id first —
  `agentId: SessionId`:

      log(agent: Agent, options?: GitLogOptions, signal?: AbortSignal): Promise<GitLogResult>
      show(agent: Agent, hash: string, signal?: AbortSignal): Promise<GitShowResult>

  The generated client sides are `ctx.remote.git.log(agentId, options?, signal?)`
  and `ctx.remote.git.show(agentId, hash, signal?)`. Callers MUST pass the
  session id; passing only the options/hash misroutes the argument as the agent id.
- `options` is optional and JSON-encoded (`acceptsUndefined`), mirroring
  `workspaceFiles/list`'s optional `path` parameter. `show`'s `hash` is a
  required string.
- A new `./remote` contribution module (mirroring `packages/api/*/remote`) that:
  1. declaration-merges the namespace into `ClientRemote`
     (`@deepseek-ai/dsh-api-gateway/client`);
  2. provides the `$mount` contribution;
  3. is added to the assembly list in `packages/api/remotes/src/client/index.ts`.
- Register the controller as a Host Loader entry so it ships with the web
  bundle (`@deepseek-ai/dsh-web-app`) alongside
  `dsh-host-directory-picker-browse` and `dsh-api-workspace-files-controller`.

The verb returns the standard `ClientResult<T>` envelope
(`{ ok: true, value } | { ok: false, error }`) so the client accessor
(`git-remote.ts`) unwraps it uniformly with every other namespace.

## 3. Wire types

    type GitContext =
      | { kind: 'none' }                             // no repo at/above the session cwd
      | { kind: 'error'; message: string }           // git present but failed
      | { kind: 'git'; root: string; worktree: string }
                                                    // root = worktree top-level,
                                                    // worktree = the .git dir path

    interface GitRef {
      name: string           // short display name: 'main', 'HEAD', 'v1.2', 'origin/main'
      kind: 'head' | 'branch' | 'tag' | 'remote'
    }

    interface GitCommit {
      hash: string           // full 40-char object id
      parents: string[]      // parent object ids in order ([] = root; length >= 2 = merge)
      authorName: string
      authorEmail: string
      authorTime: number     // author epoch ms
      subject: string        // first line of the commit message
      refs: GitRef[]         // refs pointing at this commit; [] when undecorated
    }

    interface GitLogOptions {
      maxCount?: number      // commit bound (host default when absent)
      all?: boolean          // true: all refs; false/absent: HEAD's ancestry
      firstParent?: boolean  // true: follow only the first-parent (mainline) chain
    }

    interface GitLogResult {
      vcs: GitContext
      currentBranch?: string // HEAD branch short name, or 'HEAD' when detached
      headHash?: string      // HEAD object id; absent outside a repo / empty repo
      commits: GitCommit[]   // newest first
      truncated: boolean     // true when commits was cut at the bound
    }

    interface GitShowCommit extends GitCommit {
      committerName: string
      committerEmail: string
      committerTime: number  // epoch ms
      body: string           // full commit message body (subject excluded)
    }

    interface GitShowFile {
      path: string           // model-facing path
      status: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied' | 'typechanged' | 'unmerged'
      previousPath?: string  // original path; present for renames/copies
    }

    interface GitShowResult {
      vcs: GitContext
      commit?: GitShowCommit // present when the hash exists in the repo
      files: GitShowFile[]   // changed paths, in host order
      diff: string           // unified diff text
      diffTruncated: boolean // true when diff was cut at the bound
    }

## 4. Behavior requirements

### 4.1 Root fence (security-critical)

The log is workspace-scoped. The controller resolves the session's cwd (the
same value `SessionSummary.cwd` carries) as the fence root:

- Discover the repo from the session cwd (`git rev-parse`), never from a
  client-supplied path — there is no client-supplied path argument.
- The reported `vcs.root` may legitimately lie ABOVE the session cwd (cwd is
  often a subdirectory of the repo); that is informational only. The fence
  still bounds what the Host will run git against.
- Never follow a `.git` FILE (gitlink / linked worktree / submodule) that
  resolves outside the fence root; a `.git` directory outside the fence is
  treated as `vcs: { kind: 'none' }`.

### 4.2 Repo discovery

- Run discovery with the session cwd: `git rev-parse --show-toplevel` (root)
  and `git rev-parse --absolute-git-dir` (worktree).
- Missing/broken git → `vcs: { kind: 'none' }`; git present but the command
  fails → `vcs: { kind: 'error', message }`. In BOTH cases the verb resolves
  successfully (commits empty, truncated false) — never throw.
- currentBranch: `git rev-parse --abbrev-ref HEAD` (`HEAD` means detached).
  headHash: `git rev-parse HEAD`; an unborn branch (empty repo) has no
  headHash and no commits.

### 4.3 Log

- Invocation (security-critical): run git with the session cwd and
  `-c core.hooksPath=/dev/null -c core.fsmonitor=false --no-optional-locks`,
  exactly like the workspace-files VCS snapshotter.
- One subprocess per `log` call, a stable NUL-delimited format:

      git log --topo-order -z --max-count=<maxCount> [--all]
        --format=%H%x00%P%x00%an%x00%ae%x00%at%x00%s%x00%D%x00

  `-z` makes records NUL-delimited; `%s` holds the subject and `%P` the
  space-separated parent list. `%D` is empty for undecorated commits.
- `parents`: split `%P` on spaces; an empty field yields `[]`.
- `authorTime`: `%at` is UNIX seconds — multiply by 1000 for epoch ms.
- `refs`: parse `%D` (comma-space separated). `HEAD -> main` yields a
  `head` ref (`HEAD`) plus a `branch` ref (`main`); `refs/heads/main`
  → `branch` `main`; `refs/tags/v1.2` → `tag` `v1.2`;
  `refs/remotes/origin/main` → `remote` `origin/main`. Unknown shapes are
  dropped rather than surfaced raw.
- `truncated`: true when git reported exactly `maxCount` records AND more
  remain (probe `maxCount + 1`), so the client can render the "showing the
  most recent N" notice without a second call.
- Race the subprocess against `signal`: abort kills the child and rejects
  with the signal reason; no leaked child.

### 4.4 Error vocabulary (closed set)

`gitController` throws a typed error only for the fence violation; git
failures are context, not errors (section 4.2):

| code | meaning |
| --- | --- |
| git/outside-root | repo discovery resolved a worktree escaping the session fence |

Mirror it onto the wire (like `DirectoryPickerErrorCode`) so the client can
map business codes without string matching.

### 4.5 Show (commit details)

`show` serves one commit's full detail — the richer commit record (committer
fields + message body), its changed paths, and the unified diff. Same fence,
repo discovery, and invocation-safety rules as `log` (sections 4.1–4.3).

- `hash` is the full object id from a `log` row; unknown hashes resolve
  `vcs: { kind: 'git' }` with `commit` absent (not a throw) so the client
  can render a "commit not found" notice.
- One subprocess: `git show --format=<format> --no-color <hash>` with the same
  `-c core.hooksPath=/dev/null -c core.fsmonitor=false --no-optional-locks`
  flags; the same NUL-delimited `--format` as `log`, extended with
  `%cn%x00%ce%x00%ct%x00%b` (committer name/email/time and the body).
- `files` + `diff`: derive from `git show --name-status` (or `--numstat`
  + a separate `git show --patch`), collapsing porcelain status letters into
  the seven status codes; a rename/copy carries `previousPath`.
- Bound `diff` (e.g. `maxDiffBytes`, default 256 KiB); `diffTruncated: true`
  and the first `maxDiffBytes` bytes when cut.
- Race the subprocess against `signal`; abort kills the child and rejects.

## 5. Config

    static Config = z.object({
      maxCount:   z.natural().min(1).default(200),          // log commit bound
      all:        z.boolean().default(false),               // HEAD ancestry by default
      maxDiffBytes: z.natural().min(1).default(256 * 1024), // show diff bound
    })

## 6. Non-goals (v1)

- No blame/file-tree/commit-mutation verbs (no stage/unstage/commit); `show`
  is read-only and carries the unified diff.
- No incremental paging or live refresh push (the client re-fetches on mount).
- No email/author search, no branch/tag list verb (refs ride the commits).
- No per-line gutter diff; the graph is history topology only.
- No cross-session browsing (each log is rooted at its session's cwd).

## 7. Acceptance criteria

1. With the controller loaded, `ctx.remote.git.log(agentId)` returns the
   HEAD ancestry newest-first, each commit carrying hash/parents/author/
   subject and HEAD/branch refs.
2. A merge commit carries ≥ 2 parents; the client graph (pure
   `layoutGitGraph`) renders a right branch that merges back into the first
   parent's lane.
3. `log` at a cwd outside any repo resolves `vcs: { kind: 'none' }` with no
   throw; a missing `git` binary does the same.
4. A broken repo (`.git` unreadable) resolves `vcs: { kind: 'error' }` with
   a message and a successful result.
5. A `.git` file (gitlink) resolving outside the session fence is treated as
   `vcs: { kind: 'none' }` — the Host never runs git against an out-of-fence
   worktree.
6. An aborted signal kills the git child promptly and rejects (no leaked child).
7. `truncated` is true exactly when the bound cut the history.
8. The client plugin, with this namespace present, renders the commit graph and
   metadata — with no other client change (see `git-remote.ts`).
