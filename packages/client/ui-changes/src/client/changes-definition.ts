/**
 * Changes-owned Conversation Definition: one Context per edit/write tool call,
 * settled by its result (contextual-diff hunks in `tool/result.meta`, or a
 * write-create/identical overwrite whose whole-file content comes from the
 * call args), and projected as one `changes` view node per applied mutation.
 * @module @deepseek-ai/dsh-client-ui-changes/client
 */
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  ConversationMatch, ConversationNodeContext, ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-tools/types'
import type { ChangeMutation, ChangesConversationViewNode } from './changes-contract.ts'

/** Tools whose results carry the contextual-diff `meta` payload. */
const FILE_TOOLS: ReadonlySet<string> = new Set(['edit', 'write'])

interface ChangesResult {
  readonly seq: number
  readonly time: number
  readonly turn: number
  readonly step: number
  /** Applied hunks, or null when the result carried none (write create / identical overwrite). */
  readonly hunks: readonly DiffHunk[] | null
  readonly error?: { readonly name: string; readonly code: string }
}

interface ChangesState {
  readonly callId: string
  readonly tool: 'edit' | 'write' | null
  /** Parsed call arguments: the model-facing path and (write) full content. */
  readonly args: { readonly filePath?: string; readonly content?: string } | null
  readonly result: ChangesResult | null
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

/** Extract a settled result from a `tool/result` match. */
function resultFromMatch(match: ConversationMatch): ChangesResult | null {
  if (match.event.type !== 'tool/result') return null
  return {
    seq: match.event.seq,
    time: match.event.time,
    turn: match.event.data.turn,
    step: match.event.data.step,
    hunks: narrowDiffs(match.event.data.meta),
    ...(match.event.data.error === undefined ? {} : { error: match.event.data.error }),
  }
}

/**
 * Parse a tool call's raw arguments JSON into the fields the Changes view
 * needs; null when the arguments are unusable.
 * @param name - the tool name (write content is only read for `write`).
 * @param argumentsRaw - the raw arguments JSON string.
 * @returns the parsed fields, or null.
 */
function parseArgs(name: string, argumentsRaw: string): { filePath?: string; content?: string } | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(argumentsRaw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  const filePath = typeof record.file_path === 'string' ? record.file_path : undefined
  if (filePath === undefined) return null
  const content = name === 'write' && typeof record.content === 'string' ? record.content : undefined
  return { filePath, content }
}

/** Turn number of a matched event, derived from its resolved Session location. */
function locationTurn(match: ConversationMatch): number {
  return match.location.kind === 'step' || match.location.kind === 'turn' ? match.location.turn.turn : 0
}

/** Step number of a matched event, derived from its resolved Session location. */
function locationStep(match: ConversationMatch): number {
  return match.location.kind === 'step' ? match.location.step.step : 0
}

/**
 * Extract path/content from a code-dispatch's already-parsed arguments object
 * (PTC mode logs `arguments` as JSON, not the raw string `tool/call` carries).
 */
function parseDispatchArgs(name: string, args: unknown): { filePath?: string; content?: string } | null {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return null
  const record = args as Record<string, unknown>
  const filePath = typeof record.file_path === 'string' ? record.file_path : undefined
  if (filePath === undefined) return null
  const content = name === 'write' && typeof record.content === 'string' ? record.content : undefined
  return { filePath, content }
}

/**
 * Reconstruct one intended file mutation from a nested PTC-mode dispatch's
 * call arguments (PTC mode logs no result `meta`).
 */
function dispatchResult(match: ConversationMatch): ChangesResult | null {
  if (match.event.type !== 'tool/code-dispatch') return null
  if (match.event.data.isError === true) return null
  const name = match.event.data.name
  const args = match.event.data.arguments
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return null
  const record = args as Record<string, unknown>
  const path = record.file_path
  if (typeof path !== 'string' || path.trim() === '') return null
  if (name === 'write') {
    // A write dispatch is a create; its content comes from the start's args.
    return { seq: match.event.seq, time: match.event.time, turn: locationTurn(match), step: locationStep(match), hunks: null }
  }
  if (name !== 'edit') return null
  const oldText = record.old_string
  const newText = record.new_string
  const replaceAll = record.replace_all
  if (typeof oldText !== 'string' || typeof newText !== 'string') return null
  if (replaceAll !== undefined && typeof replaceAll !== 'boolean') return null
  return {
    seq: match.event.seq,
    time: match.event.time,
    turn: locationTurn(match),
    step: locationStep(match),
    hunks: [{ path, oldText: oldText || null, newText }],
  }
}

/** State adopted when the window opened inside a result (call head outside). */
function fallbackState(context: ConversationNodeContext<ChangesState>): ChangesState | undefined {
  for (const match of context.matches) {
    if (match.event.type === 'tool/result') {
      const result = resultFromMatch(match)
      // Without the call head there are no args, so a content-less write-create
      // is unknowable; only a hunk-carrying result can make progress.
      if (result === null || result.hunks === null) continue
      return { callId: String(match.event.data.message.source.callId), tool: null, args: null, result }
    }
    if (match.event.type === 'tool/code-dispatch') {
      const result = dispatchResult(match)
      if (result === null || result.hunks === null) continue
      return { callId: String(match.event.data.subCallId), tool: match.event.data.name as 'edit' | 'write', args: null, result }
    }
  }
  return undefined
}

/** Project the applied mutation, or null while the call is pending, failed, or unknowable. */
function mutationFor(context: ConversationNodeContext<ChangesState>, state: ChangesState): ChangeMutation | null {
  const result = state.result
  if (result === null || result.error !== undefined) return null
  if (result.hunks === null) {
    // Write create / identical overwrite: reconstruct from the call's content.
    if (state.tool !== 'write' || state.args?.filePath === undefined || state.args.content === undefined) return null
    return {
      key: context.key,
      callId: state.callId,
      tool: state.tool,
      seq: result.seq,
      time: result.time,
      turn: result.turn,
      step: result.step,
      path: state.args.filePath,
      kind: 'create',
      content: state.args.content,
    }
  }
  const path = result.hunks[0]?.path
  if (path === undefined) return null
  return {
    key: context.key,
    callId: state.callId,
    tool: state.tool,
    seq: result.seq,
    time: result.time,
    turn: result.turn,
    step: result.step,
    path,
    kind: 'hunks',
    hunks: result.hunks,
  }
}

/** Wrap one mutation in the Engine-owned target envelope. */
function changesNode(
  context: ConversationNodeContext,
  anchorSeq: number,
  mutation: ChangeMutation,
): ChangesConversationViewNode {
  return {
    key: context.key,
    kind: context.kind,
    id: context.id,
    target: 'changes',
    anchorSeq,
    location: context.start?.location ?? { kind: 'unresolved' },
    data: { kind: 'change', mutation },
  }
}

/** Changes-owned lifecycle: start on an edit/write call, settle on its result. */
export const changesDefinition: ConversationNodeDefinition<ChangesState> = {
  kind: 'changes-result',
  target: 'changes',
  match: (event) => {
    if (event.type === 'tool/call') {
      return FILE_TOOLS.has(event.data.name)
        ? { id: String(event.data.callId), role: 'start' as const }
        : null
    }
    if (event.type === 'tool/result') {
      // Match every result so a write-create (whose meta carries no hunks)
      // can settle its start; contexts with no usable evidence project null.
      return { id: String(event.data.message.source.callId), role: 'update' as const }
    }
    if (event.type === 'tool/code-dispatch-start' || event.type === 'tool/code-dispatch') {
      if (!FILE_TOOLS.has(event.data.name)) return null
      const role = event.type === 'tool/code-dispatch-start' ? 'start' as const : 'update' as const
      return { id: String(event.data.subCallId), role }
    }
    return null
  },
  start: (_context, match) => {
    if (match.event.type === 'tool/call') {
      return {
        callId: String(match.event.data.callId),
        tool: match.event.data.name as 'edit' | 'write',
        args: parseArgs(match.event.data.name, match.event.data.arguments),
        result: null,
      }
    }
    if (match.event.type === 'tool/code-dispatch-start') {
      return {
        callId: String(match.event.data.subCallId),
        tool: match.event.data.name as 'edit' | 'write',
        args: parseDispatchArgs(match.event.data.name, match.event.data.arguments),
        result: null,
      }
    }
    throw new Error('changes-result start requires tool/call or tool/code-dispatch-start')
  },
  update: (context, match) => {
    if (match.event.type === 'tool/result') {
      const result = resultFromMatch(match)
      if (result === null) return context.state
      if (context.state.tool !== 'write' && result.hunks === null) return context.state
      return { ...context.state, result }
    }
    if (match.event.type === 'tool/code-dispatch') {
      const result = dispatchResult(match)
      if (result === null) return context.state
      if (context.state.tool !== 'write' && result.hunks === null) return context.state
      return { ...context.state, result }
    }
    return context.state
  },
  buildViewNode: (context) => {
    const state = context.state ?? fallbackState(context)
    if (state === undefined) return null
    const mutation = mutationFor(context, state)
    if (mutation === null) return null
    const anchorSeq = context.start?.event.seq ?? mutation.seq
    return changesNode(context, anchorSeq, mutation)
  },
}

/**
 * Register the Changes lifecycle.
 * @param ctx - Plugin context receiving the Definition.
 */
export function registerChangesDefinition(
  ctx: import('@deepseek-ai/cordis').Context,
): void {
  ctx.uiConversation.events.register(changesDefinition)
}
