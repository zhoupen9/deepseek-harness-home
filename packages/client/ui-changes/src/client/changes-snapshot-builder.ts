/**
 * Changes view builder: folds the Changes-owned mutations into one per-file
 * net difference per path, publishing the cumulative `changes` snapshot with
 * stable references across transactions.
 * @module @deepseek-ai/dsh-client-ui-changes/client
 */
import type {
  ConversationTimelineSnapshot, ConversationViewBuilder, ConversationViewDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  EMPTY_CHANGES_SNAPSHOT, type ChangeMutation, type ChangesConversationViewNode, type ChangesFile, type ChangesSnapshot,
} from './changes-contract.ts'
import { reconstructFile } from './changes-reconstruct.ts'

/** Aggregate per-file mutations into the published net snapshot. */
export class ChangesSnapshotBuilder implements ConversationViewBuilder<ChangesConversationViewNode, ChangesSnapshot> {
  private readonly mutations = new Map<string, ChangeMutation>()
  readonly empty = EMPTY_CHANGES_SNAPSHOT

  replace(input: {
    readonly nodes: readonly ChangesConversationViewNode[]
    readonly timeline: ConversationTimelineSnapshot
  }): ChangesSnapshot {
    this.mutations.clear()
    for (const node of input.nodes) this.mutations.set(node.key, node.data.mutation)
    return this.snapshot()
  }

  apply(input: {
    readonly upserts: readonly ChangesConversationViewNode[]
    readonly timeline: ConversationTimelineSnapshot
  }): ChangesSnapshot {
    for (const node of input.upserts) this.mutations.set(node.key, node.data.mutation)
    return this.snapshot()
  }

  private snapshot(): ChangesSnapshot {
    const byPath = new Map<string, ChangeMutation[]>()
    for (const mutation of this.mutations.values()) {
      const list = byPath.get(mutation.path)
      if (list === undefined) byPath.set(mutation.path, [mutation])
      else list.push(mutation)
    }
    const files: ChangesFile[] = [...byPath.entries()]
      .map(([path, mutations]) => reconstructFile(path, mutations))
      .sort((left, right) => right.lastSeq - left.lastSeq)
    return { files }
  }
}

/** Changes target factory preserving the cumulative net-difference view model. */
export const changesViewDefinition: ConversationViewDefinition<ChangesConversationViewNode, ChangesSnapshot> = {
  target: 'changes',
  create: () => new ChangesSnapshotBuilder(),
}

/**
 * Register the Changes target builder.
 * @param ctx - Plugin context receiving the view Definition.
 */
export function registerChangesConversationView(
  ctx: import('@deepseek-ai/cordis').Context,
): void {
  ctx.uiConversation.views.register(changesViewDefinition)
}
