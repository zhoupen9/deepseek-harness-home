/**
 * Behavior spec for the live explorer's pure helpers: canonical ordering,
 * ancestor expansion, and byte-size formatting. Runs standalone with vitest
 * (all @deepseek-ai imports are type-only and erased at runtime).
 */
import { describe, expect, it } from 'vitest'
import { ancestorPaths, formatSize, sortEntries, VCS_COLORS, VCS_MARKERS, vcsMarker } from '../src/client/files-explorer.ts'
import type { VcsFileStatus, WorkspaceFilesEntry } from '../src/client/files-remote.ts'

function entry(name: string, kind: 'dir' | 'file', hidden = false): WorkspaceFilesEntry {
  return { name, path: '/' + name, kind, hidden }
}

describe('sortEntries', () => {
  it('orders directories before files, each alphabetical', () => {
    const sorted = sortEntries([
      entry('z.txt', 'file'),
      entry('a', 'dir'),
      entry('m', 'dir'),
      entry('b.txt', 'file'),
    ])
    expect(sorted.map(entry => entry.name)).toEqual(['a', 'm', 'b.txt', 'z.txt'])
  })

  it('does not mutate the input array', () => {
    const input = [entry('b', 'dir'), entry('a', 'dir')]
    sortEntries(input)
    expect(input.map(entry => entry.name)).toEqual(['b', 'a'])
  })
})

describe('ancestorPaths', () => {
  it('returns outermost-first ancestor directories of an absolute path', () => {
    expect(ancestorPaths('/a/b/c.ts')).toEqual(['/a', '/a/b'])
  })

  it('returns no ancestors for a top-level file', () => {
    expect(ancestorPaths('/a.ts')).toEqual([])
  })
})

describe('formatSize', () => {
  it('formats bytes, KB, and MB', () => {
    expect(formatSize(1023)).toBe('1023 B')
    expect(formatSize(1536)).toBe('1.5 KB')
    expect(formatSize(1048576)).toBe('1.0 MB')
  })
})

describe('VCS markers', () => {
  const statuses: readonly VcsFileStatus[] = ['modified', 'added', 'deleted', 'renamed', 'untracked', 'ignored', 'conflicted']

  it('covers every VcsFileStatus with a marker and a color', () => {
    for (const status of statuses) {
      expect(VCS_MARKERS[status].length).toBeGreaterThan(0)
      // Colors may be hex or a theme CSS variable (the gray states).
      expect(VCS_COLORS[status].length).toBeGreaterThan(0)
    }
  })

  it('uses git short letters for the common statuses', () => {
    expect(vcsMarker('modified')).toBe('M')
    expect(vcsMarker('added')).toBe('A')
    expect(vcsMarker('deleted')).toBe('D')
    expect(vcsMarker('untracked')).toBe('U')
    expect(vcsMarker('ignored')).toBe('I')
  })

  it('renders untracked and ignored as theme-gray, distinct from added green', () => {
    expect(VCS_COLORS.untracked).toBe(VCS_COLORS.ignored)
    expect(VCS_COLORS.untracked).toContain('dsh-text-secondary')
    expect(VCS_COLORS.untracked).not.toBe(VCS_COLORS.added)
  })

  it('colors conflicts and deletions red', () => {
    expect(VCS_COLORS.conflicted).toBe(VCS_COLORS.deleted)
  })
})
