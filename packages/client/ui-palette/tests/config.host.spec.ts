/** The host schema that gives the palette plugin its settings namespace. */
import { describe, expect, it } from 'vitest'
import { Config } from '../src/index.ts'
import { DEFAULT_PALETTE_SETTINGS } from '../src/palette-settings.ts'

describe('ui-palette host Config', () => {
  it('resolves the client fallback for every field', () => {
    const config = Config({})
    for (const [field, value] of Object.entries(DEFAULT_PALETTE_SETTINGS)) {
      expect(config[field as keyof typeof config].get(), field).toBe(value)
    }
  })

  it('accepts and preserves each color', () => {
    const config = Config({ backgroundLight: '#101010', borderDark: 'rgb(1,2,3)' })
    expect(config.backgroundLight.get()).toBe('#101010')
    expect(config.borderDark.get()).toBe('rgb(1,2,3)')
    expect(config.surfaceLight.get()).toBe('')
  })

  it('rejects alpha forms, named colors and malformed values', () => {
    for (const value of ['rgba(0,0,0,0.5)', '#aabbccdd', 'red', 'not a color']) {
      expect(() => Config({ accentLight: value }), value).toThrow()
    }
  })
})
