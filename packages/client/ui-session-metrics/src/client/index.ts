/**
 * Browser Session-metrics plugin: a pure consumer with no service. It adds a
 * chat-statistics capsule to the left edge of the Session Header's
 * right-aligned utilities row, mirroring the figures that the Chat target's
 * accepted `performanceUsage` level presents elsewhere.
 *
 * One slot registration, removed on plugin unload:
 * - `conversation.session.header.utilities` (id `session-metrics`,
 *   order -11): the compact capsule. -11 puts it left of the shipped
 *   `open-in-app` split button (order -10) and of the order-0
 *   `session-log-download` capsule, i.e. it swaps with the open-in-app
 *   button to become the row's leftmost entry.
 *
 * The capsule is additive. ui-chat's bottom-of-chat stats pills and
 * ui-conversation's composer context meter are left untouched, because the
 * Chat target's `performanceUsage` preference already decides whether they
 * render (they show for `compact` and `detailed`, and disappear for `hidden`);
 * shadowing their cells or hiding them with an injected stylesheet overrode
 * that decision at every level. The one thing the capsule takes from the same
 * preference is its own visibility, so `hidden` hides it too.
 */
import type { Context } from '@deepseek-ai/cordis'
import { createSnapshotStore, type ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
// Type-only: pulls the locale plugin's Context merge (ctx.locale), the
// configuration-form service merge (ctx.configForms), and the slot
// declarations the register calls below target.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { SessionMetricsTrigger } from './SessionMetrics.tsx'
import { en, NS, zh } from './locales.ts'
import { DEFAULT_PERFORMANCE_USAGE, type PerformanceUsageMode } from './session-metrics.ts'

/** Required services: the slot ledger, the locale face, and the configuration forms. */
export const inject = ['slots', 'locale', 'configForms']

/** Namespace owning the Chat target's durable settings section. */
const CHAT_SETTINGS_NAMESPACE = 'ui-chat'

/** The one Chat settings field this plugin reads. */
interface ChatDetailSettings {
  /** Accepted performance-and-usage detail level; absent before the first acceptance. */
  readonly performanceUsage?: PerformanceUsageMode | undefined
}

/**
 * Mirror the accepted performance-and-usage detail level, so the capsule can
 * present the readings the shipped composer strip presents for that level. The
 * Settings row stays the only writer; this source never writes.
 * @param ctx - client root context holding the configuration-form service.
 * @returns live source of the accepted detail level.
 */
function performanceUsageSource(ctx: Context): ObservableSnapshot<PerformanceUsageMode> {
  const mode = createSnapshotStore<PerformanceUsageMode>(DEFAULT_PERFORMANCE_USAGE)
  const form = ctx.configForms.get<ChatDetailSettings>(CHAT_SETTINGS_NAMESPACE)
  ctx.effect(() => {
    const adopt = (): void => {
      const accepted = form.getSnapshot().value?.performanceUsage
      if (accepted !== undefined) mode.set(accepted)
    }
    const unsubscribe = form.subscribe(adopt)
    adopt()
    return unsubscribe
  }, 'ui-session-metrics: performance-usage level')
  return mode
}

/**
 * Client plugin body: register the header capsule and install the
 * dictionaries. Both are removed on plugin unload.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-session-metrics: dictionaries')
  const performanceUsage = performanceUsageSource(ctx)
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'session-metrics',
    // Leftmost of the row: below the shipped open-in-app split button
    // (order -10), so the capsule takes the left-edge slot that button
    // previously held; session-log-download stays rightmost at order 0.
    order: -11,
    locale: NS,
    // Registrant-private reactive fact: the level whose readings the capsule
    // mirrors, delivered as the component's usePerformanceUsage seat.
    inject: () => ({ hooks: { performanceUsage } }),
  }, SessionMetricsTrigger))
}
