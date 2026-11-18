/** Palette fields shared by the host schema and the browser scope. */

/** Loader-entry id that owns the settings namespace; must match the bundle row id. */
export const PALETTE_SETTINGS_NAMESPACE = 'ui-palette'

/** Palette mode a color is stored for. */
export type PaletteMode = 'light' | 'dark'

/** Entry ids in row order. */
export type PaletteEntryId =
  | 'background' | 'surface' | 'menu' | 'sidebar' | 'input' | 'card' | 'dialog'
  | 'nav' | 'module' | 'bubble' | 'accent' | 'border'

/** Field names of the palette section: `<entry><Light|Dark>`. */
export type PaletteField =
  | 'backgroundLight' | 'backgroundDark'
  | 'surfaceLight' | 'surfaceDark'
  | 'menuLight' | 'menuDark'
  | 'sidebarLight' | 'sidebarDark'
  | 'inputLight' | 'inputDark'
  | 'cardLight' | 'cardDark'
  | 'dialogLight' | 'dialogDark'
  | 'navLight' | 'navDark'
  | 'moduleLight' | 'moduleDark'
  | 'bubbleLight' | 'bubbleDark'
  | 'accentLight' | 'accentDark'
  | 'borderLight' | 'borderDark'

/** Stored color per field; `''` keeps the shipped palette value. */
export type PaletteSettings = Readonly<Record<PaletteField, string>>

/** Every field in schema order. */
export const PALETTE_FIELDS: readonly PaletteField[] = Object.freeze([
  'backgroundLight', 'backgroundDark',
  'surfaceLight', 'surfaceDark',
  'menuLight', 'menuDark',
  'sidebarLight', 'sidebarDark',
  'inputLight', 'inputDark',
  'cardLight', 'cardDark',
  'dialogLight', 'dialogDark',
  'navLight', 'navDark',
  'moduleLight', 'moduleDark',
  'bubbleLight', 'bubbleDark',
  'accentLight', 'accentDark',
  'borderLight', 'borderDark',
])

/** Resolved setting before any override: every entry follows the shipped palette. */
export const DEFAULT_PALETTE_SETTINGS: PaletteSettings = Object.freeze({
  backgroundLight: '', backgroundDark: '',
  surfaceLight: '', surfaceDark: '',
  menuLight: '', menuDark: '',
  sidebarLight: '', sidebarDark: '',
  inputLight: '', inputDark: '',
  cardLight: '', cardDark: '',
  dialogLight: '', dialogDark: '',
  navLight: '', navDark: '',
  moduleLight: '', moduleDark: '',
  bubbleLight: '', bubbleDark: '',
  accentLight: '', accentDark: '',
  borderLight: '', borderDark: '',
})

/** Settings field carrying one entry's color in one mode. */
export function paletteField(id: PaletteEntryId, mode: PaletteMode): PaletteField {
  return mode === 'light' ? `${id}Light` : `${id}Dark`
}

/**
 * Anchored matcher for one persistable palette color: the empty string (no
 * override) or a solid CSS color — #rgb/#rrggbb hex, or rgb()/hsl() in the
 * comma or space-separated form. Alpha forms are rejected: the swatch cannot
 * produce them, and a translucent surface composites against whatever is
 * behind it, which the palette layer cannot reason about.
 */
export const PALETTE_COLOR_PATTERN = new RegExp(
  [
    '^(?:|#(?:[0-9a-f]{3}){1,2}',
    '|rgb\\(\\s*-?\\d+(?:\\.\\d+)?%?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%?\\s*\\)',
    '|hsl\\(\\s*-?\\d+(?:\\.\\d+)?(?:deg|grad|rad|turn)?\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%\\s*[ ,]\\s*-?\\d+(?:\\.\\d+)?%\\s*\\)',
    ')$',
  ].join(''),
  'i',
)

/**
 * Whether a value is a persistable palette color: `''` (no override) or a
 * solid CSS color accepted by the host schema.
 * @param value - value crossing the settings or registry boundary.
 * @returns whether the value can be stored for an entry.
 */
export function isPaletteColor(value: unknown): value is string {
  return typeof value === 'string' && PALETTE_COLOR_PATTERN.test(value)
}
