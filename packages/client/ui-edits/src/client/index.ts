/**
 * Browser Edits plugin contributing one entry to the conversation view slot
 * without defining a service.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the 'conversation.view' SlotMap row (declared by the slot's
// owning package) must be in the program for the register calls to type.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { EditsView, type EditsViewInjected } from './EditsView.tsx'
import { registerEditsDefinition } from './edits-definition.ts'
import { registerEditsConversationView } from './edits-snapshot-builder.ts'
import { EMPTY_EDITS_SNAPSHOT, type EditsSnapshot } from './edits-contract.ts'
import { en, NS, zh } from './locales.ts'

/** Required services: the conversation slot, registries, ordinary Session paging, and the locale service. */
export const inject = ['slots', 'sessions', 'uiSession', 'uiConversation', 'locale']

/**
 * Client plugin body: register the Edits view tab. The registration rides the
 * slot service's effect wrapper, so plugin unload removes the tab.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const editsSources = new WeakMap<SessionBinding, ObservableSnapshot<EditsSnapshot>>()
  const editsSource = (binding: SessionBinding): ObservableSnapshot<EditsSnapshot> => {
    let source = editsSources.get(binding)
    if (source === undefined) {
      const target = ctx.uiConversation.binding(binding).target('edits')
      source = {
        getSnapshot: () => target.getSnapshot() ?? EMPTY_EDITS_SNAPSHOT,
        subscribe: listener => target.subscribe(listener),
      }
      editsSources.set(binding, source)
    }
    return source
  }
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-edits: dictionaries')
  // Registration-time text (the view tab label) reads through the bound
  // translate as a thunk, so it follows the active locale without
  // re-registration.
  const t = ctx.locale.bind(NS)
  registerEditsConversationView(ctx)
  registerEditsDefinition(ctx)
  ctx.uiSession.provide({
    hooks: ['edits'],
    resolve: binding => ({ hooks: { edits: editsSource(binding) } }),
  })
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'edits',
    order: 20,
    locale: NS,
    label: () => t('view.edits'),
    children: {},
    inject: (sessionId: SessionId): EditsViewInjected => {
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) {
        throw new Error(`ui-edits: session "${sessionId}" is unavailable`)
      }
      const target = ctx.uiConversation.binding(sessionId).target('edits')
      return {
        loadOlder: async () => {
          const before = target.getSnapshot()
          await session.loadOlder()
          return target.getSnapshot() !== before
        },
      }
    },
  }, EditsView))
}
