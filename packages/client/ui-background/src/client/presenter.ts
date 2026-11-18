/** DOM applier for the image layer, its per-palette opacity, and the surface transparency that reveals it. */
import type { Context } from '@deepseek-ai/cordis'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import {
  BACKGROUND_ATTRIBUTE, BACKGROUND_IMAGE_VARIABLE, BACKGROUND_PLUGIN_ID, backgroundImageUrl,
  opacityVariable, paletteOpacity, type BackgroundSettings,
} from './settings.ts'

/** Surfaces cleared while the image is painted; menus and raised panels keep their own fills. */
const TRANSPARENT_SURFACES: ThemeTokenOverrides = {
  '--dsw-alias-bg-base': { light: 'transparent', dark: 'transparent' },
  '--dsw-specific-sidebar-fill': { light: 'transparent', dark: 'transparent' },
}

/** Writes the image layer, both palette opacities, and the theme override that lets them show. */
export class BackgroundPresenter {
  private override: (() => void) | undefined
  private painted = false

  /** @param ctx - owning client context; the theme override is released with the presenter. */
  constructor(private readonly ctx: Context) {}

  /**
   * Project one accepted setting onto the document. A disabled setting, an
   * empty image, or an unsupported source retracts the layer and its override.
   * @param settings - accepted values from the `ui-background` namespace.
   */
  apply(settings: BackgroundSettings): void {
    if (typeof document === 'undefined' || document.body === null) return
    const url = settings.enabled ? backgroundImageUrl(settings.image, document.baseURI) : undefined
    if (url === undefined) {
      this.retract()
      return
    }
    const body = document.body
    body.setAttribute(BACKGROUND_ATTRIBUTE, '')
    body.style.setProperty(BACKGROUND_IMAGE_VARIABLE, `url(${JSON.stringify(url)})`)
    for (const mode of ['light', 'dark'] as const) {
      body.style.setProperty(opacityVariable(mode), String(paletteOpacity(settings, mode)))
    }
    if (!this.painted) {
      this.override = this.ctx.theme.overrideTokens(BACKGROUND_PLUGIN_ID, TRANSPARENT_SURFACES)
      this.painted = true
    }
  }

  /** Retract the layer, its variables, and the theme override. */
  dispose(): void {
    this.retract()
  }

  private retract(): void {
    if (!this.painted) return
    this.painted = false
    if (typeof document !== 'undefined' && document.body !== null) {
      document.body.removeAttribute(BACKGROUND_ATTRIBUTE)
      document.body.style.removeProperty(BACKGROUND_IMAGE_VARIABLE)
      for (const mode of ['light', 'dark'] as const) document.body.style.removeProperty(opacityVariable(mode))
    }
    this.override?.()
    this.override = undefined
  }
}
