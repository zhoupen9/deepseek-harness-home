/**
 * Browser Session-metrics plugin: a pure consumer with no service. It moves
 * the chat statistics out of the bottom-of-chat strip and the context meter
 * out of the composer, into the left edge of the Session Header's
 * right-aligned utilities row.
 *
 * Two slot registrations plus one injected stylesheet, all removed on plugin
 * unload:
 * - `conversation.session.header.utilities` (id `session-metrics`,
 *   order -11): the compact capsule. -11 puts it left of the shipped
 *   `open-in-app` split button (order -10) and of the order-0
 *   `session-log-download` capsule, i.e. it swaps with the open-in-app
 *   button to become the row's leftmost entry.
 * - `conversation.composer.dock` (id `stats`, priority -1): shadows the
 *   cell of ui-chat's shipped StatsLine (same id at priority 0 — the slot
 *   ledger only clashes same-id entries at equal priority, and the lowest
 *   priority renders), replacing the bottom-of-chat metrics strip with an
 *   empty occupant. Disabling or removing this plugin restores the shipped
 *   strip automatically.
 * - a stylesheet hiding ui-conversation's shipped composer context meter.
 *   The composer renders that meter directly, so it owns no slot cell to
 *   shadow by id and priority; the header capsule now carries its reading.
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
import { SessionMetricsSuppressed, SessionMetricsTrigger } from './SessionMetrics.tsx'
import { en, NS, zh } from './locales.ts'
import { DEFAULT_PERFORMANCE_USAGE, type PerformanceUsageMode } from './session-metrics.ts'

/** Required services: the slot ledger, the locale face, and the configuration forms. */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Hides the shipped composer context meter. It is named by the static facts
 * its markup exposes — a `span` whose direct child is the meter button,
 * whose own direct child is the 14px progress ring — because it carries no
 * stable class, id, or data attribute of its own. Both ring spellings are
 * listed: an SVG attribute name is matched case-sensitively by a CSS
 * selector, while the `width`/`height` pair is not.
 */
const HIDE_COMPOSER_CONTEXT_METER = [
  "span:has(> button[aria-haspopup='dialog'] > svg[viewBox='0 0 14 14'] > circle)",
  "span:has(> button[aria-haspopup='dialog'] > svg[width='14'][height='14'] > circle)",
].join(',\n') + ' { display: none !important; }'

/**
 * Inject the composer-meter suppression stylesheet into the page.
 * @returns disposer removing the stylesheet when the plugin unloads.
 */
function hideComposerContextMeter(): () => void {
  const style = document.createElement('style')
  style.dataset.sessionMetrics = 'composer-context-meter'
  style.textContent = HIDE_COMPOSER_CONTEXT_METER
  document.head.append(style)
  return () => { style.remove() }
}

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
 * Client plugin body: register the header capsule, shadow the shipped stats
 * strip, and hide the shipped composer context meter. Every effect is removed
 * on plugin unload, which restores the shipped surfaces.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-session-metrics: dictionaries')
  ctx.effect(hideComposerContextMeter, 'ui-session-metrics: composer context meter')
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
