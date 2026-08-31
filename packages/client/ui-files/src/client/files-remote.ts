/**
 * Client contract for the host "workspace files" primitives: one-level
 * directory listing (directories AND files) and bounded file reads, with
 * per-entry VCS (git) status annotation. This is the client mirror of
 * HOST_PRIMITIVES.md; the host side must expose a `ctx.remote.workspaceFiles`
 * namespace with these two verbs. Until that namespace exists,
 * `resolveWorkspaceFilesRemote` returns undefined and the Files view falls
 * back to its session-known reconstruction.
 * @module @deepseek-ai/dsh-client-ui-files/client
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** VCS status of one file, collapsed index+worktree (v1: one icon per file). */
export type VcsFileStatus =
  | 'modified' | 'added' | 'deleted'
  | 'renamed' | 'untracked' | 'ignored' | 'conflicted'

/** Repo context of a listing. */
export type VcsContext =
  | { readonly kind: 'none' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'git'; readonly root: string; readonly worktree: string }

/** One listed child: a directory or a file. */
export interface WorkspaceFilesEntry {
  /** Base name shown in a tree row. */
  readonly name: string
  /** Absolute host path — clients never join segments themselves. */
  readonly path: string
  /** `dir`: expandable directory; `file`: selectable leaf. */
  readonly kind: 'dir' | 'file'
  /** Hidden by the host platform's convention (dot-prefix on POSIX). */
  readonly hidden: boolean
  /** Byte size; present only for files the host could stat. */
  readonly size?: number
  /** Last-modified epoch ms; present only for files the host could stat. */
  readonly modifiedAt?: number
  /** Notable VCS status; present for files under a git repo (clean = absent), and for directories that are entirely git-ignored. */
  readonly vcs?: VcsFileStatus
  /** Present (true) for directories with a differing descendant (ignored-only excluded). */
  readonly vcsDirty?: boolean
}

/** One directory level plus its ancestry, as the host reports it. */
export interface WorkspaceFilesListing {
  /** Absolute path of the listed directory. */
  readonly path: string
  /** The host account's home directory (breadcrumb rooting). */
  readonly home: string
  /** Ancestor chain from the filesystem root to the listed directory. */
  readonly crumbs: readonly WorkspaceFilesEntry[]
  /** Direct children: directories first, then files, each alphabetical. */
  readonly entries: readonly WorkspaceFilesEntry[]
  /** True when the backend cut entries at its complete-result bound. */
  readonly truncated: boolean
  /** Repo context; `git` enables the per-entry `vcs`/`vcsDirty` fields. */
  readonly vcs: VcsContext
}

/** Bounded read of one text file. */
export interface WorkspaceFilesContent {
  /** Absolute path that was read. */
  readonly path: string
  /** Byte size the host observed. */
  readonly size: number
  /** True when the file is not valid UTF-8 text (content is empty). */
  readonly binary: boolean
  /** True when the content was cut at the host read bound. */
  readonly truncated: boolean
  /** Decoded text; empty when binary. */
  readonly content: string
  /** Number of content lines; 0 when binary. */
  readonly totalLines: number
}

/** The two host primitives this explorer drives (agent-scoped: each call names its session). */
export interface WorkspaceFilesRemote {
  /** List one directory level (directories and files) for a session's workspace. */
  list(sessionId: SessionId, path: string, signal?: AbortSignal): Promise<WorkspaceFilesListing>
  /** Read one file's bounded text content for a session's workspace. */
  read(sessionId: SessionId, path: string, signal?: AbortSignal): Promise<WorkspaceFilesContent>
}

/** Wire shape: each verb resolves to a standard ClientResult. */
type RemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly message: string } }

/** The `ctx.remote.workspaceFiles` namespace as the generated client exposes it (agentId first). */
interface WorkspaceFilesNamespace {
  list(sessionId: SessionId, path: string | undefined, signal?: AbortSignal): Promise<RemoteResult<WorkspaceFilesListing>>
  read(sessionId: SessionId, path: string, signal?: AbortSignal): Promise<RemoteResult<WorkspaceFilesContent>>
}

/**
 * Resolve the host workspace-files remote, or undefined when the host has not
 * implemented it yet (see HOST_PRIMITIVES.md). The Files view falls back to
 * the session-known reconstruction whenever this returns undefined.
 * @param ctx - client root context carrying the `remote` service.
 * @returns the typed remote, or undefined when the namespace is absent.
 */
export function resolveWorkspaceFilesRemote(ctx: Context): WorkspaceFilesRemote | undefined {
  // The `remote.workspaceFiles` sub-service is injected (see index.ts), so it is
  // mounted before this runs; ctx.get reads the injected namespace directly.
  const namespace = ctx.get('remote.workspaceFiles') as WorkspaceFilesNamespace | undefined
  if (namespace === undefined) return undefined
  return {
    async list(sessionId, path, signal) {
      const result = await namespace.list(sessionId, path, signal)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    async read(sessionId, path, signal) {
      const result = await namespace.read(sessionId, path, signal)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
  }
}
