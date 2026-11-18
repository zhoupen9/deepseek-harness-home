/** Browser-side palette model: the editable entries, the override layer, and the image layer's base. */

export {
  DEFAULT_PALETTE_SETTINGS, isPaletteColor, PALETTE_FIELDS, PALETTE_SETTINGS_NAMESPACE,
  paletteField, type PaletteEntryId, type PaletteField, type PaletteMode, type PaletteSettings,
} from '../palette-settings.ts'
import {
  isPaletteColor, paletteField, type PaletteEntryId, type PaletteMode, type PaletteSettings,
} from '../palette-settings.ts'

/** Plugin identity used for the theme override layer. */
export const PALETTE_PLUGIN_ID = '@zar-desktop/ui-palette'

/** Locale key naming one entry. */
export type PaletteLabelKey =
  | 'color.background' | 'color.surface' | 'color.menu' | 'color.sidebar' | 'color.accent' | 'color.border'

/** One editable palette entry: the shipped token it overrides and its unset swatches. */
export interface PaletteEntry {
  /** Stable entry id; also the settings-field prefix. */
  id: PaletteEntryId
  /** Alias token the entry overrides through the theme service. */
  token: string
  /** Optional companion token derived from the picked color rather than set to it. */
  hoverToken?: string
  /** Locale key naming the entry. */
  labelKey: PaletteLabelKey
  /** Shipped light-palette color shown while the entry is unset. */
  light: string
  /** Shipped dark-palette color shown while the entry is unset. */
  dark: string
}

/** Page background; also the color the background image blends with. */
const BACKGROUND_ENTRY: PaletteEntry = Object.freeze({
  id: 'background', token: '--dsw-alias-bg-base', labelKey: 'color.background', light: '#ffffff', dark: '#151517',
})

/**
 * Editable palette entries. Unset swatches show the shipped alias values — the
 * opaque equivalents of the translucent menu and border tokens, which the
 * color input cannot express but a reset restores.
 */
export const PALETTE_ENTRIES: readonly PaletteEntry[] = Object.freeze([
  BACKGROUND_ENTRY,
  { id: 'surface', token: '--dsw-alias-bg-layer-1', labelKey: 'color.surface', light: '#ffffff', dark: '#232324' },
  { id: 'menu', token: '--dsw-specific-menu', labelKey: 'color.menu', light: '#fcfdfe', dark: '#303136' },
  { id: 'sidebar', token: '--dsw-specific-sidebar-fill', labelKey: 'color.sidebar', light: '#f9fafb', dark: '#1b1b1c' },
  { id: 'input', token: '--dsw-specific-input-major', labelKey: 'color.input', light: '#ffffff', dark: '#2c2c2e' },
  {
    id: 'card',
    token: '--dsw-alias-card-fill',
    hoverToken: '--dsw-alias-card-fill-hover',
    labelKey: 'color.card',
    light: '#fafafa',
    dark: '#212123',
  },
  { id: 'dialog', token: '--dsw-alias-bg-layer-2', labelKey: 'color.dialog', light: '#ffffff', dark: '#2c2c2e' },
  { id: 'nav', token: '--dsw-specific-sidebar-nav-item-active', labelKey: 'color.nav', light: '#ebeef2', dark: '#43454a' },
  { id: 'module', token: '--dsw-alias-bg-module-platform', labelKey: 'color.module', light: '#f5f6f7', dark: '#353638' },
  { id: 'bubble', token: '--dsw-specific-bubble', labelKey: 'color.bubble', light: '#edf3fe', dark: '#2c2c2e' },
  { id: 'accent', token: '--dsw-alias-brand-primary', labelKey: 'color.accent', light: '#0f1115', dark: '#f9fafb' },
  { id: 'border', token: '--dsw-alias-border-l2', labelKey: 'color.border', light: '#e6e6e6', dark: '#313133' },
])

/** Palette entries that yield to a painted background image, which clears these surfaces. */
const IMAGE_OWNED_ENTRIES: ReadonlySet<PaletteEntryId> = new Set<PaletteEntryId>(['background', 'sidebar'])

/** Body attribute the background-image plugin sets while it paints its image. */
export const BACKGROUND_IMAGE_ATTRIBUTE = 'data-dsh-background'

