/**
 * Files-owned Conversation Definition: one Context per file-touching tool
 * call — write/edit/str_replace_editor mutations and read observations —
 * settled by its result, and projected as one `files` view node per applied
 * mutation or read window.
 * @module @deepseek-ai/dsh-client-ui-files/client
 */
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  ConversationMatch, ConversationNodeContext, ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { FilesConversationViewNode, FilesMutation, FilesRead } from './files-contract.ts'

/** Tools whose results carry file facts the Files view knows. */
const FILE_TOOLS: ReadonlySet<string> = new Set(['edit', 'write', 'str_replace_editor', 'read'])

/** One settled result's usable facts. */
interface FilesResult {
  readonly seq: number
  readonly time: number
  readonly turn: number
  readonly step: number
  /** Applied contextual-diff hunks; present for edit/hunk results. */
  readonly hunks?: readonly DiffHunk[]
  /** Read window facts; present for read results. */
  readonly read?: { readonly path: string; readonly offset: number; readonly lines: readonly { readonly number: number; readonly text: string }[]; readonly totalLines: number }
  readonly error?: { readonly name: string; readonly code: string }
}

interface FilesState {
  readonly callId: string
  readonly tool: 'edit' | 'write' | 'str_replace_editor' | 'read' | null
  /** Parsed call arguments: the model-facing path, write/editor content, and editor replacement texts. */
  readonly args: {
    readonly filePath?: string
    readonly content?: string
    readonly oldText?: string
    readonly newText?: string
  } | null
  readonly result: FilesResult | null
}

/**
 * Narrow opaque result metadata's `diffs` to well-formed hunks.
 * @param meta - the metadata field to validate.
 * @returns the validated hunks, or null when the payload is not usable.
 */
function narrowDiffs(meta: unknown): DiffHunk[] | null {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return null
  const diffs = (meta as Record<string, unknown>).diffs
  if (!Array.isArray(diffs) || diffs.length === 0) return null
  const out: DiffHunk[] = []
  for (const hunk of diffs) {
    if (typeof hunk !== 'object' || hunk === null) return null
    const { path, oldText, newText } = hunk as Record<string, unknown>
    if (typeof path !== 'string') return null
    if (oldText !== null && typeof oldText !== 'string') return null
    if (typeof newText !== 'string') return null
    out.push({ path, oldText, newText })
  }
  return out
}

/** A read window line after narrowing. */
interface ReadLine { readonly number: number; readonly text: string }

/**
 * Narrow opaque result metadata to a usable read window (the `read` tool's
 * persisted `presentationMeta`).
 * @param meta - the metadata field to validate.
 * @returns the validated window, or null when the payload is not usable.
 */
function narrowReadMeta(meta: unknown): FilesResult['read'] | null {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return null
  const { path, offset, lines, totalLines } = meta as Record<string, unknown>
  if (typeof path !== 'string' || typeof offset !== 'number' || typeof totalLines !== 'number') return null
  if (!Number.isInteger(offset) || offset < 1 || !Number.isInteger(totalLines) || totalLines < 0) return null
  if (!Array.isArray(lines)) return null
  const out: ReadLine[] = []
  for (const line of lines) {
    if (typeof line !== 'object' || line === null) return null
    const { number, text } = line as Record<string, unknown>
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) return null
    if (typeof text !== 'string') return null
    out.push({ number, text })
  }
  return { path, offset, lines: out, totalLines }
}

/** Extract a settled result from a `tool/result` match. */
function resultFromMatch(match: ConversationMatch): FilesResult | null {
  if (match.event.type !== 'tool/result') return null
  return {
    seq: match.event.seq,
    time: match.event.time,
    turn: match.event.data.turn,
    step: match.event.data.step,
    ...(narrowDiffs(match.event.data.meta) === null ? {} : { hunks: narrowDiffs(match.event.data.meta)! }),
    ...(narrowReadMeta(match.event.data.meta) === null ? {} : { read: narrowReadMeta(match.event.data.meta)! }),
    ...(match.event.data.error === undefined ? {} : { error: match.event.data.error }),
  }
}

/**
 * Parse a tool call's raw arguments JSON into the fields the Files view
 * needs; null when the arguments are unusable or name no file.
 * @param name - the tool name (argument shapes differ per tool).
 * @param argumentsRaw - the raw arguments JSON string.
 * @returns the parsed fields, or null.
 */
