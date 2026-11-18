/** Durable background preferences and image-source classification. */

/** Loader-entry id that owns the settings namespace; must match the bundle row id. */
export const BACKGROUND_SETTINGS_NAMESPACE = 'ui-background'

/** Settings field carrying the master switch. */
export const BACKGROUND_ENABLED_FIELD = 'enabled'
/** Settings field carrying the image source. */
export const BACKGROUND_IMAGE_FIELD = 'image'
/** Settings field carrying the shared opacity both palettes fall back to. */
export const BACKGROUND_OPACITY_FIELD = 'opacity'
/** Settings field carrying the light-palette opacity. */
export const BACKGROUND_OPACITY_LIGHT_FIELD = 'opacityLight'
/** Settings field carrying the dark-palette opacity. */
export const BACKGROUND_OPACITY_DARK_FIELD = 'opacityDark'

/** Body attribute that paints the background layers. */
export const BACKGROUND_ATTRIBUTE = 'data-dsh-background'
/** Body variable carrying the resolved CSS `url(...)` value. */
export const BACKGROUND_IMAGE_VARIABLE = '--dsh-background-image'
/** Body variable carrying the light-palette layer opacity. */
export const BACKGROUND_OPACITY_LIGHT_VARIABLE = '--dsh-background-opacity-light'
/** Body variable carrying the dark-palette layer opacity. */
export const BACKGROUND_OPACITY_DARK_VARIABLE = '--dsh-background-opacity-dark'

/** Plugin identity used for the injected style tag and the theme override layer. */
export const BACKGROUND_PLUGIN_ID = '@zar-desktop/ui-background'

/** Palette modes a layer strength is stored for. */
export type PaletteMode = 'light' | 'dark'

/** Browser-side view of the durable setting. */
export interface BackgroundSettings {
  /** Whether the configured image is painted. */
  readonly enabled: boolean
  /** Image source: an http(s) URL, a data image URI, an absolute file path, or '' for none. */
  readonly image: string
  /** Shared layer opacity; a palette uses it until it carries its own. */
  readonly opacity: number
  /** Light-palette layer opacity; absent follows {@link BackgroundSettings.opacity}. */
  readonly opacityLight?: number
  /** Dark-palette layer opacity; absent follows {@link BackgroundSettings.opacity}. */
  readonly opacityDark?: number
}

/** Values the namespace resolves to when the user has not overridden anything. */
export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = Object.freeze({
  enabled: false,
  image: '',
  opacity: 0.5,
})

/** Settings field carrying one palette's layer opacity. */
export function opacityField(mode: PaletteMode): string {
  return mode === 'light' ? BACKGROUND_OPACITY_LIGHT_FIELD : BACKGROUND_OPACITY_DARK_FIELD
}

/** Body variable carrying one palette's layer opacity. */
export function opacityVariable(mode: PaletteMode): string {
  return mode === 'light' ? BACKGROUND_OPACITY_LIGHT_VARIABLE : BACKGROUND_OPACITY_DARK_VARIABLE
}

const DATA_IMAGE = /^data:image\/[a-z0-9.+-]+[;,]/i
const WINDOWS_ABSOLUTE = /^[A-Za-z]:[/\\]/
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/

/** Whether a value is an http(s) URL with a host. */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== ''
  } catch {
    return false
  }
}

/** Whether a value is an absolute local path the browser file route can serve. */
function isLocalPath(value: string): boolean {
  return (value.startsWith('/') || WINDOWS_ABSOLUTE.test(value))
    && !value.startsWith('//') && !value.startsWith('\\\\')
    && !CONTROL_CHARACTER.test(value)
}

/**
 * Whether a value names a paint-able background image. The empty string means
 * no image and stays a valid write for a cleared field.
 * @param value - image source from the settings field.
 * @returns true for '', an http(s) URL, a data image URI, or an absolute local path.
 */
export function isBackgroundImage(value: string): boolean {
  const candidate = value.trim()
  if (candidate === '') return true
  return isHttpUrl(candidate) || DATA_IMAGE.test(candidate) || isLocalPath(candidate)
}

/**
 * Resolve one stored image source into a CSS `url()` argument.
 * @param value - image source from the settings field.
 * @param base - document base URI, `http(s)://…` or `dsh-app://app/`.
 * @returns the URL to paint, or undefined for an empty or unsupported source.
 */
export function backgroundImageUrl(value: string, base: string): string | undefined {
  const candidate = value.trim()
  if (candidate === '') return undefined
  if (isHttpUrl(candidate) || DATA_IMAGE.test(candidate)) return candidate
  if (!isLocalPath(candidate)) return undefined
  if (!/^https?:/i.test(base) && !base.startsWith('dsh-app://app/')) return undefined
  return new URL(`api/file?path=${encodeURIComponent(candidate)}`, base).href
}

/**
 * Clamp a stored opacity into the supported range.
 * @param value - opacity from the settings field.
 * @returns a finite number from 0 through 1.
 */
export function clampOpacity(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_BACKGROUND_SETTINGS.opacity
}

/**
 * Resolve the layer opacity for one palette: its own value, else the shared one.
 * @param settings - accepted values from the `ui-background` namespace.
 * @param mode - palette the document is using.
 * @returns a finite opacity from 0 through 1.
 */
export function paletteOpacity(settings: BackgroundSettings, mode: PaletteMode): number {
  const own = mode === 'light' ? settings.opacityLight : settings.opacityDark
  return clampOpacity(own ?? settings.opacity)
}

/**
 * Render an opacity as a whole percentage.
 * @param value - opacity from 0 through 1.
 * @returns the rounded percentage from 0 through 100.
 */
export function opacityPercent(value: number): number {
  return Math.round(clampOpacity(value) * 100)
}
