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
  })

  it('accepts and preserves each field', () => {
    const config = Config({ enabled: true, image: '/tmp/bg.png', opacity: 0.25 })
    expect(config.enabled.get()).toBe(true)
    expect(config.image.get()).toBe('/tmp/bg.png')
    expect(config.opacity.get()).toBe(0.25)
    expect(Config({ enabled: true, image: 'https://example.com/bg.png', opacity: 1 }).opacity.get()).toBe(1)
  })

  it('rejects an opacity outside the 0..1 range', () => {
    for (const opacity of [-0.01, 1.01]) expect(() => Config({ opacity }), String(opacity)).toThrow()
  })
})
