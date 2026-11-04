/**
 * Browser To-dos plugin: a pure consumer with no service. It moves the agent's
 * To-dos surface out of the composer stack — the card ui-conversation renders
 * above the input — into the Session header's right-aligned utilities row, as a
 * wide pill immediately left of the session-metrics capsule.
 *
 * Two slot registrations, all removed on plugin unload:
 * - conversation.session.header.utilities (id todo-pill, order -12): the pill
 *   and its list panel. -12 puts it left of the session-metrics capsule
 *   (order -11) and of the shipped open-in-app split button (order -10).
 * - conversation.input.dock (id todo, priority -1): shadows the shipped
 *   TodoDock cell (same id at the default priority 0 — same-id list cells
 *   coexist at distinct priorities and the lowest renders), so the composer
 *   card disappears while this plugin is mounted.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: the locale plugin's Context merge (ctx.locale) and the slot
// declarations the register calls below target.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { TodoPill, TodoPillSuppressed } from './TodoPill.tsx'
import { en, NS, zh } from './locales.ts'
import { DOCK_SHADOW, HEADER_ENTRY } from './registrations.ts'

/** Required services: the slot ledger and the locale face. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the header pill, shadow the shipped composer
 * card, and install this plugin's dictionaries. Every effect is removed on
 * plugin unload, which restores the shipped surface.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-todo-pill: dictionaries')
  ctx.slots.inject(HEADER_ENTRY.name, () => ctx.slots.register({
    ...HEADER_ENTRY,
    locale: NS,
  }, TodoPill))
  ctx.slots.inject(DOCK_SHADOW.name, () => ctx.slots.register({ ...DOCK_SHADOW }, TodoPillSuppressed))
}
