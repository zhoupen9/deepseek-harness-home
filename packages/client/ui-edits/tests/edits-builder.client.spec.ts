/**
 * Behavior spec for the Edits Definition and snapshot builder: synthetic
 * tool/call + tool/result events (with and without usable `meta.diffs`)
 * project to per-turn edit records, replay-safe and idempotent.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime); typechecks fully under the harness tsconfig once the
 * package is dropped into packages/client/ui-edits.
 */
import { describe, expect, it } from 'vitest'
import type { ConversationMatch, ConversationNodeContext } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-tools/types'
import { editsDefinition } from '../src/client/edits-definition.ts'
import { EditsSnapshotBuilder } from '../src/client/edits-snapshot-builder.ts'
import type { EditsSnapshot, EditsConversationViewNode, EditsEntry } from '../src/client/edits-contract.ts'
import { EMPTY_EDITS_SNAPSHOT } from '../src/client/edits-contract.ts'

type ToolResultEvent = SessionEvent<'tool/result'>
type ToolCallEvent = SessionEvent<'tool/call'>
type DispatchStartEvent = SessionEvent<'tool/code-dispatch-start'>
type DispatchEvent = SessionEvent<'tool/code-dispatch'>

const EMPTY_TIMELINE = { turnOrder: [], turns: new Map() } as const

function callEvent(seq: number, turn: number, step: number, callId: string, name: string): ToolCallEvent {
  return {
    type: 'tool/call', seq, time: seq * 1000, data: { turn, step, callId: callId as never, name, arguments: '{}' },
  } as ToolCallEvent
}

function resultEvent(
  seq: number, turn: number, step: number, callId: string, meta: unknown, error?: { name: string; code: string },
): ToolResultEvent {
  const event = {
    type: 'tool/result', seq, time: seq * 1000, data: {
      turn, step,
      message: {
        role: 'user',
        content: [{ type: 'tool-result', toolCallId: callId, content: [], isError: error !== undefined }],
        source: { kind: 'tool', callId: callId as never },
      },
      ...(error === undefined ? {} : { error }),
      ...(meta === undefined ? {} : { meta }),
    },
  } as ToolResultEvent
  return event
}

function dispatchStartEvent(seq: number, subCallId: string, name: string, args: unknown): DispatchStartEvent {
  return {
    type: 'tool/code-dispatch-start', seq, time: seq * 1000,
    data: { rootCallId: 'root' as never, parentCallId: 'root' as never, subCallId: subCallId as never, name, arguments: args },
  } as DispatchStartEvent
}

function dispatchEvent(seq: number, subCallId: string, name: string, args: unknown, isError = false): DispatchEvent {
  return {
    type: 'tool/code-dispatch', seq, time: seq * 1000,
    data: { rootCallId: 'root' as never, parentCallId: 'root' as never, subCallId: subCallId as never, name, arguments: args, isError, content: [] },
  } as DispatchEvent
}

function stepLocation(turn: number, step: number): ConversationMatch['location'] {
  return { kind: 'step', turn: { turn }, step: { step } } as unknown as ConversationMatch['location']
}

function matchAt(event: SessionEvent<any>, location: ConversationMatch['location'], role: 'start' | 'update' = 'start'): ConversationMatch {
  return { event, role, location }
}

function match(event: SessionEvent<any>, role: 'start' | 'update' = 'start'): ConversationMatch {
  return { event, role, location: { kind: 'unresolved' } }
}

function contextFor(
  event: SessionEvent<any>,
  state: unknown,
  kind = 'edits-result',
): ConversationNodeContext<unknown> {
  const id = event.type === 'tool/call'
    ? String(event.data.callId)
    : event.type === 'tool/result'
      ? String((event.data as { message: { source: { callId: unknown } } }).message.source.callId)
      : String(event.seq)
  return {
    key: `${kind.length}:${kind}${id}`,
    kind,
    id,
    matches: [match(event)],
    start: { event, role: 'start', location: { kind: 'unresolved' } },
    state,
    current: new Map(),
  }
}

function buildNode(event: SessionEvent<any>, state: unknown): EditsConversationViewNode | null {
  const context = contextFor(event, state)
  return editsDefinition.buildViewNode!(context)
}

function diffs(path: string, oldText: string | null, newText: string): readonly { path: string; oldText: string | null; newText: string }[] {
  return [{ path, oldText, newText }]
}

