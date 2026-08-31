/**
 * The prose file-mention provider: makes inline-code file mentions in
 * assistant messages openable into the Files surfaces. Composes with the
 * prior `chatFileMentions` provider (ui-deliverables' produced-files
 * vocabulary when loaded) and adds the session-known vocabulary from this
 * plugin's own Files snapshot, so any file the session wrote, edited, or read
 * can be clicked open. `resolve` stays pure (the markdown renderer calls it
 * during render); the click (`open`) records one FileOpenRequest — the Files
 * tab (and its live explorer) consumes the queue to reveal the file. Per the
 * user decision, the click no longer opens the native host.
 * @module @deepseek-ai/dsh-client-ui-files/client
 */
import type { ChatFileMentions, TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { FileOpenRequest, FilesSnapshot } from './files-contract.ts'

/** The minimal request-queue face this module needs. */
export interface OpenRequestQueue {
  set(request: FileOpenRequest | null): void
}

/** Per-session Files snapshot reader used at mention-resolve time. */
export interface FilesSnapshotReader {
  (sessionId: SessionId): { readonly getSnapshot: () => FilesSnapshot } | undefined
}

/** Options for {@link createFilesMentions}. */
export interface FilesMentionsOptions {
  /** The provider that was registered before this plugin (composed, when present). */
  readonly prior: ChatFileMentions | undefined
  /** Queue written on click. */
  readonly queue: OpenRequestQueue
  /** Resolve the session the click/mention belongs to (the current session). */
  readonly currentSessionId: () => SessionId | undefined
  /** Resolve one session's Files snapshot source. */
  readonly filesOf: FilesSnapshotReader
  /** Monotonic nonce source (bumped per click). */
  readonly nextNonce: () => number
}

/** The basename of a path (the segment after the last `/`). */
function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/**
 * Match an authored token to a session-known file: an exact path, or a
 * basename unique among the snapshot's files.
 * @param snapshot - the session's Files snapshot.
 * @param value - the authored inline-code token.
 * @returns the matched path, or undefined.
 */
export function matchKnownFile(
  snapshot: FilesSnapshot | undefined,
  value: string,
): string | undefined {
  if (snapshot === undefined) return undefined
  if (snapshot.files.has(value)) return value
  const wanted = basename(value)
  if (wanted === value) return undefined
  let match: string | undefined
  for (const path of snapshot.files.keys()) {
    if (basename(path) !== wanted) continue
    if (match !== undefined) return undefined // ambiguous basename
    match = path
  }
  return match
}

/**
 * Create the composed provider.
 * @param options - queue, snapshot reader, session resolution, nonce source.
 * @returns the ChatFileMentions service face.
 */
export function createFilesMentions(options: FilesMentionsOptions): ChatFileMentions {
  return {
    forClosing(owner: TurnTailOwnerProps) {
      const priorMentions = options.prior?.forClosing(owner)
      const resolve: MarkdownFileMentions['resolve'] = (value) => {
        const sessionId = options.currentSessionId()
        const priorResolved = priorMentions?.resolve(value)
        const snapshot = sessionId === undefined ? undefined : options.filesOf(sessionId)?.getSnapshot()
        const known = matchKnownFile(snapshot, value)
        if (priorResolved === undefined && known === undefined) return undefined
        const open = (path: string): void => {
          if (sessionId === undefined) return
          options.queue.set({ nonce: options.nextNonce(), sessionId, path })
        }
        if (priorResolved !== undefined) {
          return {
            open: () => { open(priorResolved.title) },
            label: priorResolved.label,
            title: priorResolved.title,
          }
        }
        return { open: () => { open(known!) }, label: basename(known!), title: known! }
      }
      return { resolve }
    },
  }
}
