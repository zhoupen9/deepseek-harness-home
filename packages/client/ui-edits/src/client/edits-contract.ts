/**
 * Edits view contract: per-turn file-edit records derived from the shared
 * Session window, plus the target-neutral snapshot the conversation shell
 * publishes for the `edits` view target.
 * @module @deepseek-ai/dsh-client-ui-edits/client
 */
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  ConversationLocation, ConversationViewNode,
} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** One recorded file mutation (an applied edit/write result). */
export interface EditsEntry {
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
  /** Applied hunks in file order; never empty for a recorded entry. */
  readonly diffs: readonly DiffHunk[]
  /** Internal failure identity when the result reported one. */
  readonly error?: { readonly name: string; readonly code: string }
}

/** All edits recorded for one turn, in landing order. */
export interface EditsTurn {
  readonly turn: number
  readonly edits: readonly EditsEntry[]
}

/** Target-neutral snapshot published for the `edits` view target. */
export interface EditsSnapshot {
  /** Turns that performed at least one edit, ascending. */
  readonly turns: readonly EditsTurn[]
}

/** Stable empty snapshot used before a Session has assembled Edits records. */
export const EMPTY_EDITS_SNAPSHOT: EditsSnapshot = { turns: [] }

/** One contribution node owned by the `edits` view target. */
export interface EditsConversationViewNode extends ConversationViewNode {
  readonly target: 'edits'
  readonly anchorSeq: number
  readonly location: ConversationLocation
  readonly data: { readonly kind: 'edit'; readonly entry: EditsEntry }
}

/** Selector hook over the current Conversation binding's Edits target. */
export type UseEdits = SnapshotSelectorHook<EditsSnapshot>

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationViewSnapshotMap {
    /** Independently assembled data consumed by the Edits view. */
    edits: EditsSnapshot
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SessionStandardProps {
    /** Selector hook over the current Conversation binding's Edits target. */
    useEdits: UseEdits
  }
}