describe('editsDefinition.match', () => {
  it('starts a Context for edit/write calls', () => {
    expect(editsDefinition.match(callEvent(1, 1, 0, 'c1', 'edit'))).toEqual({ id: 'c1', role: 'start' })
    expect(editsDefinition.match(callEvent(2, 1, 0, 'c2', 'write'))).toEqual({ id: 'c2', role: 'start' })
  })

  it('ignores calls of other tools', () => {
    expect(editsDefinition.match(callEvent(3, 1, 0, 'c3', 'bash'))).toBeNull()
    expect(editsDefinition.match(callEvent(4, 1, 0, 'c4', 'read'))).toBeNull()
  })

  it('updates on a result carrying usable diffs meta', () => {
    const meta = { diffs: diffs('a.txt', 'old', 'new') }
    expect(editsDefinition.match(resultEvent(5, 1, 0, 'c1', meta))).toEqual({ id: 'c1', role: 'update' })
  })

  it('ignores results without diffs meta', () => {
    expect(editsDefinition.match(resultEvent(6, 1, 0, 'c1', undefined))).toBeNull()
    expect(editsDefinition.match(resultEvent(7, 1, 0, 'c1', {}))).toBeNull()
    expect(editsDefinition.match(resultEvent(8, 1, 0, 'c1', { diffs: [] }))).toBeNull()
  })

  it('ignores malformed diffs meta', () => {
    expect(editsDefinition.match(resultEvent(9, 1, 0, 'c1', { diffs: [{ path: 42, oldText: null, newText: 'x' }] }))).toBeNull()
    expect(editsDefinition.match(resultEvent(10, 1, 0, 'c1', { diffs: [{ path: 'a', oldText: 3, newText: 'x' }] }))).toBeNull()
    expect(editsDefinition.match(resultEvent(11, 1, 0, 'c1', { diffs: 'nope' }))).toBeNull()
  })

  it('starts and updates a Context for nested edit/write dispatches', () => {
    expect(editsDefinition.match(dispatchStartEvent(12, 'c1:code:0', 'edit', { file_path: 'a.ts' }))).toEqual({ id: 'c1:code:0', role: 'start' })
    expect(editsDefinition.match(dispatchEvent(13, 'c1:code:0', 'write', { file_path: 'a.ts', content: 'x' }))).toEqual({ id: 'c1:code:0', role: 'update' })
  })

  it('ignores nested dispatches of other tools', () => {
    expect(editsDefinition.match(dispatchStartEvent(14, 'c1:code:1', 'bash', {}))).toBeNull()
    expect(editsDefinition.match(dispatchEvent(15, 'c1:code:1', 'read', {}))).toBeNull()
  })
})

describe('editsDefinition lifecycle', () => {
  it('settles an edit call into an entry with tool, turn, step, seq, and diffs', () => {
    const call = callEvent(1, 2, 1, 'c1', 'edit')
    const result = resultEvent(3, 2, 1, 'c1', { diffs: diffs('src/a.ts', 'foo', 'bar') })
    const state = editsDefinition.start!(contextFor(call, undefined), match(call))
    expect(state).toEqual({ callId: 'c1', tool: 'edit', result: null })
    const settled = editsDefinition.update!(contextFor(call, state), match(result, 'update'))
    const node = buildNode(call, settled)
    expect(node).not.toBeNull()
    const entry = node!.data.entry
    expect(entry).toMatchObject({
      callId: 'c1', tool: 'edit', turn: 2, step: 1, seq: 3, time: 3000,
    })
    expect(entry.diffs).toEqual(diffs('src/a.ts', 'foo', 'bar'))
  })

  it('keeps a pending call invisible until its result lands', () => {
    const call = callEvent(1, 1, 0, 'c1', 'edit')
    const state = editsDefinition.start!(contextFor(call, undefined), match(call))
    expect(buildNode(call, state)).toBeNull()
  })

  it('recovers an orphan result (call head outside the window) with tool null', () => {
    const result = resultEvent(9, 4, 2, 'orphan', { diffs: diffs('b.txt', null, 'hello') })
    const context = contextFor(result, undefined)
    const node = editsDefinition.buildViewNode!(context)
    expect(node).not.toBeNull()
    expect(node!.data.entry).toMatchObject({ callId: 'orphan', tool: null, turn: 4, step: 2 })
  })

  it('carries a reported error through the entry', () => {
    const call = callEvent(1, 1, 0, 'c1', 'edit')
    const result = resultEvent(3, 1, 0, 'c1', { diffs: diffs('a.txt', 'x', 'y') }, { name: 'E', code: 'FS_IO' })
    const state = editsDefinition.update!(contextFor(call, editsDefinition.start!(contextFor(call, undefined), match(call))), match(result, 'update'))
    const entry = buildNode(call, state)!.data.entry
    expect(entry.error).toEqual({ name: 'E', code: 'FS_IO' })
  })

  it('settles a nested edit dispatch from its call arguments and location', () => {
    const args = { file_path: 'src/a.ts', old_string: 'foo', new_string: 'bar' }
    const start = dispatchStartEvent(1, 'c1:code:0', 'edit', args)
    const settle = dispatchEvent(3, 'c1:code:0', 'edit', args)
    const state = editsDefinition.start!(contextFor(start, undefined), matchAt(start, stepLocation(2, 1)))
    const settled = editsDefinition.update!(contextFor(start, state), matchAt(settle, stepLocation(2, 1), 'update'))
    const node = buildNode(start, settled)
    expect(node).not.toBeNull()
    const entry = node!.data.entry
    expect(entry).toMatchObject({ callId: 'c1:code:0', tool: 'edit', turn: 2, step: 1, seq: 3, time: 3000 })
    expect(entry.diffs).toEqual(diffs('src/a.ts', 'foo', 'bar'))
  })

  it('reconstructs a nested write dispatch as a whole-file create', () => {
    const args = { file_path: 'out.txt', content: 'hello' }
    const start = dispatchStartEvent(1, 'c2:code:0', 'write', args)
    const settle = dispatchEvent(3, 'c2:code:0', 'write', args)
    const state = editsDefinition.start!(contextFor(start, undefined), matchAt(start, stepLocation(1, 0)))
    const settled = editsDefinition.update!(contextFor(start, state), matchAt(settle, stepLocation(1, 0), 'update'))
    const entry = buildNode(start, settled)!.data.entry
    expect(entry.diffs).toEqual(diffs('out.txt', null, 'hello'))
  })

  it('ignores a failed nested dispatch', () => {
    const args = { file_path: 'a.ts', old_string: 'foo', new_string: 'bar' }
    const start = dispatchStartEvent(1, 'c1:code:0', 'edit', args)
    const settle = dispatchEvent(3, 'c1:code:0', 'edit', args, true)
    const state = editsDefinition.start!(contextFor(start, undefined), matchAt(start, stepLocation(2, 1)))
    const settled = editsDefinition.update!(contextFor(start, state), matchAt(settle, stepLocation(2, 1), 'update'))
    expect(buildNode(start, settled)).toBeNull()
  })
})

