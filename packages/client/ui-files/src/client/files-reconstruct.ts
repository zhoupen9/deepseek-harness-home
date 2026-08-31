/**
 * Net per-file reconstruction: fold the in-window mutation stream (hunk
 * patches and whole-file creates) into one current document per path. Only
 * regions ever touched appear — untouched regions are invisible to the session
 * log and stay out of the reconstruction, which is exactly what a session-log
 * file explorer can promise. The fold is the same algorithm the Changes view
 * uses (a local copy: cross-plugin value imports are forbidden by the bundle
 * purity gate), so both views agree on the reconstructed state.
 * @module @deepseek-ai/dsh-client-ui-files/client
 */
import type { FilesFile, FilesMutation, FilesRead } from './files-contract.ts'
import { contentLines, joinLines } from './files-text.ts'

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

/** Folding outcome for one file. */
interface FoldResult {
  /** Current document lines (touched regions only). */
  readonly doc: readonly string[]
  /** Whether at least one hunk could not be anchored. */
  readonly degraded: boolean
  /** Status of the file after folding. */
  readonly status: FilesFile['status']
  /** Seq of the last applied mutation. */
  readonly lastSeq: number
  /** Time of the last applied mutation. */
  readonly lastTime: number
}

/**
 * Fold `mutations` (ascending seq) into one file's current state. The first
 * content seeds the document; later hunks replace in place when their context
 * anchors, and append as standalone regions otherwise (flagged `degraded`).
 * A write-create resets to the whole-file content.
 * @param mutations - the file's mutations, any order (sorted by seq here).
 * @returns the folding outcome.
 */
export function foldMutations(mutations: readonly FilesMutation[]): FoldResult {
  const sorted = [...mutations].sort((left, right) => left.seq - right.seq)
  let doc: string[] = []
  let status: FilesFile['status'] = 'modified'
  let degraded = false
  let lastSeq = 0
  let lastTime = 0
  for (const mutation of sorted) {
    if (mutation.kind === 'create') {
      // Whole-file create (or identical overwrite): the args content is the
      // authoritative current state.
      doc = contentLines(mutation.content ?? '')
      status = 'created'
      lastSeq = mutation.seq
      lastTime = mutation.time
      continue
    }
    for (const hunk of mutation.hunks ?? []) {
      const oldLines = contentLines(hunk.oldText ?? '')
      const newLines = contentLines(hunk.newText)
      if (doc.length === 0) {
        doc = newLines.slice()
      } else {
        const index = indexOfLines(doc, oldLines)
        if (index === -1) {
          // Region never seen before (or drifted): append as a standalone
          // region. The delta is still correct per region; only ordering
          // against previously-seen regions is approximate.
          degraded = true
          doc.push(...newLines)
        } else {
          doc.splice(index, oldLines.length, ...newLines)
        }
      }
    }
    lastSeq = mutation.seq
    lastTime = mutation.time
  }
  return { doc, degraded, status, lastSeq, lastTime }
}

/** One file's reconstruction outcome from its mutation stream. */
export interface ReconstructedFile extends FilesFile {
  readonly degraded: boolean
}

/**
 * Reconstruct one file from its mutation stream.
 * @param path - the file's model-facing path.
 * @param mutations - the file's mutations, any order (sorted by seq inside).
 * @returns the reconstructed file facts.
 */
export function reconstructFile(path: string, mutations: readonly FilesMutation[]): ReconstructedFile {
  const { doc, degraded, status, lastSeq, lastTime } = foldMutations(mutations)
  const content = joinLines(doc)
  return {
    path,
    status,
    content,
    totalLines: doc.length,
    partial: degraded,
    lastSeq,
    lastTime,
    degraded,
  }
}

/**
 * Reconstruct one file that was only ever read: the last read window's lines
 * (keeping their own line numbering) become the content.
 * @param path - the file's model-facing path.
 * @param reads - the file's reads, any order (the last by seq wins).
 * @returns the file facts, or null when no read produced usable lines.
 */
export function reconstructReadFile(
  path: string,
  reads: readonly FilesRead[],
): ReconstructedFile | null {
  const last = [...reads].sort((left, right) => left.seq - right.seq).at(-1)
  if (last === undefined || last.lines.length === 0) return null
  const content = joinLines(last.lines.map(line => line.text))
  const partial = last.lines.length < last.totalLines || last.offset !== 1
  return {
    path,
    status: 'read',
    content,
    totalLines: last.totalLines,
    partial,
    lastSeq: last.seq,
    lastTime: last.time,
    degraded: partial,
  }
}
