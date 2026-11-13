/** The host schema that gives the plugin its settings namespace. */
import { describe, expect, it } from 'vitest'
import { Config } from '../src/index.ts'
import { DEFAULT_COMPOSER_PILLS_SETTINGS } from '../src/client/settings.ts'

describe('ui-composer-pills host Config', () => {
  it('resolves the client fallback value', () => {
    const config = Config({})
    expect(config.hideBuiltinPills.get()).toBe(DEFAULT_COMPOSER_PILLS_SETTINGS.hideBuiltinPills)
  })

  it('accepts and preserves the switch', () => {
    expect(Config({ hideBuiltinPills: true }).hideBuiltinPills.get()).toBe(true)
    expect(Config({ hideBuiltinPills: false }).hideBuiltinPills.get()).toBe(false)
  })

  it('rejects a non-boolean value', () => {
    for (const value of ['true', 1, 0, 'yes']) {
      expect(() => Config({ hideBuiltinPills: value }), String(value)).toThrow()
    }
  })

  it('treats null as absent and keeps the default', () => {
    expect(Config({ hideBuiltinPills: null }).hideBuiltinPills.get()).toBe(false)
  })
})
