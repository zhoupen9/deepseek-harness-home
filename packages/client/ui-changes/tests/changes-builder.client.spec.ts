/**
 * Behavior spec for the Changes Definition and snapshot builder: synthetic
 * tool/call + tool/result events (with hunks meta, write-creates via args,
 * failures, orphan results) project to per-file net mutations, replay-safe
 * and idempotent.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime); typechecks fully under the harness tsconfig once the
 * package is dropped into packages/client/ui-changes.
 */
import { describe, expect, it } from 'vitest'
import type { ConversationMatch, ConversationNodeContext } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { changesDefinition } from '../src/client/changes-definition.ts'
import { ChangesSnapshotBuilder } from '../src/client/changes-snapshot-builder.ts'
import type { ChangeMutation, ChangesConversationViewNode, ChangesSnapshot } from '../src/client/changes-contract.ts'
import { EMPTY_CHANGES_SNAPSHOT } from '../src/client/changes-contract.ts'

type ToolResultEvent = SessionEvent<'tool/result'>
type ToolCallEvent = SessionEvent<'tool/call'>

const EMPTY_TIMELINE = { turnOrder: [], turns: new Map() } as const

function callEvent(seq: number, turn: number, step: number, callId: string, name: string, args = '{}'): ToolCallEvent {
  return {
    type: 'tool/call', seq, time: seq * 1000, data: { turn, step, callId: callId as never, name, arguments: args },
  } as ToolCallEvent
}

