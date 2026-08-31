/**
 * Shared text helpers for the Changes reconstruction and net-diff rendering.
 * @module @deepseek-ai/dsh-client-ui-changes/client
 */

/**
 * Split a side's text into its content lines, mirroring DiffBlock's rule: empty
 * text is zero lines, a single trailing newline is a terminator rather than an
 * extra empty line, and an interior blank line survives.
 * @param text - the text to split.
 * @returns the content lines, without the terminating newline.
 */
export function contentLines(text: string): string[] {
  if (text === '') return []
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return body.split('\n')
}

/**
 * Re-join content lines into a text with a single trailing newline (the basis
 * the reconstruction documents use for display).
 * @param lines - content lines.
 * @returns the joined text.
 */
export function joinLines(lines: readonly string[]): string {
  return lines.length === 0 ? '' : lines.join('\n') + '\n'
}
