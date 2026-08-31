/**
 * Files view builder: folds the Files-owned mutation and read facts into the
 * published per-session snapshot (tree + per-file best-known content),
 * preserving stable references across transactions.
 * @module @deepseek-ai/dsh-client-ui-files/client
 */
import type {
  ConversationTimelineSnapshot, ConversationViewBuilder, ConversationViewDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  EMPTY_FILES_SNAPSHOT,
  type FilesConversationViewNode,
  type FilesFile,
  type FilesMutation,
  type FilesRead,
  type FilesSnapshot,
} from './files-contract.ts'
import { reconstructFile, reconstructReadFile } from './files-reconstruct.ts'
import { projectTree } from './files-tree.ts'

/** Aggregate per-path facts into the published snapshot. */
export class FilesSnapshotBuilder implements ConversationViewBuilder<FilesConversationViewNode, FilesSnapshot> {
  private readonly mutations = new Map<string, FilesMutation>()
  private readonly reads = new Map<string, FilesRead>()
  readonly empty = EMPTY_FILES_SNAPSHOT

  replace(input: {
    readonly nodes: readonly FilesConversationViewNode[]
    readonly timeline: ConversationTimelineSnapshot
  }): FilesSnapshot {
    this.mutations.clear()
    this.reads.clear()
    for (const node of input.nodes) this.adopt(node)
    return this.snapshot()
  }

  apply(input: {
    readonly upserts: readonly FilesConversationViewNode[]
    readonly timeline: ConversationTimelineSnapshot
  }): FilesSnapshot {
    for (const node of input.upserts) this.adopt(node)
    return this.snapshot()
  }

  private adopt(node: FilesConversationViewNode): void {
    if (node.data.kind === 'mutation') this.mutations.set(node.key, node.data.mutation)
    else this.reads.set(node.key, node.data.read)
  }

  private snapshot(): FilesSnapshot {
    const paths = new Set<string>()
    const mutationsByPath = new Map<string, FilesMutation[]>()
    for (const mutation of this.mutations.values()) {
      paths.add(mutation.path)
      const list = mutationsByPath.get(mutation.path)
      if (list === undefined) mutationsByPath.set(mutation.path, [mutation])
      else list.push(mutation)
    }
    const readsByPath = new Map<string, FilesRead[]>()
    for (const read of this.reads.values()) {
      paths.add(read.path)
      const list = readsByPath.get(read.path)
      if (list === undefined) readsByPath.set(read.path, [read])
      else list.push(read)
    }
    const files = new Map<string, FilesFile>()
    for (const path of paths) {
      const mutations = mutationsByPath.get(path)
      if (mutations !== undefined) {
        files.set(path, reconstructFile(path, mutations))
      } else {
        const reads = readsByPath.get(path)
        const file = reads === undefined ? null : reconstructReadFile(path, reads)
        if (file !== null) files.set(path, file)
      }
    }
    return { roots: projectTree(paths), files }
  }
}

/** Files target factory preserving the explorer view model. */
export const filesViewDefinition: ConversationViewDefinition<FilesConversationViewNode, FilesSnapshot> = {
  target: 'files',
  create: () => new FilesSnapshotBuilder(),
}

/**
 * Register the Files target builder.
 * @param ctx - Plugin context receiving the view Definition.
 */
export function registerFilesConversationView(
  ctx: import('@deepseek-ai/cordis').Context,
): void {
  ctx.uiConversation.views.register(filesViewDefinition)
}
