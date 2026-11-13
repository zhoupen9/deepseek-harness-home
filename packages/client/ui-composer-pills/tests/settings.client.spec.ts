/** Identity constants the suppression depends on. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  BUILTIN_DOCK_CELLS, COMPOSER_DOCK_SLOT, COMPOSER_PILLS_HIDDEN_FIELD, COMPOSER_PILLS_ROW_ID,
  COMPOSER_PILLS_SETTINGS_NAMESPACE, DEFAULT_COMPOSER_PILLS_SETTINGS,
} from '../src/client/settings.ts'

describe('composer-pill settings identity', () => {
  it('names the same row that owns the namespace', () => {
    // The loader entry id and the settings namespace must agree, or the form
    // resolves a namespace nothing serves.
    const bundle = readFileSync(new URL('../../../bundles/zar-desktop/cordis.patch.yml', import.meta.url), 'utf8')
    expect(bundle).toContain(`id: ${COMPOSER_PILLS_SETTINGS_NAMESPACE}`)
    expect(bundle).toContain(`name: '@zar-desktop/ui-composer-pills'`)
    expect(COMPOSER_PILLS_ROW_ID).not.toBe(COMPOSER_PILLS_SETTINGS_NAMESPACE)
  })

  it('targets the two builtin dock cells of the composer dock', () => {
    expect(COMPOSER_DOCK_SLOT).toBe('conversation.composer.dock')
    expect([...BUILTIN_DOCK_CELLS]).toEqual(['activity', 'usage'])
    expect(COMPOSER_PILLS_HIDDEN_FIELD).toBe('hideBuiltinPills')
  })

  it('defaults to showing the builtin pills', () => {
    expect(DEFAULT_COMPOSER_PILLS_SETTINGS.hideBuiltinPills).toBe(false)
    expect(Object.isFrozen(DEFAULT_COMPOSER_PILLS_SETTINGS)).toBe(true)
  })
})
