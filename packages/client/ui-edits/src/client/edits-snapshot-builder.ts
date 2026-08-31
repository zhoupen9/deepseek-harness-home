/**
 * Edits view builder: aggregates Edits-owned contributions into the published
 * per-turn snapshot, preserving stable references across transactions.
 * @module @deepseek-ai/dsh-client-ui-edits/client
 */
import type {
  ConversationTimelineSnapshot, ConversationViewBuilder, ConversationViewDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  EMPTY_EDITS_SNAPSHOT, type EditsConversationViewNode, type EditsEntry, type EditsSnapshot, type EditsTurn,
} from './edits-contract.ts'

/** Aggregate per-turn edit records into the published snapshot. */
export class EditsSnapshotBuilder implements ConversationViewBuilder<EditsConversationViewNode, EditsSnapshot> {
  private readonly entries = new Map<string, EditsEntry>()
  readonly empty = EMPTY_EDITS_SNAPSHOT

  replace(input: {
    readonly nodes: readonly EditsConversationViewNode[]
    readonly timeline: ConversationTimelineSnapshot
  }): EditsSnapshot {
    this.entries.clear()
    for (const node of input.nodes) this.entries.set(node.key, node.data.entry)
    return this.snapshot()
  }

  apply(input: {
    readonly upserts: readonly EditsConversationViewNode[]
    readonly timeline: ConversationTimelineSnapshot
  }): EditsSnapshot {
    for (const node of input.upserts) this.entries.set(node.key, node.data.entry)
    return this.snapshot()
  }

  private snapshot(): EditsSnapshot {
    const byTurn = new Map<number, EditsEntry[]>()
    for (const entry of this.entries.values()) {
      const list = byTurn.get(entry.turn)
      if (list === undefined) byTurn.set(entry.turn, [entry])
      else list.push(entry)
    }
    const turns: EditsTurn[] = [...byTurn.entries()]
      .map(([turn, edits]) => ({ turn, edits: [...edits].sort((left, right) => left.seq - right.seq) }))
      .sort((left, right) => left.turn - right.turn)
    return { turns }
  }
}

/** Edits target factory preserving the per-turn stage-oriented view model. */
export const editsViewDefinition: ConversationViewDefinition<EditsConversationViewNode, EditsSnapshot> = {
  target: 'edits',
  create: () => new EditsSnapshotBuilder(),
}

/**
 * Register the Edits target builder.
 * @param ctx - Plugin context receiving the view Definition.
 */
export function registerEditsConversationView(
  ctx: import('@deepseek-ai/cordis').Context,
): void {
  ctx.uiConversation.views.register(editsViewDefinition)
}
