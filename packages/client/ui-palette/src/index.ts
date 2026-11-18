/** Host half of the palette plugin: the `ui-palette` settings namespace. */
import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { PALETTE_COLOR_PATTERN, type PaletteField } from './palette-settings.ts'

/** Durable palette preferences projected to the browser. */
export type Config = { [K in PaletteField]: Volatile<string> }

/** One validated palette color field: '' keeps the shipped palette value. */
function colorField(): z<string> {
  return z.string().pattern(PALETTE_COLOR_PATTERN).default('')
}

/**
 * Live palette preferences. The browser half reads this namespace through the
 * configuration-form service; the host itself only owns the schema that
 * validates and persists the values.
 */
export const Config: z<Config> = z.object({
  backgroundLight: colorField().volatile(),
  backgroundDark: colorField().volatile(),
  surfaceLight: colorField().volatile(),
  surfaceDark: colorField().volatile(),
  menuLight: colorField().volatile(),
  menuDark: colorField().volatile(),
  sidebarLight: colorField().volatile(),
  sidebarDark: colorField().volatile(),
  inputLight: colorField().volatile(),
  inputDark: colorField().volatile(),
  cardLight: colorField().volatile(),
  cardDark: colorField().volatile(),
  dialogLight: colorField().volatile(),
  dialogDark: colorField().volatile(),
  navLight: colorField().volatile(),
  navDark: colorField().volatile(),
  moduleLight: colorField().volatile(),
  moduleDark: colorField().volatile(),
  bubbleLight: colorField().volatile(),
  bubbleDark: colorField().volatile(),
  accentLight: colorField().volatile(),
  accentDark: colorField().volatile(),
  borderLight: colorField().volatile(),
  borderDark: colorField().volatile(),
})

/** No host-side behavior; the client half applies the override layer and registers the settings row. */
export function apply(): void {}
