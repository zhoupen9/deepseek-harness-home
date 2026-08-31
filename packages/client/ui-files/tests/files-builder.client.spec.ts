/**
 * Behavior spec for the Files Definition and snapshot builder: synthetic
 * tool/call + tool/result events (write-creates, edit hunks, read windows,
 * failures, orphan results) project to per-file facts and the published tree
 * + content snapshot, replay-safe and idempotent.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime).
 */
import { describe, expect, it } from 'vitest'
import type { ConversationMatch, ConversationNodeContext } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { filesDefinition } from '../src/client/files-definition.ts'
import { FilesSnapshotBuilder } from '../src/client/files-snapshot-builder.ts'
import type {
  FilesConversationViewNode, FilesMutation, FilesRead, FilesSnapshot,
} from '../src/client/files-contract.ts'
import { EMPTY_FILES_SNAPSHOT } from '../src/client/files-contract.ts'

type ToolResultEvent = SessionEvent<'tool/result'>
type ToolCallEvent = SessionEvent<'tool/call'>

const EMPTY_TIMELINE = { turnOrder: [], turns: new Map() } as const

function callEvent(
  seq: number, turn: number, step: number, callId: string, name: string, args = '{}',
): ToolCallEvent {
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
  kind = 'files-fact',
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

function buildNode(event: SessionEvent<any>, state: unknown): FilesConversationViewNode | null {
  const context = contextFor(event, state)
  return filesDefinition.buildViewNode!(context)
}

function hunks(path: string, oldText: string | null, newText: string): readonly { path: string; oldText: string | null; newText: string }[] {
  return [{ path, oldText, newText }]
}

describe('filesDefinition.match', () => {
  it('starts a Context for file-touching calls', () => {
    expect(filesDefinition.match(callEvent(1, 1, 0, 'c1', 'edit'))).toEqual({ id: 'c1', role: 'start' })
    expect(filesDefinition.match(callEvent(2, 1, 0, 'c2', 'write'))).toEqual({ id: 'c2', role: 'start' })
    expect(filesDefinition.match(callEvent(3, 1, 0, 'c3', 'read'))).toEqual({ id: 'c3', role: 'start' })
    expect(filesDefinition.match(callEvent(4, 1, 0, 'c4', 'str_replace_editor'))).toEqual({ id: 'c4', role: 'start' })
  })

  it('ignores calls of other tools', () => {
    expect(filesDefinition.match(callEvent(5, 1, 0, 'c5', 'bash'))).toBeNull()
  })

  it('updates on any result so create/read settlements reach their starts', () => {
    expect(filesDefinition.match(resultEvent(6, 1, 0, 'c1', undefined))).toEqual({ id: 'c1', role: 'update' })
  })
})

describe('filesDefinition lifecycle (mutations)', () => {
  it('settles an edit call into a hunks mutation', () => {
    const call = callEvent(1, 2, 1, 'c1', 'edit', JSON.stringify({ file_path: 'src/a.ts', old_string: 'foo', new_string: 'bar' }))
    const result = resultEvent(3, 2, 1, 'c1', { diffs: hunks('src/a.ts', 'foo', 'bar') })
    const state = filesDefinition.start!(contextFor(call, undefined), match(call))
    expect(state).toEqual({
      callId: 'c1', tool: 'edit',
      args: { filePath: 'src/a.ts', content: undefined, oldText: undefined, newText: undefined },
      result: null,
    })
    const settled = filesDefinition.update!(contextFor(call, state), match(result, 'update'))
    const node = buildNode(call, settled)
    expect(node).not.toBeNull()
    expect(node!.data.kind).toBe('mutation')
    const mutation = (node!.data as { mutation: FilesMutation }).mutation
    expect(mutation).toMatchObject({
      callId: 'c1', tool: 'edit', turn: 2, step: 1, seq: 3, time: 3000, path: 'src/a.ts', kind: 'hunks',
    })
    expect(mutation.hunks).toEqual(hunks('src/a.ts', 'foo', 'bar'))
  })

  it('projects a write-create (no hunks meta) from its call content', () => {
    const call = callEvent(1, 1, 0, 'c1', 'write', JSON.stringify({ file_path: 'new.ts', content: 'x\ny\n' }))
    const result = resultEvent(2, 1, 0, 'c1', { diffs: [] })
    const state = filesDefinition.update!(
      contextFor(call, filesDefinition.start!(contextFor(call, undefined), match(call))),
      match(result, 'update'),
    )
    const node = buildNode(call, state)
    expect(node!.data.kind).toBe('mutation')
    expect((node!.data as { mutation: FilesMutation }).mutation).toMatchObject({
      path: 'new.ts', kind: 'create', content: 'x\ny\n',
    })
  })

  it('projects a failed result to null', () => {
    const call = callEvent(1, 1, 0, 'c1', 'edit', JSON.stringify({ file_path: 'a.ts' }))
    const result = resultEvent(2, 1, 0, 'c1', undefined, { name: 'E', code: 'X' })
    const state = filesDefinition.update!(
      contextFor(call, filesDefinition.start!(contextFor(call, undefined), match(call))),
      match(result, 'update'),
    )
    expect(buildNode(call, state)).toBeNull()
  })

  it('projects an orphan hunk result (call head outside the window)', () => {
    const result = resultEvent(9, 3, 0, 'orphan', { diffs: hunks('late.ts', 'a', 'b') })
    const state = filesDefinition.update!(contextFor(result, undefined), match(result, 'update'))
    const node = buildNode(result, state)
    expect(node).not.toBeNull()
    expect((node!.data as { mutation: FilesMutation }).mutation).toMatchObject({ tool: null, path: 'late.ts', kind: 'hunks' })
  })
})

describe('filesDefinition lifecycle (reads)', () => {
  it('settles a read call into a read window node', () => {
    const call = callEvent(4, 2, 0, 'r1', 'read', JSON.stringify({ file_path: 'b.txt' }))
    const result = resultEvent(5, 2, 0, 'r1', { path: 'b.txt', offset: 1, lines: [{ number: 1, text: 'one' }], totalLines: 1 })
    const state = filesDefinition.update!(
      contextFor(call, filesDefinition.start!(contextFor(call, undefined), match(call))),
      match(result, 'update'),
    )
    const node = buildNode(call, state)
    expect(node).not.toBeNull()
    expect(node!.data.kind).toBe('read')
    const readNode = (node!.data as { read: FilesRead }).read
    expect(readNode).toMatchObject({ callId: 'r1', path: 'b.txt', offset: 1, totalLines: 1, turn: 2, step: 0 })
    expect(readNode.lines).toEqual([{ number: 1, text: 'one' }])
  })

  it('ignores malformed read meta', () => {
    const call = callEvent(4, 2, 0, 'r2', 'read', JSON.stringify({ file_path: 'b.txt' }))
    const result = resultEvent(5, 2, 0, 'r2', { path: 'b.txt', offset: 'nope', lines: [], totalLines: 0 })
    const state = filesDefinition.update!(
      contextFor(call, filesDefinition.start!(contextFor(call, undefined), match(call))),
      match(result, 'update'),
    )
    expect(buildNode(call, state)).toBeNull()
  })
})

describe('FilesSnapshotBuilder', () => {
  function nodeFor(fact: FilesConversationViewNode['data'], seq: number): FilesConversationViewNode {
    return {
      key: `n${seq}`,
      kind: 'files-fact',
      id: `id${seq}`,
      target: 'files',
      anchorSeq: seq,
      location: { kind: 'unresolved' },
      data: fact,
    }
  }
  const mutationFact: FilesMutation = {
    key: 'm1', callId: 'c1', tool: 'write', seq: 1, time: 1000, turn: 1, step: 0,
    path: 'pkg/a.ts', kind: 'create', content: 'export const a = 1\n',
  }
  const readFact: FilesRead = {
    key: 'r1', callId: 'c2', seq: 2, time: 2000, turn: 1, step: 1,
    path: 'pkg/readme.txt', offset: 1, lines: [{ number: 1, text: 'hi' }], totalLines: 1,
  }

  it('starts from the empty snapshot', () => {
    const builder = new FilesSnapshotBuilder()
    expect(builder.empty).toBe(EMPTY_FILES_SNAPSHOT)
    expect(builder.replace({ nodes: [], timeline: EMPTY_TIMELINE })).toEqual({ roots: [], files: new Map() })
  })

  it('assembles tree + files from mutation and read nodes', () => {
    const builder = new FilesSnapshotBuilder()
    const snapshot: FilesSnapshot = builder.replace({
      nodes: [
        nodeFor({ kind: 'mutation', mutation: mutationFact }, 1),
        nodeFor({ kind: 'read', read: readFact }, 2),
      ],
      timeline: EMPTY_TIMELINE,
    })
    expect([...snapshot.files.keys()].sort()).toEqual(['pkg/a.ts', 'pkg/readme.txt'])
    expect(snapshot.files.get('pkg/a.ts')?.content).toBe('export const a = 1\n')
    expect(snapshot.files.get('pkg/readme.txt')?.status).toBe('read')
    expect(snapshot.roots).toEqual([{
      name: 'pkg', path: 'pkg', kind: 'dir',
      children: [
        { name: 'a.ts', path: 'pkg/a.ts', kind: 'file' },
        { name: 'readme.txt', path: 'pkg/readme.txt', kind: 'file' },
      ],
    }])
  })

  it('replace is idempotent and apply upserts fold in', () => {
    const builder = new FilesSnapshotBuilder()
    const first = builder.replace({ nodes: [nodeFor({ kind: 'mutation', mutation: mutationFact }, 1)], timeline: EMPTY_TIMELINE })
    const again = builder.replace({ nodes: [nodeFor({ kind: 'mutation', mutation: mutationFact }, 1)], timeline: EMPTY_TIMELINE })
    expect(again.files.get('pkg/a.ts')?.content).toBe(first.files.get('pkg/a.ts')?.content)
    const applied = builder.apply({ upserts: [nodeFor({ kind: 'read', read: readFact }, 2)], timeline: EMPTY_TIMELINE })
    expect(applied.files.has('pkg/readme.txt')).toBe(true)
  })
})
