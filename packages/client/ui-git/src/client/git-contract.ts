/**
 * Git view contract: the client-safe wire vocabulary for the host `git`
 * Remote namespace (the client mirror of HOST_PRIMITIVES.md). The browser
 * cannot run git, so every commit, parent link, ref, and detail fact crosses
 * the wire from the Host; nothing here reaches a Host-only symbol.
 * @module @deepseek-ai/dsh-client-ui-git/client
 */

/** Repo context of a log/show request. */
export type GitContext =
  | { readonly kind: 'none' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'git'; readonly root: string; readonly worktree: string }

/** One ref (branch/tag/remote/HEAD) decorating a commit. */
export interface GitRef {
  /** Short display name: `main`, `HEAD`, `v1.2`, `origin/main`. */
  readonly name: string
  /** Ref kind, folded from the full ref name by the host. */
  readonly kind: 'head' | 'branch' | 'tag' | 'remote'
}

/** One commit in a log window, newest first. */
export interface GitCommit {
  /** Full 40-char object id; clients derive the short form. */
  readonly hash: string
  /** Parent object ids in order (empty for a root; length >= 2 for a merge). */
  readonly parents: readonly string[]
  readonly authorName: string
  readonly authorEmail: string
  /** Author epoch milliseconds. */
  readonly authorTime: number
  /** First line of the commit message. */
  readonly subject: string
  /** Refs pointing at this commit (empty when undecorated). */
  readonly refs: readonly GitRef[]
}

/** Bounds for a log request. */
export interface GitLogOptions {
  /** Commit bound; the host applies its own default when absent. */
  readonly maxCount?: number
  /** `true` requests all refs, not just HEAD's ancestry. */
  readonly all?: boolean
  /** `true` follows only the first-parent chain (a flat mainline). */
  readonly firstParent?: boolean
  /**
   * Include only commits with at most this many parents: `1` hides merge
   * commits, `2` hides octopus merges. Translates to git's
   * `--max-parents=<n>`; the host requires support for this option.
   */
  readonly maxParents?: 1 | 2
}

/** The host `git` namespace's `log` verb result. */
export interface GitLogResult {
  /** Repo context; commits are empty unless `kind` is `git`. */
  readonly vcs: GitContext
  /** HEAD branch short name, or `HEAD` when detached; absent outside a repo. */
  readonly currentBranch?: string
  /** HEAD commit object id; absent outside a repo or in an empty repo. */
  readonly headHash?: string
  /** Requested window, newest first. */
  readonly commits: readonly GitCommit[]
  /** True when the host cut `commits` at its bound. */
  readonly truncated: boolean
}

/** Change status of one path in a commit. */
export type GitShowFileStatus =
  | 'added' | 'deleted' | 'modified' | 'renamed' | 'copied' | 'typechanged' | 'unmerged'

/** One file changed by a commit. */
export interface GitShowFile {
  /** Model-facing path. */
  readonly path: string
  readonly status: GitShowFileStatus
  /** Original path; present for renames/copies. */
  readonly previousPath?: string
}

/** Full commit detail (the `show` verb's commit, richer than a log row). */
export interface GitShowCommit {
  readonly hash: string
  readonly parents: readonly string[]
  readonly authorName: string
  readonly authorEmail: string
  readonly authorTime: number
  readonly subject: string
  readonly refs: readonly GitRef[]
  readonly committerName: string
  readonly committerEmail: string
  readonly committerTime: number
  /** Full commit message body (subject excluded). */
  readonly body: string
}

/** The host `git` namespace's `show` verb result. */
export interface GitShowResult {
  /** Repo context; `commit`/files/diff are empty unless `kind` is `git`. */
  readonly vcs: GitContext
  /** Present when the requested hash exists in the repo. */
  readonly commit?: GitShowCommit
  /** Paths changed by the commit, in the host's order. */
  readonly files: readonly GitShowFile[]
  /** The unified diff text. */
  readonly diff: string
  /** True when the host cut `diff` at its bound. */
  readonly diffTruncated: boolean
}
