/**
 * Net per-file reconstruction: fold the in-window mutation stream (hunk
 * patches and whole-file creates) into one original/current document pair per
 * path. Only regions ever touched appear — untouched regions are invisible to
 * the session log and stay out of the difference, which is exactly what a
 * cumulative "current difference" view wants.
 * @module @deepseek-ai/dsh-client-ui-changes/client
 */
import type { ChangeMutation, ChangesFile } from './changes-contract.ts'
import { contentLines, joinLines } from './changes-text.ts'

/**
 * Locate the first exact run of `needle` lines inside `lines`. An empty
 * needle is never located (a pure insertion has no anchor).
 * @param lines - the document to search.
 * @param needle - the block to find.
 * @returns the starting index, or -1 when absent.
 */
export function indexOfLines(lines: readonly string[], needle: readonly string[]): number {
  if (needle.length === 0 || needle.length > lines.length) return -1
  outer:
  for (let i = 0; i + needle.length <= lines.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (lines[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

/**
 * Fold `mutations` (ascending seq) into one file's net difference. The first
 * content seeds both documents; later hunks replace in place when their
 * context anchors, and append as standalone regions otherwise (flagged
 * `degraded`). A write-create resets to the whole-file content.
 * @param path - the file's model-facing path.
 * @param mutations - the file's mutations, any order (sorted by seq here).
 * @returns the reconstructed net difference.
 */
export function reconstructFile(path: string, mutations: readonly ChangeMutation[]): ChangesFile {
  const sorted = [...mutations].sort((left, right) => left.seq - right.seq)
  let baseline: string[] = []
  let doc: string[] = []
  let status: ChangesFile['status'] = 'modified'
  let degraded = false
  let last: ChangeMutation | undefined
  for (const mutation of sorted) {
    if (mutation.kind === 'create') {
      // Whole-file create (or identical overwrite): the args content is the
      // authoritative current state and nothing existed before it.
      doc = contentLines(mutation.content ?? '')
      baseline = []
      status = 'created'
      last = mutation
      continue
    }
    for (const hunk of mutation.hunks ?? []) {
      const oldLines = contentLines(hunk.oldText ?? '')
      const newLines = contentLines(hunk.newText)
      if (doc.length === 0 && baseline.length === 0) {
        baseline = oldLines.slice()
        doc = newLines.slice()
      } else {
        const index = indexOfLines(doc, oldLines)
        if (index === -1) {
          // Region never seen before (or drifted): append as a standalone
          // region. The delta is still correct per region; only ordering
          // against previously-seen regions is approximate.
          degraded = true
          baseline.push(...oldLines)
          doc.push(...newLines)
        } else {
          doc.splice(index, oldLines.length, ...newLines)
        }
      }
    }
    last = mutation
  }
  return {
    path,
    status,
    before: joinLines(baseline),
    after: joinLines(doc),
    lastSeq: last?.seq ?? 0,
    lastTime: last?.time ?? 0,
    lastTurn: last?.turn ?? 0,
    degraded,
  }
}