describe('EditsSnapshotBuilder', () => {
  function nodeFor(key: string, entry: EditsEntry): EditsConversationViewNode {
    return { key, kind: 'edits-result', id: entry.callId, target: 'edits', anchorSeq: entry.seq, location: { kind: 'unresolved' }, data: { kind: 'edit', entry } }
  }

  function entry(key: string, callId: string, tool: 'edit' | 'write', seq: number, turn: number, step = 0): EditsEntry {
    return { key, callId, tool, seq, time: seq * 1000, turn, step, diffs: diffs(`${callId}.txt`, 'a', 'b') }
  }

  it('starts empty', () => {
    const builder = new EditsSnapshotBuilder()
    expect(builder.empty).toBe(EMPTY_EDITS_SNAPSHOT)
  })

  it('groups edits by turn and orders them by seq', () => {
    const builder = new EditsSnapshotBuilder()
    builder.apply({
      upserts: [
        nodeFor('k1', entry('k1', 'c1', 'edit', 30, 2)),
        nodeFor('k2', entry('k2', 'c2', 'write', 10, 1)),
        nodeFor('k3', entry('k3', 'c3', 'edit', 20, 2)),
        nodeFor('k4', entry('k4', 'c4', 'edit', 5, 1)),
      ],
      timeline: EMPTY_TIMELINE,
    })
    const snapshot: EditsSnapshot = builder.apply({ upserts: [], timeline: EMPTY_TIMELINE })
    expect(snapshot.turns.map(turn => turn.turn)).toEqual([1, 2])
    expect(snapshot.turns[0]!.edits.map(e => e.seq)).toEqual([5, 10])
    expect(snapshot.turns[1]!.edits.map(e => e.seq)).toEqual([20, 30])
  })

  it('replace() rebuilds deterministically (replay-safe)', () => {
    const builder = new EditsSnapshotBuilder()
    const nodes = [nodeFor('k1', entry('k1', 'c1', 'edit', 5, 1)), nodeFor('k2', entry('k2', 'c2', 'write', 7, 1))]
    const first = builder.replace({ nodes, timeline: EMPTY_TIMELINE })
    const second = builder.replace({ nodes: [...nodes].reverse(), timeline: EMPTY_TIMELINE })
    expect(second).toEqual(first)
    expect(second.turns).toEqual([{ turn: 1, edits: [nodes[0]!.data.entry, nodes[1]!.data.entry] }])
  })

  it('upserting the same key replaces the entry', () => {
    const builder = new EditsSnapshotBuilder()
    const before = entry('k1', 'c1', 'edit', 5, 1)
    builder.apply({ upserts: [nodeFor('k1', before)], timeline: EMPTY_TIMELINE })
    const after = entry('k1', 'c1', 'edit', 9, 1)
    builder.apply({ upserts: [nodeFor('k1', after)], timeline: EMPTY_TIMELINE })
    const snapshot = builder.apply({ upserts: [], timeline: EMPTY_TIMELINE })
    expect(snapshot.turns[0]!.edits).toHaveLength(1)
    expect(snapshot.turns[0]!.edits[0]!.seq).toBe(9)
  })
})
