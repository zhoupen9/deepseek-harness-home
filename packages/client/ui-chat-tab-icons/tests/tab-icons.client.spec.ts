/**
 * Behavior spec for the chat-tab-icons predicates: which view ids get an icon,
 * and which rendered tab row counts as the session view strip.
 *
 * Runs standalone with vitest; this spec imports only the pure module, so the
 * client half's baseline value imports (react, react-dom, ui-primitives) never
 * enter the test process.
 */
import { describe, expect, it } from 'vitest'
import { hasTabIcon, isSessionTabRow, TAB_ICON_IDS } from '../src/client/tab-icons.ts'

describe('hasTabIcon', () => {
  it('decorates every shipped view id', () => {
    for (const id of TAB_ICON_IDS) expect(hasTabIcon(id)).toBe(true)
  })

  it('leaves an unknown or absent view id plain', () => {
    expect(hasTabIcon('memory')).toBe(false)
    expect(hasTabIcon('')).toBe(false)
    expect(hasTabIcon(undefined)).toBe(false)
  })
})

describe('isSessionTabRow', () => {
  it('accepts the strip when it carries one tab per view entry', () => {
    expect(isSessionTabRow(2, 2)).toBe(true)
    expect(isSessionTabRow(5, 5)).toBe(true)
  })

  it('rejects a single-tab row and any count mismatch', () => {
    expect(isSessionTabRow(1, 1)).toBe(false)
    expect(isSessionTabRow(0, 5)).toBe(false)
    expect(isSessionTabRow(4, 5)).toBe(false)
    expect(isSessionTabRow(5, 4)).toBe(false)
  })
})
