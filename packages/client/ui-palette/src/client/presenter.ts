/** DOM applier for the palette override layer and the base color the background image blends with. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import {
  BACKGROUND_IMAGE_ATTRIBUTE, PALETTE_BASE_DARK_VARIABLE, PALETTE_BASE_LIGHT_VARIABLE, PALETTE_PLUGIN_ID,
  paletteBase, paletteOverrides, type PaletteSettings,
} from './settings.ts'

/**
 * Applies the accepted palette through the theme service's override layer.
 * The background-image plugin clears the page background and the sidebar fill
 * while it paints, so those two entries yield to it, and the image layer takes
 * its base color from the palette variables this presenter writes.
 */
export class PalettePresenter {
  private release: (() => void) | undefined
  private current: PaletteSettings | undefined
  private observer: MutationObserver | undefined

  /** @param ctx - owning client context; the override layer is released with the presenter. */
  constructor(private readonly ctx: Context) {}

  /**
   * Project one accepted setting onto the document. An empty setting releases
   * the override layer and the image base variables.
   * @param settings - accepted values from the `ui-palette` namespace.
   */
  apply(settings: PaletteSettings): void {
    this.current = settings
    if (typeof document === 'undefined' || document.body === null) return
    this.observe()
    const body = document.body
    const base = paletteBase(settings)
    if (base === undefined) {
      body.style.removeProperty(PALETTE_BASE_LIGHT_VARIABLE)
      body.style.removeProperty(PALETTE_BASE_DARK_VARIABLE)
    } else {
      body.style.setProperty(PALETTE_BASE_LIGHT_VARIABLE, base.light)
      body.style.setProperty(PALETTE_BASE_DARK_VARIABLE, base.dark)
    }
    const overrides = paletteOverrides(settings, body.hasAttribute(BACKGROUND_IMAGE_ATTRIBUTE))
    if (Object.keys(overrides).length === 0) {
      this.release?.()
      this.release = undefined
      return
    }
    // Replaces this source's layer; the previous disposer would be a no-op.
    this.release = this.ctx.theme.overrideTokens(PALETTE_PLUGIN_ID, overrides)
  }

  /** Retract the override layer, the base variables, and the attribute observer. */
  dispose(): void {
    this.observer?.disconnect()
    this.observer = undefined
    this.release?.()
    this.release = undefined
    if (typeof document !== 'undefined' && document.body !== null) {
      document.body.style.removeProperty(PALETTE_BASE_LIGHT_VARIABLE)
      document.body.style.removeProperty(PALETTE_BASE_DARK_VARIABLE)
    }
    this.current = undefined
  }

  /** Re-apply when the background image takes or releases the cleared surfaces. */
  private observe(): void {
    if (this.observer !== undefined || typeof MutationObserver === 'undefined') return
    this.observer = new MutationObserver(() => {
      if (this.current !== undefined) this.apply(this.current)
    })
    this.observer.observe(document.body, { attributes: true, attributeFilter: [BACKGROUND_IMAGE_ATTRIBUTE] })
  }
}
