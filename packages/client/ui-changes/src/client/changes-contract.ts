/**
 * Changes view contract: per-file cumulative file-change records derived from
 * the shared Session window, plus the target-neutral snapshot the conversation
 * shell publishes for the `changes` view target. Unlike the per-turn Edits
 * records, each file carries its NET difference (original state at first
 * in-window mutation vs. current state), reconstructed from the applied hunks.
 * @module @deepseek-ai/dsh-client-ui-changes/client
 */
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  ConversationLocation, ConversationViewNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'

/**
 * One applied file mutation, projected by the Changes Definition from one
 * settled edit/write result (or a write-create's call args). Mutations are the
 * input to the per-file net reconstruction.
 */
export interface ChangeMutation {
  /** Engine-owned Context key (stable, callId-scoped). */
  readonly key: string
  /** Tool-call identity pairing the result with its call. */
  readonly callId: string
  /** Tool that produced the mutation; null when the call head is outside the loaded window. */
  readonly tool: 'edit' | 'write' | null
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

/** One file's cumulative net difference across the loaded window. */
export interface ChangesFile {
  /** Model-facing file path. */
  readonly path: string
  /** `created`: the file did not exist before the first in-window mutation. */
  readonly status: 'created' | 'modified'
  /** Original content of every touched region (empty when created). */
  readonly before: string
  /** Current content of every touched region (the reconstructed file state). */
  readonly after: string
  /** Seq of the last mutation that touched this file. */
  readonly lastSeq: number
  /** Unix epoch ms of the last mutation. */
  readonly lastTime: number
  /** Turn of the last mutation. */
  readonly lastTurn: number
  /**
   * True when at least one hunk could not be anchored into the reconstructed
   * document and was appended as a standalone region (regions then appear in
   * mutation order rather than exact file order).
   */
  readonly degraded: boolean
}

/** Target-neutral snapshot published for the `changes` view target. */
export interface ChangesSnapshot {
  /** Files with a net difference, most recently changed first. */
  readonly files: readonly ChangesFile[]
}

/** Stable empty snapshot used before a Session has assembled Changes records. */
export const EMPTY_CHANGES_SNAPSHOT: ChangesSnapshot = { files: [] }

/** One contribution node owned by the `changes` view target. */
export interface ChangesConversationViewNode extends ConversationViewNode {
  readonly target: 'changes'
  readonly anchorSeq: number
  readonly location: ConversationLocation
  readonly data: { readonly kind: 'change'; readonly mutation: ChangeMutation }
}

/** Selector hook over the current Conversation binding's Changes target. */
export type UseChanges = SnapshotSelectorHook<ChangesSnapshot>

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationViewSnapshotMap {
    /** Independently assembled data consumed by the Changes view. */
    changes: ChangesSnapshot
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SessionStandardProps {
    /** Selector hook over the current Conversation binding's Changes target. */
    useChanges: UseChanges
  }
}
