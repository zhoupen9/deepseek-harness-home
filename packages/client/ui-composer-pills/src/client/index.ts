/**
 * Browser half of the composer-pill switch: one Settings → General row and the
 * suppression it controls. The host row owns the `ui-composer-pills` namespace
 * (`hideBuiltinPills`); this half adopts the accepted value through the
 * configuration-form service and, while it is on, hides the builtin pills that
 * ui-chat registers into `conversation.composer.dock` plus the context meter
 * ui-conversation renders beside that slot.
 *
 * The pills are hidden by shadowing their cell ids at a lower priority (the
 * slot ledger keeps same-id entries at distinct priorities and the lowest one
 * renders), not by patching shipped code. Every resource is released the moment
 * the setting flips back or the plugin unloads, so restoring is exact.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import suppressionCss from './composer-pills.css?inline'
import { ComposerPillsRow, type ComposerPillsRowInjected } from './ComposerPillsRow.tsx'
import { en, NS, zh } from './locales.ts'
import {
  BUILTIN_DOCK_CELLS, COMPOSER_DOCK_SLOT, COMPOSER_PILLS_HIDDEN_FIELD, COMPOSER_PILLS_PLUGIN_ID,
  COMPOSER_PILLS_ROW_ID, COMPOSER_PILLS_SETTINGS_NAMESPACE, type ComposerPillsSettings,
} from './settings.ts'
import { createComposerPillsRowStore } from './store.ts'

/** Required services: slots and locale for the row, configForms for the setting. */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Occupant that replaces one builtin pill: this plugin registers it under the
 * shipped cell id at priority -1, so the cell renders nothing.
 * @returns null, always.
 */
export function SuppressedPill(): null {
  return null
}

/** Mount the sheet that hides the context meter and the emptied strip. */
function installSuppressionStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = COMPOSER_PILLS_PLUGIN_ID
  tag.dataset.pluginCss = `${COMPOSER_PILLS_PLUGIN_ID}/composer-pills.css`
  tag.textContent = suppressionCss
  document.head.append(tag)
  return () => { tag.remove() }
}

/**
 * Client plugin body: adopt the durable setting, hide the builtin pills while
 * it is on, and register the General row that writes it.
 * @param ctx - client plugin context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-composer-pills: dictionaries')
  const form = ctx.configForms.get<ComposerPillsSettings>(COMPOSER_PILLS_SETTINGS_NAMESPACE)
  const store = createComposerPillsRowStore()
  let bound: BoundActions<typeof store> | undefined
  /** Resources owned while the hiding is on; empty while it is off. */
  let owned: Array<() => void> = []
  const release = (): void => {
    for (const dispose of owned.splice(0).reverse()) dispose()
  }
  // Unload releases whatever the last accepted value installed.
  ctx.effect(() => release, 'ui-composer-pills: owned suppressions')

  /**
   * Install or remove the suppression for one accepted value.
   * @param hidden - whether the builtin pills should be hidden.
   */
  const suppress = (hidden: boolean): void => {
    release()
    if (!hidden) return
    for (const cell of BUILTIN_DOCK_CELLS) {
      owned.push(ctx.slots.inject(COMPOSER_DOCK_SLOT, () => ctx.slots.register({
        name: COMPOSER_DOCK_SLOT,
        id: cell,
        // Below the shipped entry's default priority 0: the null occupant renders.
        priority: -1,
      }, SuppressedPill)))
    }
    owned.push(installSuppressionStyles())
  }

  /** Mirror the accepted value into the row store; safe to call while the row assembles. */
  const syncRow = (): void => {
    const snapshot = form.getSnapshot()
    if (snapshot.value !== undefined) bound?.sync(snapshot.value, snapshot.revision ?? 0)
  }
  /**
   * Apply one accepted value: hide or restore the pills, then mirror it to the
   * row. Never called from a slot `inject` — registering the suppression while
   * another slot assembles would mutate the ledger mid-render.
   */
  const adopt = (): void => {
    const snapshot = form.getSnapshot()
    const settings = snapshot.value
    if (settings === undefined) return
    suppress(settings.hideBuiltinPills)
    syncRow()
  }
  ctx.effect(() => form.subscribe(adopt), 'ui-composer-pills: settings adoption')
  adopt()

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: COMPOSER_PILLS_ROW_ID,
    // Right after the background row (order 12) and before the transcript row.
    order: 13,
    store,
    locale: NS,
    inject: (actions: BoundActions<typeof store>): ComposerPillsRowInjected => {
      bound = actions
      syncRow()
      return {
        setHidden: (hidden) => { void form.set(COMPOSER_PILLS_HIDDEN_FIELD, hidden) },
      }
    },
  }, ComposerPillsRow))
}
