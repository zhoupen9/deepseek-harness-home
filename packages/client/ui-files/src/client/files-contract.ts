/**
 * Files view contract: session-known files (paths and their best available
 * content) derived from the shared Session window, plus the target-neutral
 * snapshot the conversation shell publishes for the `files` view target.
 * Unlike the per-turn Edits records and the cumulative Changes net
 * differences, this view is an explorer: a directory tree of every path the
 * session's tool calls referenced, with a file's current content
 * reconstructed from applied mutations (or the last read window when the file
 * was only ever read).
 * @module @deepseek-ai/dsh-client-ui-files/client
 */
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  ConversationLocation, ConversationViewNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** One applied file mutation (a settled edit/write result or a write-create). */
export interface FilesMutation {
  /** Engine-owned Context key (stable, callId-scoped). */
  readonly key: string
  /** Tool-call identity pairing the result with its call. */
  readonly callId: string
  /** Tool that produced the mutation; null when the call head is outside the loaded window. */
  readonly tool: 'edit' | 'write' | 'str_replace_editor' | null
  /** Seq of the `tool/result` event that landed the change. */
  readonly seq: number
  /** Unix epoch ms of the `tool/result` event. */
  readonly time: number
  /** Turn that performed the change. */
  readonly turn: number
  /** Step inside the turn. */
  readonly step: number
  /** Model-facing file path the mutation applies to. */
  readonly path: string
  /** `hunks`: applied contextual-diff hunks; `create`: whole-file content (write create). */
  readonly kind: 'hunks' | 'create'
  /** Applied hunks in file order; present when kind is `hunks`. */
  readonly hunks?: readonly DiffHunk[]
  /** Full new-file content; present when kind is `create`. */
  readonly content?: string
}

/** One file-content observation from a `read` tool result (persisted meta). */
export interface FilesRead {
  /** Engine-owned Context key (stable, callId-scoped). */
  readonly key: string
  /** Tool-call identity pairing the result with its call. */
  readonly callId: string
  /** Seq of the `tool/result` event that landed the read. */
  readonly seq: number
  /** Unix epoch ms of the `tool/result` event. */
  readonly time: number
  /** Turn that performed the read. */
  readonly turn: number
  /** Step inside the turn. */
  readonly step: number
  /** Model-facing file path the read window belongs to. */
  readonly path: string
  /** 1-based first line the window returned. */
  readonly offset: number
  /** The returned window's lines, each keeping its file line number. */
  readonly lines: readonly { readonly number: number; readonly text: string }[]
  /** Exact total line count in the file. */
  readonly totalLines: number
}

/** One file's best-known state in the loaded window. */
export interface FilesFile {
  /** Model-facing file path. */
  readonly path: string
  /** `created`/`modified`: current content reconstructed from mutations; `read`: only read windows known. */
  readonly status: 'created' | 'modified' | 'read'
  /** Best available current content (see module doc). */
  readonly content: string
  /** Exact total line count when fully known (reconstructed or a full read). */
  readonly totalLines: number
  /** True when content is only partial: touched regions that could not anchor, or a read window past offset 1. */
  readonly partial: boolean
  /** Seq of the last mutation or read that touched this file. */
  readonly lastSeq: number
  /** Unix epoch ms of the last mutation or read. */
  readonly lastTime: number
}

/** One node of the session-known file tree. */
export interface FileTreeNode {
  /** Basename of this entry. */
  readonly name: string
  /** Full model-facing path. */
  readonly path: string
  /** `dir`: expandable directory; `file`: leaf (selectable). */
  readonly kind: 'dir' | 'file'
  /** Directory children (directories first, then files, each alphabetical); absent for files. */
  readonly children?: readonly FileTreeNode[]
}

/** Target-neutral snapshot published for the `files` view target. */
export interface FilesSnapshot {
  /** Top-level tree entries under the workspace root. */
  readonly roots: readonly FileTreeNode[]
  /** Files with known content, keyed by path. */
  readonly files: ReadonlyMap<string, FilesFile>
}

/** Stable empty snapshot used before a Session has assembled Files records. */
export const EMPTY_FILES_SNAPSHOT: FilesSnapshot = { roots: [], files: new Map() }

/** One contribution node owned by the `files` view target. */
export interface FilesConversationViewNode extends ConversationViewNode {
  readonly target: 'files'
  readonly anchorSeq: number
  readonly location: ConversationLocation
  readonly data: { readonly kind: 'mutation'; readonly mutation: FilesMutation }
    | { readonly kind: 'read'; readonly read: FilesRead }
}

/** One file-open request: a chat file-link click addressed to the Files surfaces. */
export interface FileOpenRequest {
  /** Monotonic identity so a repeated request for the same path still re-opens. */
  readonly nonce: number
  /** Session whose Files snapshot holds the file. */
  readonly sessionId: import('@deepseek-ai/dsh-session/types').SessionId
  /** Model-facing path to open. */
  readonly path: string
}

/** Selector hook over the current Conversation binding's Files target. */
export type UseFiles = SnapshotSelectorHook<FilesSnapshot>

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationViewSnapshotMap {
    /** Independently assembled data consumed by the Files view. */
    files: FilesSnapshot
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SessionStandardProps {
    /** Selector hook over the current Conversation binding's Files target. */
    useFiles: UseFiles
  }
}
