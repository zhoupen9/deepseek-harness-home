/**
 * Browser half of the palette plugin: one Settings → General row and the theme
 * override layer it controls. The host row owns the `ui-palette` namespace (six
 * surface and accent colors per mode); this half adopts the accepted values
 * through the configuration-form service and applies them with the theme
 * service's override layer, which yields the page background and sidebar fill
 * to a painted background image while handing that image layer the palette base.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { PaletteRow, type PaletteRowInjected } from './PaletteRow.tsx'
import { en, NS, zh } from './locales.ts'
import { PalettePresenter } from './presenter.ts'
import { PALETTE_SETTINGS_NAMESPACE, type PaletteSettings } from './settings.ts'
import { createPaletteRowStore } from './store.ts'

/** Required services: slots and locale for the row, configForms for the settings, theme for the override layer. */
export const inject = ['slots', 'locale', 'configForms', 'theme']

/**
 * Client plugin body: adopt the durable setting, apply the override layer, and
 * register the General row that writes the fields.
 * @param ctx - client plugin context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-palette: dictionaries')
  const form = ctx.configForms.get<PaletteSettings>(PALETTE_SETTINGS_NAMESPACE)
  const presenter = new PalettePresenter(ctx)
  ctx.effect(() => () => { presenter.dispose() }, 'ui-palette: palette presenter')
  const store = createPaletteRowStore()
  let bound: BoundActions<typeof store> | undefined
  const adopt = (): void => {
    const snapshot = form.getSnapshot()
    const settings = snapshot.value
    if (settings === undefined) return
    presenter.apply(settings)
    bound?.sync(settings, snapshot.revision ?? 0)
  }
  ctx.effect(() => form.subscribe(adopt), 'ui-palette: settings adoption')
  adopt()
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'palette',
    order: 11.7,
    store,
    locale: NS,
    inject: (actions: BoundActions<typeof store>): PaletteRowInjected => {
      bound = actions
      adopt()
      return { setColor: (field, value) => { void form.set(field, value) } }
    },
  }, PaletteRow))
}
