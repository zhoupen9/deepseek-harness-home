/**
 * Browser Git plugin: the workspace repository's commit-history tree graph
 * (Git tab). Pure-consumer, no service: the tab renders whatever the host
 * `git` remote returns (see HOST_PRIMITIVES.md) and falls back to a
 * "requires host" notice until that namespace exists.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the 'conversation.view' SlotMap row (declared by the slot's
// owning package) must be in the program for the register calls to type.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: ctx.slots and the ctx.sessions merge (session controller client).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import { GitView, type GitViewInjected } from './GitView.tsx'
import { resolveGitRemote } from './git-remote.ts'
import { en, NS, zh } from './locales.ts'

/** Required services: the conversation slot, the session list, the locale service, and the Remote carrier. */
export const inject = ['slots', 'sessions', 'locale', 'remote']

/**
 * Client plugin body: register the Git view tab. The registration rides the
 * slot service's effect wrapper, so plugin unload removes the tab.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-git: dictionaries')
  // Registration-time text (the view tab label) reads through the bound
  // translate as a thunk, so it follows the active locale without
  // re-registration.
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'git',
    order: 23,
    locale: NS,
    label: () => t('view.git'),
    children: {},
    // The host git remote is resolved here, at tab mount, so the plugin never
    // parks on a not-yet-shipped controller; undefined degrades to the
    // "requires host" notice (see git-remote.ts / HOST_PRIMITIVES.md).
    inject: (sessionId: SessionId): GitViewInjected => ({
      git: resolveGitRemote(ctx),
      root: ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd,
    }),
  }, GitView))
}
