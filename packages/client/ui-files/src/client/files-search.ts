/** Pure search-in-content helpers: find every occurrence of a query in the
 * shown (numbered) lines. Kept free of React so the behavior is unit-testable
 * without a DOM or the UI primitives. */

/** A line's text with its matches: 1-based line number plus the raw text. */
export interface NumberedLine {
  number: number
  text: string
}

/** One case-insensitive occurrence of the query within the shown content. */
export interface ContentMatch {
  /** 0-based index into the visible line list. */
  line: number
  /** Character offset of the match start within its line's text. */
  start: number
  /** Character offset one past the match end within its line's text. */
  end: number
  /** Stable index across all matches, in document order. */
  id: number
}

/** Find every non-overlapping, case-insensitive occurrence of a query. */
export function findMatches(lines: readonly NumberedLine[], query: string): ContentMatch[] {
  const needle = query.toLowerCase()
  if (needle.length === 0) return []
  const out: ContentMatch[] = []
  for (let i = 0; i < lines.length; i++) {
    const hay = lines[i].text.toLowerCase()
    let from = 0
    for (;;) {
      const at = hay.indexOf(needle, from)
      if (at === -1) break
      out.push({ line: i, start: at, end: at + query.length, id: out.length })
      from = at + query.length
    }
  }
  return out
}
