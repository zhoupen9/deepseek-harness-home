/** Both dictionaries cover the same row copy. */
import { describe, expect, it } from 'vitest'
import { en, NS, zh } from '../src/client/locales.ts'

describe('composer-pill row dictionaries', () => {
  it('keep the same keys in Chinese and English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
    for (const [key, value] of Object.entries(zh)) {
      expect(value.length, key).toBeGreaterThan(0)
      expect(en[key as keyof typeof en].length, key).toBeGreaterThan(0)
    }
  })

  it('owns a settings-namespaced dictionary', () => {
    expect(NS.startsWith('settings.')).toBe(true)
  })
})
