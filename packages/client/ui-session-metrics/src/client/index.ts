/**
 * Browser Session-metrics plugin: a pure consumer with no service. It moves
 * the chat statistics out of the bottom-of-chat strip into the Session
 * Header's right-aligned utilities row, left of the "Session log" download
 * capsule.
 *
 * Two registrations, both plain effects removed on plugin unload:
 * - `conversation.session.header.tabs.utilities` (id `session-metrics`,
 *   order -1): the compact capsule. -1 places it before the order-0
 *   `session-log-download` capsule, i.e. immediately to its left.
 * - `conversation.composer.dock` (id `stats`, priority -1): shadows the
 *   cell of ui-chat's shipped StatsLine (same id at priority 0 — the slot
 *   ledger only clashes same-id entries at equal priority, and the lowest
 *   priority renders), replacing the bottom-of-chat metrics strip with an
 *   empty occupant. Disabling or removing this plugin restores the shipped
 *   strip automatically.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale) and the
// slot declarations the register calls below target.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { SessionMetricsSuppressed, SessionMetricsTrigger } from './SessionMetrics.tsx'
import { en, NS, zh } from './locales.ts'

/** Required services: the slot ledger and the locale face. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the header capsule and shadow the shipped
 * stats strip. All registrations ride the slot service's effect wrapper, so
 * plugin unload removes them.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-session-metrics: dictionaries')
  ctx.slots.inject('conversation.session.header.tabs.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.tabs.utilities',
    id: 'session-metrics',
    // Left of the Session-log capsule (order 0); any order-0 entry that
    // registered earlier cannot outrank this negative order.
    order: -1,
    locale: NS,
  }, SessionMetricsTrigger))
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'stats',
    // Shadows ui-chat's StatsLine from a lower priority: same-id entries in
    // a list slot clash only at equal priority, so a distinct (lower)
    // priority replaces the shipped bottom-of-chat metrics strip — `order`
    // only sequences distinct cells and cannot shadow a same-id cell.
    priority: -1,
    locale: NS,
  }, SessionMetricsSuppressed))
}
