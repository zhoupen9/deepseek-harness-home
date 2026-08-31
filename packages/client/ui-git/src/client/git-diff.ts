/**
 * Pure presentation helper for a unified git diff: classify one diff line so
 * the details pane can color it. Git diff lines are data (kept verbatim); this
 * only derives a display kind.
 * @module @deepseek-ai/dsh-client-ui-git/client
 */

/** Display kind of one unified-diff line. */
export type DiffLineKind = 'add' | 'del' | 'hunk' | 'meta' | 'ctx'

const META_PREFIXES = [
  'diff ', 'index ', 'new file mode ', 'deleted file mode ', 'old mode ', 'new mode ',
  'similarity index ', 'rename from ', 'rename to ', 'copy from ', 'copy to ',
  'Binary files ', 'GIT binary patch', '\\ No newline at end of file',
] as const

/**
 * Classify one unified-diff line.
 * @param line - one line of diff text (no trailing newline).
 * @returns the display kind for that line.
 */
export function classifyDiffLine(line: string): DiffLineKind {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta'
  if (line.startsWith('@@')) return 'hunk'
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'del'
  for (const prefix of META_PREFIXES) {
    if (line.startsWith(prefix)) return 'meta'
  }
  return 'ctx'
}
