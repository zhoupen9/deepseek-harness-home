/**
 * Line-level net diff for the Changes view: a compact LCS alignment of the
 * reconstructed before/after texts, collapsed into change regions padded with
 * a few context lines. Rows are rendered by the plugin's own NetDiff surface
 * (DiffBlock only draws raw removed/added sides and cannot align context).
 * @module @deepseek-ai/dsh-client-ui-changes/client
 */
import { contentLines } from './changes-text.ts'

/** One rendered diff row. */
export type NetDiffRow =
  | { readonly kind: 'ctx'; readonly text: string }
  | { readonly kind: 'del'; readonly text: string }
  | { readonly kind: 'add'; readonly text: string }
  | { readonly kind: 'gap' }

/** Unchanged lines shown on each side of a change region. */
export const NET_DIFF_CONTEXT = 2

/**
 * LCS work cap in DP cells: beyond it the alignment falls back to one
 * unaligned full-replace region (still a correct, if coarser, difference).
 */
const MAX_LCS_CELLS = 200_000

/** Added/removed totals derived from rendered rows. */
export interface NetDiffSummary {
  readonly added: number
  readonly removed: number
}

type LcsEvent = { readonly kind: 'match' | 'del' | 'add'; readonly text: string }

/**
 * Compute the LCS alignment of `before`/`after` as an event stream
 * (matches, deletions, insertions in file order), falling back to a full
 * replace for oversized inputs.
 */
function lcsEvents(before: string[], after: string[]): readonly LcsEvent[] {
  const n = before.length
  const m = after.length
  if (n * m > MAX_LCS_CELLS) {
    const events: LcsEvent[] = []
    for (const text of before) events.push({ kind: 'del', text })
    for (const text of after) events.push({ kind: 'add', text })
    return events
  }
  const width = m + 1
  // Direction table: 1 = delete before[i-1], 2 = insert after[j-1], 3 = match.
  const dir = new Uint8Array((n + 1) * width)
  let prev = new Uint32Array(width)
  let cur = new Uint32Array(width)
  for (let i = 1; i <= n; i++) {
    cur[0] = 0
    const line = before[i - 1]!
    for (let j = 1; j <= m; j++) {
      if (line === after[j - 1]) {
        cur[j] = prev[j - 1]! + 1
        dir[i * width + j] = 3
      } else if (prev[j]! >= cur[j - 1]!) {
        cur[j] = prev[j]!
        dir[i * width + j] = 1
      } else {
        cur[j] = cur[j - 1]!
        dir[i * width + j] = 2
      }
    }
    ;[prev, cur] = [cur, prev]
  }
  const events: LcsEvent[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dir[i * width + j] === 3) {
      events.push({ kind: 'match', text: before[i - 1]! })
      i--
      j--
    } else if (i > 0 && (j === 0 || dir[i * width + j] === 1)) {
      events.push({ kind: 'del', text: before[i - 1]! })
      i--
    } else {
      events.push({ kind: 'add', text: after[j - 1]! })
      j--
    }
  }
  events.reverse()
  return events
}

/**
 * Align `before`/`after` into change regions padded with up to `context`
 * unchanged lines each side, joined by gap rows where context does not overlap.
 * @param before - the original content.
 * @param after - the current content.
 * @param context - unchanged lines shown per region side.
 * @returns the rendered rows; empty when the texts are identical.
 */
export function computeNetDiff(before: string, after: string, context = NET_DIFF_CONTEXT): NetDiffRow[] {
  const events = lcsEvents(contentLines(before), contentLines(after))
  const rows: NetDiffRow[] = []
  let lastConsumed = 0
  let i = 0
  while (i < events.length) {
    if (events[i]!.kind === 'match') {
      i++
      continue
    }
    const lookback: string[] = []
    for (let k = i - 1; k >= 0 && lookback.length < context && events[k]!.kind === 'match'; k--) {
      lookback.unshift(events[k]!.text)
    }
    const dels: string[] = []
    const adds: string[] = []
    let j = i
    while (j < events.length && events[j]!.kind !== 'match') {
      if (events[j]!.kind === 'del') dels.push(events[j]!.text)
      else adds.push(events[j]!.text)
      j++
    }
    const lookahead: string[] = []
    for (let k = j; k < events.length && lookahead.length < context && events[k]!.kind === 'match'; k++) {
      lookahead.push(events[k]!.text)
    }
    const end = j + lookahead.length
    if (rows.length > 0 && i > lastConsumed) rows.push({ kind: 'gap' })
    for (const text of lookback) rows.push({ kind: 'ctx', text })
    for (const text of dels) rows.push({ kind: 'del', text })
    for (const text of adds) rows.push({ kind: 'add', text })
    for (const text of lookahead) rows.push({ kind: 'ctx', text })
    lastConsumed = end
    i = end
  }
  return rows
}

/** Tally added/removed lines from rendered rows. */
export function summarizeRows(rows: readonly NetDiffRow[]): NetDiffSummary {
  let added = 0
  let removed = 0
  for (const row of rows) {
    if (row.kind === 'del') removed++
    else if (row.kind === 'add') added++
  }
  return { added, removed }
}

/** The plain-text rendering of the rows (copy payload). */
export function rowsToText(rows: readonly NetDiffRow[]): string {
  return rows.map((row) => {
    switch (row.kind) {
      case 'del': return `- ${row.text}`
      case 'add': return `+ ${row.text}`
      case 'ctx': return row.text
      case 'gap': return '⋯'
    }
  }).join('\n')
}
