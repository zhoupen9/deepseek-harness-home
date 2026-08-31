/**
 * Edits-owned Conversation Definition: one Context per edit/write tool call,
 * settled by its result carrying `FsDiffMeta` in `tool/result.meta`, or by
 * a nested PTC-mode sub-dispatch whose file mutation is reconstructed from the
 * call arguments, and projected as one `edits` view node per applied mutation.
 * @module @deepseek-ai/dsh-client-ui-edits/client
 */
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  ConversationMatch, ConversationNodeContext, ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-tools/types'
import type { EditsConversationViewNode, EditsEntry } from './edits-contract.ts'

/** Tools whose results carry the contextual-diff `meta` payload. */
const EDIT_TOOLS: ReadonlySet<string> = new Set(['edit', 'write'])

interface EditsResult {
  readonly seq: number
  readonly time: number
  readonly turn: number
  readonly step: number
  readonly diffs: readonly DiffHunk[]
  readonly error?: { readonly name: string; readonly code: string }
}

interface EditsState {
  readonly callId: string
  readonly tool: 'edit' | 'write' | null
  readonly result: EditsResult | null
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

/** Extract a settled result from a `tool/result` match, or null when it carries no usable diffs. */
function resultFromMatch(match: ConversationMatch): EditsResult | null {
  if (match.event.type !== 'tool/result') return null
  const diffs = narrowDiffs(match.event.data.meta)
  if (diffs === null) return null
  return {
    seq: match.event.seq,
    time: match.event.time,
    turn: match.event.data.turn,
    step: match.event.data.step,
    diffs,
    ...(match.event.data.error === undefined ? {} : { error: match.event.data.error }),
  }
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
 * Reconstruct one intended file mutation from a nested dispatch's call
 * arguments, mirroring the chat diff card's argument-derived fallback (PTC
 * mode logs no result `meta`).
 * @param name - dispatched tool name.
 * @param args - JSON-normalized call arguments.
 * @returns the reconstructed hunk, or null when the arguments are unusable.
 */
function dispatchDiffs(name: string, args: unknown): DiffHunk[] | null {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return null
  const record = args as Record<string, unknown>
  const path = record.file_path
  if (typeof path !== 'string' || path.trim() === '') return null
  if (name === 'write') {
    const content = record.content
    return typeof content === 'string' ? [{ path, oldText: null, newText: content }] : null
  }
  if (name !== 'edit') return null
  const oldText = record.old_string
  const newText = record.new_string
  const replaceAll = record.replace_all
  if (typeof oldText !== 'string' || typeof newText !== 'string') return null
  if (replaceAll !== undefined && typeof replaceAll !== 'boolean') return null
  return [{ path, oldText: oldText || null, newText }]
}

/** Extract a settled result from a nested `tool/code-dispatch` match, or null when it has no usable mutation. */
function dispatchResult(match: ConversationMatch): EditsResult | null {
  if (match.event.type !== 'tool/code-dispatch') return null
  if (match.event.data.isError === true) return null
  const diffs = dispatchDiffs(match.event.data.name, match.event.data.arguments)
  if (diffs === null) return null
  return {
    seq: match.event.seq,
    time: match.event.time,
    turn: locationTurn(match),
    step: locationStep(match),
    diffs,
  }
}

/** State adopted when the window opened inside a settled result (call head outside). */
function fallbackState(context: ConversationNodeContext<EditsState>): EditsState | undefined {
  for (const match of context.matches) {
    if (match.event.type === 'tool/result') {
      const result = resultFromMatch(match)
      if (result === undefined) continue
      return {
        callId: String(match.event.data.message.source.callId),
        tool: null,
        result,
      }
    }
    if (match.event.type === 'tool/code-dispatch') {
      const result = dispatchResult(match)
      if (result === undefined) continue
      return {
        callId: String(match.event.data.subCallId),
        tool: match.event.data.name as 'edit' | 'write',
        result,
      }
    }
  }
  return undefined
}

/** Project the settled entry, or null while the call is still pending or failed. */
function entryFor(context: ConversationNodeContext<EditsState>, state: EditsState): EditsEntry | null {
  const result = state.result
  if (result === null) return null
  return {
    key: context.key,
    callId: state.callId,
    tool: state.tool,
    seq: result.seq,
    time: result.time,
    turn: result.turn,
    step: result.step,
    diffs: result.diffs,
    ...(result.error === undefined ? {} : { error: result.error }),
  }
}

/** Wrap one entry in the Engine-owned target envelope. */
function editsNode(
  context: ConversationNodeContext,
  anchorSeq: number,
  entry: EditsEntry,
): EditsConversationViewNode {
  return {
    key: context.key,
    kind: context.kind,
    id: context.id,
    target: 'edits',
    anchorSeq,
    location: context.start?.location ?? { kind: 'unresolved' },
    data: { kind: 'edit', entry },
  }
}

/** Edits-owned lifecycle: start on an edit/write call or dispatch, settle on its result. */
export const editsDefinition: ConversationNodeDefinition<EditsState> = {
  kind: 'edits-result',
  target: 'edits',
  match: (event) => {
    if (event.type === 'tool/call') {
      return EDIT_TOOLS.has(event.data.name)
        ? { id: String(event.data.callId), role: 'start' as const }
        : null
    }
    if (event.type === 'tool/result') {
      return narrowDiffs(event.data.meta) === null
        ? null
        : { id: String(event.data.message.source.callId), role: 'update' as const }
    }
    if (event.type === 'tool/code-dispatch-start' || event.type === 'tool/code-dispatch') {
      if (!EDIT_TOOLS.has(event.data.name)) return null
      const role = event.type === 'tool/code-dispatch-start' ? 'start' : 'update'
      return { id: String(event.data.subCallId), role }
    }
    return null
  },
  start: (_context, match) => {
    if (match.event.type === 'tool/call') {
      return {
        callId: String(match.event.data.callId),
        tool: match.event.data.name as 'edit' | 'write',
        result: null,
      }
    }
    if (match.event.type === 'tool/code-dispatch-start') {
      return {
        callId: String(match.event.data.subCallId),
        tool: match.event.data.name as 'edit' | 'write',
        result: null,
      }
    }
    throw new Error('edits-result start requires tool/call or tool/code-dispatch-start')
  },
  update: (context, match) => {
    if (match.event.type === 'tool/result') {
      const result = resultFromMatch(match)
      if (result === null) return context.state
      return { ...context.state, result }
    }
    if (match.event.type === 'tool/code-dispatch') {
      const result = dispatchResult(match)
      if (result === null) return context.state
      return { ...context.state, result }
    }
    return context.state
  },
  buildViewNode: (context) => {
    const state = context.state ?? fallbackState(context)
    if (state === undefined) return null
    const entry = entryFor(context, state)
    if (entry === null) return null
    const anchorSeq = context.start?.event.seq ?? entry.seq
    return editsNode(context, anchorSeq, entry)
  },
}

/**
 * Register the Edits lifecycle.
 * @param ctx - Plugin context receiving the Definition.
 */
export function registerEditsDefinition(
  ctx: import('@deepseek-ai/cordis').Context,
): void {
  ctx.uiConversation.events.register(editsDefinition)
}
