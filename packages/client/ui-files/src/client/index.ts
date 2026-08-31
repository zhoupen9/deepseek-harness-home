/**
 * Browser Files plugin: the workspace explorer (Files tab) and the prose
 * file-mention provider — all pure-consumer, no service. When the host workspaceFiles remote is present the tab renders a
 * live directories-and-files explorer; otherwise it falls back to the
 * session-known reconstruction (files the session wrote, edited, or read).
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client'
import { createSnapshotStore, type ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the 'conversation.view' SlotMap row and the chatFileMentions
// service merge must be in the program for the register calls to type.
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { FilesView, type FilesViewInjected } from './FilesView.tsx'
import { createFilesMentions } from './files-mentions.ts'
import { registerFilesDefinition } from './files-definition.ts'
import { registerFilesConversationView } from './files-snapshot-builder.ts'
import { resolveWorkspaceFilesRemote, type WorkspaceFilesRemote } from './files-remote.ts'
import {
  EMPTY_FILES_SNAPSHOT,
  type FileOpenRequest,
  type FilesSnapshot,
} from './files-contract.ts'
import { en, NS, zh } from './locales.ts'

/** Required services: the conversation slot, registries, Session paging, locale, and the workspaceFiles Remote namespace. */
export const inject = ['slots', 'sessions', 'uiSession', 'uiConversation', 'locale', 'remote', 'remote.workspaceFiles']

/**
 * Client plugin body: register the Files tab and the mention provider. All registrations ride the slot service's effect wrapper, so
 * plugin unload removes them.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const filesSources = new WeakMap<SessionBinding, ObservableSnapshot<FilesSnapshot>>()
  const filesSource = (binding: SessionBinding): ObservableSnapshot<FilesSnapshot> => {
    let source = filesSources.get(binding)
    if (source === undefined) {
      const target = ctx.uiConversation.binding(binding).target('files')
      source = {
        getSnapshot: () => target.getSnapshot() ?? EMPTY_FILES_SNAPSHOT,
        subscribe: listener => target.subscribe(listener),
      }
      filesSources.set(binding, source)
    }
    return source
  }
  const filesOf = (sessionId: SessionId): ObservableSnapshot<FilesSnapshot> | undefined => {
    const binding = ctx.sessions.binding(sessionId)
    return binding === undefined ? undefined : filesSource(binding)
  }
  // The host workspace-files remote, resolved once; undefined until the host
  // implements HOST_PRIMITIVES.md. The live explorer only mounts when present.
  const workspaceFiles: WorkspaceFilesRemote | undefined = resolveWorkspaceFilesRemote(ctx)
  // The session's workspace root (its cwd), resolved from the Session summary.
  const workspaceRoot = (sessionId: SessionId): string | undefined =>
    ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
  // The root-scoped queue: chat file-link clicks land here; the Files tab
  // (and its live explorer) consumes them to reveal the file.
  const openRequests = createSnapshotStore<FileOpenRequest | null>(null)
  let openNonce = 0
  const priorMentions = ctx.get('chatFileMentions')
  ctx.provide('chatFileMentions', createFilesMentions({
    prior: priorMentions,
    queue: openRequests,
    currentSessionId: () => ctx.sessions.list.getSnapshot().current,
    filesOf,
    nextNonce: () => { openNonce += 1; return openNonce },
  }))
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-files: dictionaries')
  // Registration-time text (the view tab label) reads through the bound
  // translate as a thunk, so it follows the active locale without
  // re-registration.
  const t = ctx.locale.bind(NS)
  registerFilesConversationView(ctx)
  registerFilesDefinition(ctx)
  ctx.uiSession.provide({
    hooks: ['files'],
    resolve: binding => ({ hooks: { files: filesSource(binding) } }),
  })
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'files',
    order: 22,
    locale: NS,
    label: () => t('view.files'),
    children: {},
    inject: (sessionId: SessionId): FilesViewInjected => {
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) {
        throw new Error('ui-files: session "' + sessionId + '" is unavailable')
      }
      const target = ctx.uiConversation.binding(sessionId).target('files')
      return {
        loadOlder: async () => {
          const before = target.getSnapshot()
          await session.loadOlder()
          return target.getSnapshot() !== before
        },
        openRequests,
        workspaceFiles,
        workspaceRoot,
      }
    },
  }, FilesView))
}
