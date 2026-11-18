/** The host schema that gives the plugin its settings namespace. */
import { describe, expect, it } from 'vitest'
import { Config } from '../src/index.ts'
import { DEFAULT_BACKGROUND_SETTINGS } from '../src/client/settings.ts'

describe('ui-background host Config', () => {
  it('resolves the client fallback values', () => {
    const config = Config({})
    expect(config.enabled.get()).toBe(DEFAULT_BACKGROUND_SETTINGS.enabled)
    expect(config.image.get()).toBe(DEFAULT_BACKGROUND_SETTINGS.image)
    expect(config.opacity.get()).toBe(DEFAULT_BACKGROUND_SETTINGS.opacity)
    expect(config.opacityLight.get()).toBeUndefined()
    expect(config.opacityDark.get()).toBeUndefined()
  })

  it('accepts and preserves each field', () => {
    const config = Config({ enabled: true, image: '/tmp/bg.png', opacity: 0.25 })
    expect(config.enabled.get()).toBe(true)
    expect(config.image.get()).toBe('/tmp/bg.png')
    expect(config.opacity.get()).toBe(0.25)
    expect(Config({ enabled: true, image: 'https://example.com/bg.png', opacity: 1 }).opacity.get()).toBe(1)
  })

  it('keeps the per-palette overrides separate from the shared opacity', () => {
    const config = Config({ opacity: 0.5, opacityLight: 0.2, opacityDark: 0.9 })
    expect(config.opacity.get()).toBe(0.5)
    expect(config.opacityLight.get()).toBe(0.2)
    expect(config.opacityDark.get()).toBe(0.9)
  })

  it('rejects an opacity outside the 0..1 range', () => {
    for (const opacity of [-0.01, 1.01]) expect(() => Config({ opacity }), String(opacity)).toThrow()
  })

  it('rejects a per-palette opacity outside the 0..1 range', () => {
    for (const value of [-0.01, 1.01]) {
      expect(() => Config({ opacityLight: value }), `light ${value}`).toThrow()
      expect(() => Config({ opacityDark: value }), `dark ${value}`).toThrow()
    }
  })
})
