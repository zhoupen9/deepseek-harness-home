/**
 * Behavior spec for the live explorer's pure helpers: canonical ordering,
 * ancestor expansion, and byte-size formatting. Runs standalone with vitest
 * (all @deepseek-ai imports are type-only and erased at runtime).
 */
import { describe, expect, it } from 'vitest'
import { ancestorPaths, formatSize, isIgnoredEntry, resolveUnderRoot, sortEntries, VCS_COLORS, VCS_MARKERS, vcsMarker, vcsNameColor } from '../src/client/files-explorer.ts'
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

describe('resolveUnderRoot', () => {
  it('passes an already-rooted path through unchanged', () => {
    expect(resolveUnderRoot('/w', '/w/a/b.ts')).toBe('/w/a/b.ts')
  })

  it('joins a relative model-facing path to the workspace root', () => {
    expect(resolveUnderRoot('/home/u/project', 'src/client/x.ts')).toBe('/home/u/project/src/client/x.ts')
    expect(resolveUnderRoot('/home/u/project', 'a.ts')).toBe('/home/u/project/a.ts')
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

describe('isIgnoredEntry', () => {
  it('is true for files and directories the host marked ignored', () => {
    expect(isIgnoredEntry({ name: 'n', path: '/n', kind: 'file', hidden: false, vcs: 'ignored' })).toBe(true)
    expect(isIgnoredEntry({ name: 'n', path: '/n', kind: 'dir', hidden: false, vcs: 'ignored' })).toBe(true)
  })

  it('is false for other statuses and for entries without a vcs field', () => {
    expect(isIgnoredEntry({ name: 'n', path: '/n', kind: 'file', hidden: false, vcs: 'untracked' })).toBe(false)
    expect(isIgnoredEntry({ name: 'n', path: '/n', kind: 'file', hidden: false, vcs: 'modified' })).toBe(false)
    expect(isIgnoredEntry({ name: 'n', path: '/n', kind: 'dir', hidden: false, vcsDirty: true })).toBe(false)
    expect(isIgnoredEntry({ name: 'n', path: '/n', kind: 'file', hidden: false })).toBe(false)
  })
})

describe('vcsNameColor', () => {
  it('colors a file name by its own vcs status', () => {
    expect(vcsNameColor({ name: 'n', path: '/n', kind: 'file', hidden: false, vcs: 'modified' })).toBe(VCS_COLORS.modified)
    expect(vcsNameColor({ name: 'n', path: '/n', kind: 'file', hidden: false, vcs: 'deleted' })).toBe(VCS_COLORS.deleted)
    expect(vcsNameColor({ name: 'n', path: '/n', kind: 'file', hidden: false, vcs: 'untracked' })).toBe(VCS_COLORS.untracked)
    expect(vcsNameColor({ name: 'n', path: '/n', kind: 'file', hidden: false, vcs: 'added' })).toBe(VCS_COLORS.added)
  })

  it('colors a dirty directory amber (the modified color)', () => {
    expect(vcsNameColor({ name: 'n', path: '/n', kind: 'dir', hidden: false, vcsDirty: true })).toBe(VCS_COLORS.modified)
  })

  it('colors a git-ignored directory gray', () => {
    expect(vcsNameColor({ name: 'n', path: '/n', kind: 'dir', hidden: false, vcs: 'ignored' })).toBe(VCS_COLORS.ignored)
  })

  it('returns undefined for clean entries', () => {
    expect(vcsNameColor({ name: 'n', path: '/n', kind: 'file', hidden: false })).toBeUndefined()
    expect(vcsNameColor({ name: 'n', path: '/n', kind: 'dir', hidden: false })).toBeUndefined()
  })
})
