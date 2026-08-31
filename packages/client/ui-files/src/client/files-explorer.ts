/**
 * Pure helpers for the live directories-and-files explorer: canonical
 * per-level ordering, ancestor expansion, a human-readable byte size, and
 * VCS (git) status presentation.
 * @module @deepseek-ai/dsh-client-ui-files/client
 */
import type { VcsFileStatus, WorkspaceFilesEntry } from './files-remote.ts'

/**
 * Canonical per-level order: directories before files, each alphabetical
 * (case-sensitive). Mirrors the Host sort promised by HOST_PRIMITIVES.md so a
 * client that re-sorts a level never disagrees with the wire order.
 * @param entries - one level's children, any order.
 * @returns the children in canonical order.
 */
export function sortEntries(entries: readonly WorkspaceFilesEntry[]): WorkspaceFilesEntry[] {
  return [...entries].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'dir' ? -1 : 1
    return left.name < right.name ? -1 : left.name > right.name ? 1 : 0
  })
}

/**
 * Every ancestor directory path of an absolute path, outermost first
 * (`/a/b/c.ts` -> `['/a', '/a/b']`). Used to auto-expand the tree to a target.
 * @param path - an absolute path.
 * @returns the ancestor directory paths.
 */
export function ancestorPaths(path: string): string[] {
  const out: string[] = []
  const segments = path.split('/')
  let accumulated = ''
  for (let i = 1; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (segment === '' || segment === '.') continue
    accumulated = accumulated === '' ? '/' + segment : accumulated + '/' + segment
    out.push(accumulated)
  }
  return out
}

/**
 * Human-readable byte size (`1023` -> `1023 B`, `1536` -> `1.5 KB`).
 * @param size - byte count.
 * @returns the compact label.
 */
export function formatSize(size: number): string {
  if (size < 1024) return size + ' B'
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = size
  let unit = -1
  do {
    value /= 1024
    unit += 1
  } while (value >= 1024 && unit < units.length - 1)
  const digits = value >= 100 ? 0 : 1
  return value.toFixed(digits) + ' ' + units[unit]
}

/** One-character marker shown for each VCS status (git's own short letters). */
export const VCS_MARKERS: Readonly<Record<VcsFileStatus, string>> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  ignored: 'I',
  conflicted: '!',
}

/**
 * Presentation color per VCS status. The tracked-change states use the fixed
 * GitHub/VSCode palette; the two "not tracked" states (untracked and ignored)
 * use the theme's secondary text color so they read as muted gray in BOTH
 * light and dark themes, matching the directory dirty dot's `--dsh-text-secondary`.
 */
export const VCS_COLORS: Readonly<Record<VcsFileStatus, string>> = {
  modified: '#d29922',
  added: '#3fb950',
  deleted: '#f85149',
  renamed: '#bc8cff',
  untracked: 'var(--dsh-text-secondary, #8b949e)',
  ignored: 'var(--dsh-text-secondary, #8b949e)',
  conflicted: '#f85149',
}

/**
 * The one-character marker for a VCS status.
 * @param status - the notable status.
 * @returns the marker letter ('' for an unknown status).
 */
export function vcsMarker(status: VcsFileStatus): string {
  return VCS_MARKERS[status] ?? ''
}
