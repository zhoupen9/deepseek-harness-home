/**
 * Search-in-content match finder: every non-overlapping, case-insensitive
 * occurrence of a query across the shown (numbered) lines, in document order.
 */
import { describe, expect, it } from 'vitest'
import { findMatches } from '../src/client/files-search.ts'

describe('findMatches', () => {
  it('returns nothing for an empty query', () => {
    expect(findMatches([{ number: 1, text: 'hello' }], '')).toEqual([])
  })

  it('finds a single occurrence with the correct line and range', () => {
    const matches = findMatches([{ number: 1, text: 'say hello here' }], 'hello')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ line: 0, start: 4, end: 9, id: 0 })
  })

  it('is case-insensitive', () => {
    const matches = findMatches([{ number: 1, text: 'Foo FOO foo' }], 'foo')
    expect(matches).toHaveLength(3)
    expect(matches.map(m => m.start)).toEqual([0, 4, 8])
  })

  it('finds every occurrence across multiple lines in document order', () => {
    const lines = [
      { number: 1, text: 'a = 1' },
      { number: 2, text: 'a + a' },
      { number: 3, text: 'zzz' },
      { number: 4, text: 'aa' },
    ]
    const matches = findMatches(lines, 'a')
    expect(matches).toHaveLength(5)
    expect(matches.map(m => [m.line, m.start])).toEqual([
      [0, 0], [1, 0], [1, 4], [3, 0], [3, 1],
    ])
  })

  it('does not overlap matches and assigns sequential ids', () => {
    const matches = findMatches([{ number: 1, text: 'aaaa' }], 'aa')
    expect(matches).toHaveLength(2)
    expect(matches.map(m => [m.start, m.end, m.id])).toEqual([[0, 2, 0], [2, 4, 1]])
  })
})