function resultEvent(
  seq: number, turn: number, step: number, callId: string, meta: unknown, error?: { name: string; code: string },
): ToolResultEvent {
  return {
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
}

function match(event: SessionEvent<any>, role: 'start' | 'update' = 'start'): ConversationMatch {
  return { event, role, location: { kind: 'unresolved' } }
}

function contextFor(
  event: SessionEvent<any>,
  state: unknown,
  kind = 'changes-result',
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

function buildNode(event: SessionEvent<any>, state: unknown): ChangesConversationViewNode | null {
  const context = contextFor(event, state)
  return changesDefinition.buildViewNode!(context)
}

function hunks(path: string, oldText: string | null, newText: string): readonly { path: string; oldText: string | null; newText: string }[] {
  return [{ path, oldText, newText }]
}

describe('changesDefinition.match', () => {
  it('starts a Context for edit/write calls', () => {
    expect(changesDefinition.match(callEvent(1, 1, 0, 'c1', 'edit'))).toEqual({ id: 'c1', role: 'start' })
    expect(changesDefinition.match(callEvent(2, 1, 0, 'c2', 'write'))).toEqual({ id: 'c2', role: 'start' })
  })

  it('ignores calls of other tools', () => {
    expect(changesDefinition.match(callEvent(3, 1, 0, 'c3', 'bash'))).toBeNull()
    expect(changesDefinition.match(callEvent(4, 1, 0, 'c4', 'read'))).toBeNull()
  })

  it('updates on any result (write-creates carry no hunks meta)', () => {
    expect(changesDefinition.match(resultEvent(5, 1, 0, 'c1', undefined))).toEqual({ id: 'c1', role: 'update' })
    expect(changesDefinition.match(resultEvent(6, 1, 0, 'c1', { diffs: hunks('a.txt', 'x', 'y') }))).toEqual({ id: 'c1', role: 'update' })
  })
})

describe('changesDefinition lifecycle', () => {
  it('settles an edit call into a hunks mutation with tool, turn, step, seq', () => {
    const call = callEvent(1, 2, 1, 'c1', 'edit', JSON.stringify({ file_path: 'src/a.ts', old_string: 'foo', new_string: 'bar' }))
    const result = resultEvent(3, 2, 1, 'c1', { diffs: hunks('src/a.ts', 'foo', 'bar') })
    const state = changesDefinition.start!(contextFor(call, undefined), match(call))
    expect(state).toEqual({ callId: 'c1', tool: 'edit', args: { filePath: 'src/a.ts', content: undefined }, result: null })
    const settled = changesDefinition.update!(contextFor(call, state), match(result, 'update'))
    const node = buildNode(call, settled)
    expect(node).not.toBeNull()
    const mutation = node!.data.mutation
    expect(mutation).toMatchObject({
      callId: 'c1', tool: 'edit', turn: 2, step: 1, seq: 3, time: 3000, path: 'src/a.ts', kind: 'hunks',
    })
    expect(mutation.hunks).toEqual(hunks('src/a.ts', 'foo', 'bar'))
  })

  it('parses unusable call args to null', () => {
    const call = callEvent(1, 1, 0, 'c1', 'edit', '{not json')
    const state = changesDefinition.start!(contextFor(call, undefined), match(call))
    expect(state.args).toBeNull()
  })

  it('parses write call args for the create path', () => {
    const call = callEvent(1, 1, 0, 'c1', 'write', JSON.stringify({ file_path: 'new.ts', content: 'export const a = 1\n' }))
    const state = changesDefinition.start!(contextFor(call, undefined), match(call))
    expect(state.args).toEqual({ filePath: 'new.ts', content: 'export const a = 1\n' })
  })

  it('projects a write-create (no hunks meta) from its call content', () => {
    const call = callEvent(1, 1, 0, 'c1', 'write', JSON.stringify({ file_path: 'new.ts', content: 'x\ny\n' }))
    const result = resultEvent(2, 1, 0, 'c1', { diffs: [] })
    const state = changesDefinition.update!(
      contextFor(call, changesDefinition.start!(contextFor(call, undefined), match(call))),
      match(result, 'update'),
    )
    const mutation = buildNode(call, state)!.data.mutation
    expect(mutation).toMatchObject({ path: 'new.ts', kind: 'create', content: 'x\ny\n', tool: 'write' })
  })

  it('keeps a pending call invisible until its result lands', () => {
    const call = callEvent(1, 1, 0, 'c1', 'edit')
    const state = changesDefinition.start!(contextFor(call, undefined), match(call))
    expect(buildNode(call, state)).toBeNull()
  })

  it('drops failed results (no mutation for an errored edit)', () => {
    const call = callEvent(1, 1, 0, 'c1', 'edit')
    const result = resultEvent(3, 1, 0, 'c1', { diffs: hunks('a.txt', 'x', 'y') }, { name: 'E', code: 'FS_IO' })
    const state = changesDefinition.update!(
      contextFor(call, changesDefinition.start!(contextFor(call, undefined), match(call))),
      match(result, 'update'),
    )
    expect(buildNode(call, state)).toBeNull()
  })

  it('recovers an orphan result (call head outside the window) with tool null', () => {
    const result = resultEvent(9, 4, 2, 'orphan', { diffs: hunks('b.txt', 'old', 'new') })
    const context = contextFor(result, undefined)
    const node = changesDefinition.buildViewNode!(context)
    expect(node).not.toBeNull()
    expect(node!.data.mutation).toMatchObject({ callId: 'orphan', tool: null, turn: 4, step: 2, path: 'b.txt', kind: 'hunks' })
  })

  it('cannot project an orphan write-create (no call args)', () => {
    const result = resultEvent(9, 4, 2, 'orphan', { diffs: [] })
    const context = contextFor(result, undefined)
    expect(changesDefinition.buildViewNode!(context)).toBeNull()
  })
})

describe('ChangesSnapshotBuilder', () => {
  function nodeFor(key: string, mutation: ChangeMutation): ChangesConversationViewNode {
    return { key, kind: 'changes-result', id: mutation.callId, target: 'changes', anchorSeq: mutation.seq, location: { kind: 'unresolved' }, data: { kind: 'change', mutation } }
  }

  function hunkMutation(key: string, callId: string, seq: number, turn: number, path: string, oldText: string | null, newText: string): ChangeMutation {
    return { key, callId, tool: 'edit', seq, time: seq * 1000, turn, step: 0, path, kind: 'hunks', hunks: hunks(path, oldText, newText) }
  }

  it('starts empty', () => {
    const builder = new ChangesSnapshotBuilder()
    expect(builder.empty).toBe(EMPTY_CHANGES_SNAPSHOT)
  })

  it('folds per-file mutations into one net file, most recently changed first', () => {
    const builder = new ChangesSnapshotBuilder()
    builder.apply({
      upserts: [
        nodeFor('k1', hunkMutation('k1', 'c1', 10, 1, 'a.txt', 'a\nb\nc', 'a\nB\nc')),
        nodeFor('k2', hunkMutation('k2', 'c2', 20, 2, 'a.txt', 'a\nB\nc', 'a\nC\nc')),
        nodeFor('k3', hunkMutation('k3', 'c3', 30, 3, 'b.txt', 'x\ny', 'x\nY')),
      ],
      timeline: EMPTY_TIMELINE,
    })
    const snapshot: ChangesSnapshot = builder.apply({ upserts: [], timeline: EMPTY_TIMELINE })
    expect(snapshot.files.map(file => file.path)).toEqual(['b.txt', 'a.txt'])
    const a = snapshot.files.find(file => file.path === 'a.txt')!
    expect(a.before).toBe('a\nb\nc\n')
    expect(a.after).toBe('a\nC\nc\n')
    expect(a.lastSeq).toBe(20)
    const b = snapshot.files.find(file => file.path === 'b.txt')!
    expect(b.after).toBe('x\nY\n')
  })

  it('replace() rebuilds deterministically (replay-safe)', () => {
    const builder = new ChangesSnapshotBuilder()
    const nodes = [
      nodeFor('k1', hunkMutation('k1', 'c1', 5, 1, 'a.txt', 'x', 'y')),
      nodeFor('k2', hunkMutation('k2', 'c2', 7, 1, 'b.txt', 'x', 'y')),
    ]
    const first = builder.replace({ nodes, timeline: EMPTY_TIMELINE })
    const second = builder.replace({ nodes: [...nodes].reverse(), timeline: EMPTY_TIMELINE })
    expect(second).toEqual(first)
  })

  it('upserting the same key replaces the mutation', () => {
    const builder = new ChangesSnapshotBuilder()
    builder.apply({ upserts: [nodeFor('k1', hunkMutation('k1', 'c1', 5, 1, 'a.txt', 'x', 'y'))], timeline: EMPTY_TIMELINE })
    builder.apply({ upserts: [nodeFor('k1', hunkMutation('k1', 'c1', 9, 1, 'a.txt', 'y', 'z'))], timeline: EMPTY_TIMELINE })
    const snapshot = builder.apply({ upserts: [], timeline: EMPTY_TIMELINE })
    expect(snapshot.files).toHaveLength(1)
    expect(snapshot.files[0]!.after).toBe('z\n')
  })
})
