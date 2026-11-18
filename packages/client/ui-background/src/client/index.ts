/**
 * Browser half of the background-image plugin: one Settings → General row and
 * the document layers it controls. The host row owns the `ui-background`
 * namespace (enabled · image · opacity · opacityLight · opacityDark); this half
 * adopts the accepted values through the configuration-form service, paints
 * the image behind the app surfaces, and clears the base surfaces with the
 * theme service's override layer. Local file paths reach the page through the
 * authenticated `/api/file` route, which already serves absolute paths to the
 * owner page.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import backgroundCss from './background.css?inline'
import { BackgroundRow, type BackgroundRowInjected } from './BackgroundRow.tsx'
import { en, NS, zh } from './locales.ts'
import { BackgroundPresenter } from './presenter.ts'
import {
  BACKGROUND_ENABLED_FIELD, BACKGROUND_IMAGE_FIELD, BACKGROUND_PLUGIN_ID, BACKGROUND_SETTINGS_NAMESPACE,
  clampOpacity, opacityField, type BackgroundSettings, type PaletteMode,
} from './settings.ts'
import { createBackgroundRowStore } from './store.ts'

/** Required services: slots and locale for the row, configForms for the settings, theme for the surface override. */
export const inject = ['slots', 'locale', 'configForms', 'theme']

/** Mount the row's global sheet; it owns only the `body` layers. */
function installStyles(ctx: Context): void {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = BACKGROUND_PLUGIN_ID
    tag.dataset.pluginCss = `${BACKGROUND_PLUGIN_ID}/background.css`
    tag.textContent = backgroundCss
    document.head.append(tag)
    return () => { tag.remove() }
  }, 'ui-background: layer stylesheet')
}

/**
 * Client plugin body: adopt the durable setting, paint the layers, and
 * register the General row that writes the fields.
 * @param ctx - client plugin context.
 */
export function apply(ctx: Context): void {
  installStyles(ctx)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-background: dictionaries')
  const form = ctx.configForms.get<BackgroundSettings>(BACKGROUND_SETTINGS_NAMESPACE)
  const presenter = new BackgroundPresenter(ctx)
  ctx.effect(() => () => { presenter.dispose() }, 'ui-background: background presenter')
  const store = createBackgroundRowStore()
  let bound: BoundActions<typeof store> | undefined
  const adopt = (): void => {
    const snapshot = form.getSnapshot()
    const settings = snapshot.value
    if (settings === undefined) return
    presenter.apply(settings)
    bound?.sync(settings, snapshot.revision ?? 0)
  }
  ctx.effect(() => form.subscribe(adopt), 'ui-background: settings adoption')
  adopt()
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'background',
    order: 12,
    store,
    locale: NS,
    inject: (actions: BoundActions<typeof store>): BackgroundRowInjected => {
      bound = actions
      adopt()
      return {
        setEnabled: (enabled) => { void form.set(BACKGROUND_ENABLED_FIELD, enabled) },
        setImage: (image) => { void form.set(BACKGROUND_IMAGE_FIELD, image) },
        setOpacity: (mode: PaletteMode, opacity: number) => { void form.set(opacityField(mode), clampOpacity(opacity)) },
      }
    },
  }, BackgroundRow))
}
