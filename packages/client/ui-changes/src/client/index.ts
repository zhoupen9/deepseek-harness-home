/**
 * Browser Changes plugin contributing one entry to the conversation view slot
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
import { ChangesView, type ChangesViewInjected } from './ChangesView.tsx'
import { registerChangesDefinition } from './changes-definition.ts'
import { registerChangesConversationView } from './changes-snapshot-builder.ts'
import { EMPTY_CHANGES_SNAPSHOT, type ChangesSnapshot } from './changes-contract.ts'
import { en, NS, zh } from './locales.ts'

/** Required services: the conversation slot, registries, ordinary Session paging, and the locale service. */
export const inject = ['slots', 'sessions', 'uiSession', 'uiConversation', 'locale']

/**
 * Client plugin body: register the Changes view tab. The registration rides the
 * slot service's effect wrapper, so plugin unload removes the tab.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const changesSources = new WeakMap<SessionBinding, ObservableSnapshot<ChangesSnapshot>>()
  const changesSource = (binding: SessionBinding): ObservableSnapshot<ChangesSnapshot> => {
    let source = changesSources.get(binding)
    if (source === undefined) {
      const target = ctx.uiConversation.binding(binding).target('changes')
      source = {
        getSnapshot: () => target.getSnapshot() ?? EMPTY_CHANGES_SNAPSHOT,
        subscribe: listener => target.subscribe(listener),
      }
      changesSources.set(binding, source)
    }
    return source
  }
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-changes: dictionaries')
  // Registration-time text (the view tab label) reads through the bound
  // translate as a thunk, so it follows the active locale without
  // re-registration.
  const t = ctx.locale.bind(NS)
  registerChangesConversationView(ctx)
  registerChangesDefinition(ctx)
  ctx.uiSession.provide({
    hooks: ['changes'],
    resolve: binding => ({ hooks: { changes: changesSource(binding) } }),
  })
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'changes',
    order: 21,
    locale: NS,
    label: () => t('view.changes'),
    children: {},
    inject: (sessionId: SessionId): ChangesViewInjected => {
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) {
        throw new Error(`ui-changes: session "${sessionId}" is unavailable`)
      }
      const target = ctx.uiConversation.binding(sessionId).target('changes')
      return {
        loadOlder: async () => {
          const before = target.getSnapshot()
          await session.loadOlder()
          return target.getSnapshot() !== before
        },
      }
    },
  }, ChangesView))
}