/** Body variable carrying the palette page background for the image layer's own base (light). */
export const PALETTE_BASE_LIGHT_VARIABLE = '--dsh-palette-bg-base-light'
/** Body variable carrying the palette page background for the image layer's own base (dark). */
export const PALETTE_BASE_DARK_VARIABLE = '--dsh-palette-bg-base-dark'

/** Shipped color shown for one entry and mode while it is unset. */
export function shippedColor(entry: PaletteEntry, mode: PaletteMode): string {
  return mode === 'light' ? entry.light : entry.dark
}

/** One mode pair the theme service accepts for a token. */
export interface PaletteTokenModes {
  light: string
  dark: string
}

/**
 * Build the theme override layer from the accepted setting.
 *
 * A token is included only while at least one mode differs from the shipped
 * value; the mode without one is pinned to that entry's shipped color, because
 * the theme service requires a full `{ light, dark }` pair. Entries the
 * background-image plugin clears while it paints are omitted so the image
 * stays visible.
 * @param settings - accepted values from the `ui-palette` namespace.
 * @param imagePainted - whether the background image owns the cleared surfaces.
 * @returns per-token mode pairs for `ctx.theme.overrideTokens`.
 */
export function paletteOverrides(
  settings: PaletteSettings,
  imagePainted: boolean,
): Record<string, PaletteTokenModes> {
  const tokens: Record<string, PaletteTokenModes> = {}
  for (const entry of PALETTE_ENTRIES) {
    if (imagePainted && IMAGE_OWNED_ENTRIES.has(entry.id)) continue
    const light = settings[paletteField(entry.id, 'light')] || shippedColor(entry, 'light')
    const dark = settings[paletteField(entry.id, 'dark')] || shippedColor(entry, 'dark')
    if (light === entry.light && dark === entry.dark) continue
    tokens[entry.token] = { light, dark }
    if (entry.hoverToken !== undefined) tokens[entry.hoverToken] = { light: hoverShade(light), dark: hoverShade(dark) }
  }
  return tokens
}

/**
 * Expand a stored color into the six-digit hex a native color input accepts.
 * Hand-edited rgb() values convert; other forms show the shipped color.
 * @param value - persisted color.
 * @param fallback - shipped color for the entry and mode.
 * @returns six-digit lowercase hex.
 */
export function swatchHex(value: string, fallback: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)
  if (hex?.[1] !== undefined) {
    const digits = hex[1].toLowerCase()
    return `#${digits.length === 6 ? digits : digits.replace(/([0-9a-f])/g, '$1$1')}`
  }
  const rgb = /^rgb\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)$/i.exec(value)
  if (rgb !== null) {
    const channels = [rgb[1], rgb[2], rgb[3]].map(part => Number(part))
    if (channels.every(channel => channel <= 255)) {
      return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
    }
  }
  return fallback
}

/**
 * Classify one typed color: empty clears the override, a valid solid color is
 * stored trimmed, and anything else is rejected without touching the setting.
 * @param text - field text as typed.
 * @returns the commit outcome for the row.
 */
export function colorInput(
  text: string,
): { kind: 'clear' } | { kind: 'set'; value: string } | { kind: 'invalid' } {
  const trimmed = text.trim()
  if (trimmed === '') return { kind: 'clear' }
  return isPaletteColor(trimmed) ? { kind: 'set', value: trimmed } : { kind: 'invalid' }
}

/**
 * Shift one surface color toward the current text color, the same direction the
 * shipped hover aliases take (darker over a light surface, lighter over a dark
 * one).
 * @param color - picked surface color.
 * @returns a `color-mix()` value for the matching hover token.
 */
export function hoverShade(color: string): string {
  return `color-mix(in srgb, ${color} 92%, var(--dsw-alias-label-primary))`
}

/**
 * Resolve the palette page background for the image layer's own base.
 * @param settings - accepted values from the `ui-palette` namespace.
 * @returns one color per mode, or undefined while the entry is unset.
 */
export function paletteBase(settings: PaletteSettings): PaletteTokenModes | undefined {
  const light = settings.backgroundLight
  const dark = settings.backgroundDark
  if (light === '' && dark === '') return undefined
  return { light: light || BACKGROUND_ENTRY.light, dark: dark || BACKGROUND_ENTRY.dark }
}
