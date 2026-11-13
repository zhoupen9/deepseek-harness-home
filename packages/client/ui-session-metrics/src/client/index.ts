/**
 * Browser Session-metrics plugin: a pure consumer with no service. It adds a
 * chat-statistics capsule to the left edge of the Session Header's
 * right-aligned utilities row, presenting the detailed reading set (token
 * counts and the context ring) and a merged details panel.
 *
 * One slot registration, removed on plugin unload:
 * - `conversation.session.header.utilities` (id `session-metrics`,
 *   order -11): the compact capsule. -11 puts it left of the shipped
 *   `open-in-app` split button (order -10) and of the order-0
 *   `session-log-download` capsule, i.e. it swaps with the open-in-app
 *   button to become the row's leftmost entry.
 *
 * The capsule is additive and unconditional. It reads no preference and owns
 * no shadow cell: ui-chat's bottom-of-chat stats pills and ui-conversation's
 * composer context meter stay exactly as their own composition renders them.
 * The capsule always presents the detailed reading set and always opens its
 * merged panel, independent of the Chat target's `performanceUsage` setting.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale) and the slot
// declarations the register call below targets.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { SessionMetricsTrigger } from './SessionMetrics.tsx'
import { en, NS, zh } from './locales.ts'

/** Required services: the slot ledger and the locale face. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the header capsule and install the
 * dictionaries. Both are removed on plugin unload.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-session-metrics: dictionaries')
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'session-metrics',
    // Leftmost of the row: below the shipped open-in-app split button
    // (order -10), so the capsule takes the left-edge slot that button
    // previously held; session-log-download stays rightmost at order 0.
    order: -11,
    locale: NS,
  }, SessionMetricsTrigger))
}