function parseArgs(name: string, argumentsRaw: string): FilesState['args'] {
  let parsed: unknown
  try {
    parsed = JSON.parse(argumentsRaw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  if (name === 'str_replace_editor') {
    const filePath = typeof record.path === 'string' ? record.path : undefined
    if (filePath === undefined) return null
    const command = typeof record.command === 'string' ? record.command : undefined
    return {
      filePath,
      ...(command === 'create' && typeof record.file_text === 'string' ? { content: record.file_text } : {}),
      ...(typeof record.old_str === 'string' ? { oldText: record.old_str } : {}),
      ...(typeof record.new_str === 'string' ? { newText: record.new_str } : {}),
    }
  }
  const filePath = typeof record.file_path === 'string' ? record.file_path : undefined
  if (filePath === undefined) return null
  return {
    filePath,
    ...(name === 'write' && typeof record.content === 'string' ? { content: record.content } : {}),
  }
}

/** State adopted when the window opened inside a result (call head outside). */
function fallbackState(context: ConversationNodeContext<FilesState>): FilesState | undefined {
  const resultMatch = context.matches.find(match => match.event.type === 'tool/result')
  if (resultMatch === undefined) return undefined
  const result = resultFromMatch(resultMatch)
  // Without the call head there are no args, so only a result carrying hunks
  // or a read window can make progress.
  if (result === null || (result.hunks === undefined && result.read === undefined)) return undefined
  return {
    callId: String(resultMatch.event.data.message.source.callId),
    tool: null,
    args: null,
    result,
  }
}

/** Project the read observation, or null while pending, failed, or unknowable. */
function readFor(context: ConversationNodeContext<FilesState>, state: FilesState): FilesRead | null {
  const result = state.result
  if (result === null || result.error !== undefined || result.read === undefined) return null
  return {
    key: context.key,
    callId: state.callId,
    seq: result.seq,
    time: result.time,
    turn: result.turn,
    step: result.step,
    path: result.read.path,
    offset: result.read.offset,
    lines: result.read.lines,
    totalLines: result.read.totalLines,
  }
}

/** Project the applied mutation, or null while pending, failed, or unknowable. */
function mutationFor(context: ConversationNodeContext<FilesState>, state: FilesState): FilesMutation | null {
  const result = state.result
  if (result === null || result.error !== undefined) return null
  const base = {
    key: context.key,
    callId: state.callId,
    tool: state.tool as FilesMutation['tool'],
    seq: result.seq,
    time: result.time,
    turn: result.turn,
    step: result.step,
  }
  if (result.hunks !== undefined) {
    const path = result.hunks[0]?.path
    if (path === undefined) return null
    return { ...base, path, kind: 'hunks' as const, hunks: result.hunks }
  }
  const args = state.args
  if (args === null || args.filePath === undefined) return null
  if (state.tool === 'write' && args.content !== undefined) {
    // Write create / identical overwrite: reconstruct from the call content.
    return { ...base, path: args.filePath, kind: 'create' as const, content: args.content }
  }
  if (state.tool === 'str_replace_editor') {
    if (args.content !== undefined) {
      // Editor create: whole-file content.
      return { ...base, path: args.filePath, kind: 'create' as const, content: args.content }
    }
    if (args.newText !== undefined) {
      // Editor str_replace / insert: one hunk. An insert has no anchor (empty
      // old text) and lands as a standalone region flagged degraded.
      return {
        ...base,
        path: args.filePath,
        kind: 'hunks' as const,
        hunks: [{ path: args.filePath, oldText: args.oldText ?? '', newText: args.newText }],
      }
    }
  }
  return null
}

/** Wrap one fact in the Engine-owned target envelope. */
function filesNode(
  context: ConversationNodeContext,
  anchorSeq: number,
  data: FilesConversationViewNode['data'],
): FilesConversationViewNode {
  return {
    key: context.key,
    kind: context.kind,
    id: context.id,
    target: 'files',
    anchorSeq,
    location: context.start?.location ?? { kind: 'unresolved' },
    data,
  }
}

/** Files-owned lifecycle: start on a file tool call, settle on its result. */
export const filesDefinition: ConversationNodeDefinition<FilesState> = {
  kind: 'files-fact',
  target: 'files',
  match: (event) => {
    if (event.type === 'tool/call') {
      return FILE_TOOLS.has(event.data.name)
        ? { id: String(event.data.callId), role: 'start' as const }
        : null
    }
    if (event.type === 'tool/result') {
      // Match every result so a write-create (whose meta carries no hunks)
      // and a read settle their starts; contexts with no usable evidence
      // project null.
      return { id: String(event.data.message.source.callId), role: 'update' as const }
    }
    return null
  },
  start: (_context, match) => {
    if (match.event.type !== 'tool/call') {
      throw new Error('files-fact start requires tool/call')
    }
    return {
      callId: String(match.event.data.callId),
      tool: match.event.data.name as FilesState['tool'],
      args: parseArgs(match.event.data.name, match.event.data.arguments),
      result: null,
    }
  },
  update: (context, match) => {
    const result = resultFromMatch(match)
    if (result === null) return context.state
    if (context.state === undefined) {
      // The window opened inside this result (call head outside): adopt a
      // call-less state so buildViewNode can project hunk/read facts.
      return {
        callId: String(match.event.data.message.source.callId),
        tool: null,
        args: null,
        result,
      }
    }
    return { ...context.state, result }
  },
  buildViewNode: (context) => {
    const state = context.state ?? fallbackState(context)
    if (state === undefined) return null
    const anchorSeq = context.start?.event.seq ?? state.result?.seq ?? 0
    const read = readFor(context, state)
    if (read !== null) return filesNode(context, anchorSeq, { kind: 'read', read })
    const mutation = mutationFor(context, state)
    if (mutation === null) return null
    return filesNode(context, anchorSeq, { kind: 'mutation', mutation })
  },
}

/**
 * Register the Files lifecycle.
 * @param ctx - Plugin context receiving the Definition.
 */
export function registerFilesDefinition(
  ctx: import('@deepseek-ai/cordis').Context,
): void {
  ctx.uiConversation.events.register(filesDefinition)
}
