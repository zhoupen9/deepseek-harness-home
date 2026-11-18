/**
 * Pure behavior of the palette setting: which stored colors are accepted, how
 * a token override layer is built for each mode, how the image layer's base is
 * resolved, and how a stored color becomes a swatch value.
 */
import { describe, expect, it } from 'vitest'
import {
  colorInput, hoverShade, isPaletteColor, PALETTE_ENTRIES, paletteBase, paletteField, paletteOverrides,
  shippedColor, swatchHex, DEFAULT_PALETTE_SETTINGS,
} from '../src/client/settings.ts'

const entry = (id: string) => PALETTE_ENTRIES.find(candidate => candidate.id === id)!

describe('isPaletteColor', () => {
  it('accepts the empty value and solid CSS colors', () => {
    for (const value of ['', '#abc', '#aabbcc', 'rgb(1,2,3)', 'rgb(1 2 3)', 'hsl(10, 20%, 30%)', 'hsl(10 20% 30%)']) {
      expect(isPaletteColor(value), value).toBe(true)
    }
  })

  it('rejects alpha forms, named colors, and non-strings', () => {
    for (const value of ['rgba(0,0,0,0.5)', '#aabbccdd', 'transparent', 'red', 'rgb(1,2)', 12, null]) {
      expect(isPaletteColor(value), String(value)).toBe(false)
    }
  })
})

describe('paletteOverrides', () => {
  it('emits nothing while every entry follows the shipped palette', () => {
    expect(paletteOverrides(DEFAULT_PALETTE_SETTINGS, false)).toEqual({})
    expect(paletteOverrides(DEFAULT_PALETTE_SETTINGS, true)).toEqual({})
  })

  it('pins the mode without a value to that entry\'s shipped color', () => {
    const tokens = paletteOverrides({ ...DEFAULT_PALETTE_SETTINGS, backgroundLight: '#101010' }, false)
    expect(tokens).toEqual({ '--dsw-alias-bg-base': { light: '#101010', dark: '#151517' } })
  })

  it('keeps both modes when both carry values', () => {
    const tokens = paletteOverrides({
      ...DEFAULT_PALETTE_SETTINGS, backgroundLight: '#101010', backgroundDark: '#202020',
      accentLight: '#ff0000', accentDark: '#00ff00',
    }, false)
    expect(tokens['--dsw-alias-bg-base']).toEqual({ light: '#101010', dark: '#202020' })
    expect(tokens['--dsw-alias-brand-primary']).toEqual({ light: '#ff0000', dark: '#00ff00' })
  })

  it('yields the page background and sidebar to a painted background image', () => {
    const settings = {
      ...DEFAULT_PALETTE_SETTINGS,
      backgroundLight: '#101010', backgroundDark: '#202020',
      sidebarLight: '#303030', sidebarDark: '#404040',
      surfaceLight: '#505050', surfaceDark: '#606060',
    }
    const tokens = paletteOverrides(settings, true)
    expect(Object.keys(tokens).sort()).toEqual(['--dsw-alias-bg-layer-1'])
    expect(paletteOverrides(settings, false)['--dsw-specific-sidebar-fill'])
      .toEqual({ light: '#303030', dark: '#404040' })
  })

  it('omits an entry explicitly set back to its shipped colors', () => {
    const background = entry('background')
    const tokens = paletteOverrides({
      ...DEFAULT_PALETTE_SETTINGS,
      backgroundLight: shippedColor(background, 'light'),
      backgroundDark: shippedColor(background, 'dark'),
    }, false)
    expect(tokens).toEqual({})
  })

  it('covers every editable entry with a distinct token', () => {
    const tokens = new Set(PALETTE_ENTRIES.map(candidate => candidate.token))
    expect(tokens.size).toBe(PALETTE_ENTRIES.length)
  })

  it('derives the hover alias of a surface from its picked color', () => {
    const tokens = paletteOverrides({ ...DEFAULT_PALETTE_SETTINGS, cardLight: '#303030' }, false)
    expect(tokens['--dsw-alias-card-fill']).toEqual({ light: '#303030', dark: '#212123' })
    expect(tokens['--dsw-alias-card-fill-hover']).toEqual({
      light: hoverShade('#303030'),
      dark: hoverShade('#212123'),
    })
  })
})

describe('paletteBase', () => {
  it('stays undefined while the page background is unset', () => {
    expect(paletteBase(DEFAULT_PALETTE_SETTINGS)).toBeUndefined()
  })

  it('resolves each mode, falling back to the shipped color for the unset one', () => {
    expect(paletteBase({ ...DEFAULT_PALETTE_SETTINGS, backgroundLight: '#101010' }))
      .toEqual({ light: '#101010', dark: '#151517' })
    expect(paletteBase({ ...DEFAULT_PALETTE_SETTINGS, backgroundDark: '#202020' }))
      .toEqual({ light: '#ffffff', dark: '#202020' })
  })
})

describe('swatchHex', () => {
  it('expands hex and converts rgb() into the input format', () => {
    expect(swatchHex('#ABC', '#000000')).toBe('#aabbcc')
    expect(swatchHex('#112233', '#000000')).toBe('#112233')
    expect(swatchHex('rgb(252,253,254)', '#000000')).toBe('#fcfdfe')
    expect(swatchHex('rgb(1 2 3)', '#000000')).toBe('#010203')
  })

  it('shows the shipped color for forms the input cannot express', () => {
    expect(swatchHex('', '#abcdef')).toBe('#abcdef')
    expect(swatchHex('hsl(10, 20%, 30%)', '#abcdef')).toBe('#abcdef')
    expect(swatchHex('rgb(300,0,0)', '#abcdef')).toBe('#abcdef')
  })
})

describe('hoverShade', () => {
  it('shifts toward the palette text color', () => {
    expect(hoverShade('#fafafa')).toBe('color-mix(in srgb, #fafafa 92%, var(--dsw-alias-label-primary))')
  })
})

describe('colorInput', () => {
  it('clears on empty, stores a trimmed valid color, rejects anything else', () => {
    expect(colorInput('   ')).toEqual({ kind: 'clear' })
    expect(colorInput(' #d97757 ')).toEqual({ kind: 'set', value: '#d97757' })
    expect(colorInput('rgb(1,2,3)')).toEqual({ kind: 'set', value: 'rgb(1,2,3)' })
    expect(colorInput('d97757')).toEqual({ kind: 'invalid' })
    expect(colorInput('rgba(0,0,0,0.4)')).toEqual({ kind: 'invalid' })
  })
})

describe('paletteField', () => {
  it('names one field per entry and mode', () => {
    expect(paletteField('background', 'light')).toBe('backgroundLight')
    expect(paletteField('border', 'dark')).toBe('borderDark')
  })
})
