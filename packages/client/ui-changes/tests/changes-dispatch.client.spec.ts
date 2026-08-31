/**
 * Behavior spec for the Changes Definition's PTC-mode (`run_code`) path:
 * nested `tool/code-dispatch-start` / `tool/code-dispatch` events carry
 * already-parsed argument objects (no result `meta`), so the mutation is
 * reconstructed from the dispatch arguments exactly like the chat diff card.
 */
import { describe, expect, it } from 'vitest'
import type { ConversationMatch, ConversationNodeContext } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { changesDefinition } from '../src/client/changes-definition.ts'
import type { ChangesConversationViewNode } from '../src/client/changes-contract.ts'

type CodeDispatchStartEvent = SessionEvent<'tool/code-dispatch-start'>
type CodeDispatchEvent = SessionEvent<'tool/code-dispatch'>

function dispatchStartEvent(seq: number, subCallId: string, name: string, args: Record<string, unknown>): CodeDispatchStartEvent {
  return {
    type: 'tool/code-dispatch-start', seq, time: seq * 1000,
    data: { rootCallId: 'root' as never, parentCallId: 'parent' as never, subCallId: subCallId as never, name, arguments: args },
  } as CodeDispatchStartEvent
}

function dispatchEvent(seq: number, subCallId: string, name: string, args: Record<string, unknown>, isError = false): CodeDispatchEvent {
  return {
    type: 'tool/code-dispatch', seq, time: seq * 1000,
    data: { rootCallId: 'root' as never, parentCallId: 'parent' as never, subCallId: subCallId as never, name, arguments: args, isError, content: [] },
  } as CodeDispatchEvent
}

function match(event: SessionEvent<any>, role: 'start' | 'update' = 'start'): ConversationMatch {
  return { event, role, location: { kind: 'unresolved' } }
}

function contextFor(event: SessionEvent<any>, state: unknown): ConversationNodeContext<unknown> {
  const id = String(event.seq)
  return {
    key: `15:changes-result${id}`,
    kind: 'changes-result',
    id,
    matches: [match(event)],
    start: { event, role: 'start', location: { kind: 'unresolved' } },
    state,
    current: new Map(),
  }
}

function buildNode(event: SessionEvent<any>, state: unknown): ChangesConversationViewNode | null {
  return changesDefinition.buildViewNode!(contextFor(event, state))
}

describe('changesDefinition code-dispatch (PTC mode)', () => {
  it('starts and updates on nested edit/write dispatches', () => {
    expect(changesDefinition.match(dispatchStartEvent(1, 's1', 'edit', { file_path: 'a.ts' }))).toEqual({ id: 's1', role: 'start' })
    expect(changesDefinition.match(dispatchEvent(2, 's1', 'edit', { file_path: 'a.ts' }))).toEqual({ id: 's1', role: 'update' })
    expect(changesDefinition.match(dispatchStartEvent(3, 's2', 'write', { file_path: 'b.ts' }))).toEqual({ id: 's2', role: 'start' })
  })

  it('ignores non-file dispatch names', () => {
    expect(changesDefinition.match(dispatchStartEvent(1, 's1', 'bash', {}))).toBeNull()
    expect(changesDefinition.match(dispatchEvent(2, 's1', 'bash', {}))).toBeNull()
    expect(changesDefinition.match(dispatchStartEvent(3, 's1', 'read', {}))).toBeNull()
  })

  it('projects a nested edit dispatch from its arguments', () => {
    const start = dispatchStartEvent(1, 's1', 'edit', { file_path: 'src/a.ts', old_string: 'foo', new_string: 'bar' })
    const settle = dispatchEvent(2, 's1', 'edit', { file_path: 'src/a.ts', old_string: 'foo', new_string: 'bar' })
    const state = changesDefinition.start!(contextFor(start, undefined), match(start))
    const settled = changesDefinition.update!(contextFor(start, state), match(settle, 'update'))
    const node = buildNode(start, settled)
    expect(node).not.toBeNull()
    expect(node!.data.mutation).toMatchObject({ path: 'src/a.ts', kind: 'hunks', tool: 'edit' })
    expect(node!.data.mutation.hunks).toEqual([{ path: 'src/a.ts', oldText: 'foo', newText: 'bar' }])
  })

  it('projects a nested write dispatch as a create from its content', () => {
    const start = dispatchStartEvent(1, 's1', 'write', { file_path: 'new.ts', content: 'x\ny\n' })
    const settle = dispatchEvent(2, 's1', 'write', { file_path: 'new.ts', content: 'x\ny\n' })
    const state = changesDefinition.start!(contextFor(start, undefined), match(start))
    const settled = changesDefinition.update!(contextFor(start, state), match(settle, 'update'))
    const node = buildNode(start, settled)
    expect(node).not.toBeNull()
    expect(node!.data.mutation).toMatchObject({ path: 'new.ts', kind: 'create', content: 'x\ny\n', tool: 'write' })
  })

  it('drops failed dispatches (isError)', () => {
    const start = dispatchStartEvent(1, 's1', 'edit', { file_path: 'a.ts', old_string: 'x', new_string: 'y' })
    const settle = dispatchEvent(2, 's1', 'edit', { file_path: 'a.ts', old_string: 'x', new_string: 'y' }, true)
    const state = changesDefinition.start!(contextFor(start, undefined), match(start))
    const settled = changesDefinition.update!(contextFor(start, state), match(settle, 'update'))
    expect(buildNode(start, settled)).toBeNull()
  })

  it('keeps a pending dispatch invisible until it settles', () => {
    const start = dispatchStartEvent(1, 's1', 'edit', { file_path: 'a.ts', old_string: 'x', new_string: 'y' })
    const state = changesDefinition.start!(contextFor(start, undefined), match(start))
    expect(buildNode(start, state)).toBeNull()
  })
})
