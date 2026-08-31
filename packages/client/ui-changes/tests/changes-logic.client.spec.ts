/**
 * Behavior spec for the Changes pure logic: per-file net reconstruction
 * (context-anchored patching + create folding) and the LCS net-diff rows.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime); typechecks fully under the harness tsconfig once the
 * package is dropped into packages/client/ui-changes.
 */
import { describe, expect, it } from 'vitest'
import type { ChangeMutation, ChangesFile } from '../src/client/changes-contract.ts'
import { indexOfLines, reconstructFile } from '../src/client/changes-reconstruct.ts'
import { computeNetDiff, summarizeRows, type NetDiffRow } from '../src/client/changes-diff.ts'

function mutation(seq: number, path: string, partial: Partial<ChangeMutation> = {}): ChangeMutation {
  return {
    key: `k${seq}`,
    callId: `c${seq}`,
    tool: 'edit',
    seq,
    time: seq * 1000,
    turn: 1,
    step: 0,
    path,
    kind: 'hunks',
    hunks: [],
    ...partial,
  }
}

function hunksMutation(seq: number, path: string, hunks: readonly { path: string; oldText: string | null; newText: string }[]): ChangeMutation {
  return mutation(seq, path, { kind: 'hunks', hunks })
}

function createMutation(seq: number, path: string, content: string): ChangeMutation {
  return mutation(seq, path, { kind: 'create', tool: 'write', content })
}

describe('indexOfLines', () => {
  it('finds an exact run', () => {
    expect(indexOfLines(['a', 'b', 'c'], ['b'])).toBe(1)
    expect(indexOfLines(['a', 'b', 'c'], ['a', 'b'])).toBe(0)
  })

  it('never locates an empty needle or an oversized needle', () => {
    expect(indexOfLines(['a', 'b'], [])).toBe(-1)
    expect(indexOfLines(['a'], ['a', 'b'])).toBe(-1)
  })

  it('returns -1 when absent', () => {
    expect(indexOfLines(['a', 'b'], ['c'])).toBe(-1)
  })
})

describe('reconstructFile', () => {
  it('folds a single edit into its net difference', () => {
    const file = reconstructFile('a.txt', [
      hunksMutation(1, 'a.txt', [{ path: 'a.txt', oldText: 'x\ny\nz', newText: 'x\nY\nz' }]),
    ])
    expect(file).toMatchObject({ path: 'a.txt', status: 'modified', degraded: false })
    expect(file.before).toBe('x\ny\nz\n')
    expect(file.after).toBe('x\nY\nz\n')
  })

  it('stacks later edits to the same region (net effect)', () => {
    const file = reconstructFile('a.txt', [
      hunksMutation(1, 'a.txt', [{ path: 'a.txt', oldText: 'a\nb\nc', newText: 'a\nB\nc' }]),
      hunksMutation(2, 'a.txt', [{ path: 'a.txt', oldText: 'a\nB\nc', newText: 'a\nC\nc' }]),
    ])
    expect(file.before).toBe('a\nb\nc\n')
    expect(file.after).toBe('a\nC\nc\n')
    expect(file.degraded).toBe(false)
  })

  it('appends a previously-unseen region and flags the file degraded', () => {
    const file = reconstructFile('a.txt', [
      hunksMutation(1, 'a.txt', [{ path: 'a.txt', oldText: 'one\ntwo\nthree', newText: 'one\nTWO\nthree' }]),
      // A different region of the same file: its context cannot anchor (the
      // untouched middle is invisible to the log), so it appends.
      hunksMutation(2, 'a.txt', [{ path: 'a.txt', oldText: 'four\nfive\nsix', newText: 'four\nFIVE\nsix' }]),
    ])
    expect(file.degraded).toBe(true)
    expect(file.before).toBe('one\ntwo\nthree\nfour\nfive\nsix\n')
    expect(file.after).toBe('one\nTWO\nthree\nfour\nFIVE\nsix\n')
  })

  it('folds a write-create into a created file with whole content', () => {
    const file = reconstructFile('new.ts', [
      createMutation(1, 'new.ts', 'export const a = 1\n'),
    ])
    expect(file).toMatchObject({ path: 'new.ts', status: 'created', degraded: false })
    expect(file.before).toBe('')
    expect(file.after).toBe('export const a = 1\n')
  })

  it('applies edits after a create in place (anchored by full content)', () => {
    const file = reconstructFile('new.ts', [
      createMutation(1, 'new.ts', 'const a = 1\nconst b = 2\n'),
      hunksMutation(2, 'new.ts', [{ path: 'new.ts', oldText: 'const a = 1\nconst b = 2', newText: 'const a = 1\nconst b = 3' }]),
    ])
    expect(file).toMatchObject({ status: 'created', degraded: false })
    expect(file.before).toBe('')
    expect(file.after).toBe('const a = 1\nconst b = 3\n')
    expect(file.lastSeq).toBe(2)
    expect(file.lastTurn).toBe(1)
  })

  it('handles a pure insertion hunk (no removed side)', () => {
    const file = reconstructFile('a.txt', [
      hunksMutation(1, 'a.txt', [{ path: 'a.txt', oldText: 'a\nc', newText: 'a\nb\nc' }]),
    ])
    expect(file.before).toBe('a\nc\n')
    expect(file.after).toBe('a\nb\nc\n')
  })

  it('tracks the last mutation facts for ordering', () => {
    const file = reconstructFile('a.txt', [
      hunksMutation(5, 'a.txt', [{ path: 'a.txt', oldText: 'x', newText: 'y' }]),
      hunksMutation(9, 'a.txt', [{ path: 'a.txt', oldText: 'y', newText: 'z' }]),
    ])
    expect(file).toMatchObject({ lastSeq: 9, lastTime: 9000, lastTurn: 1 })
  })

  it('is deterministic regardless of mutation input order', () => {
    const path = 'a.txt'
    const first = hunksMutation(1, path, [{ path, oldText: 'a', newText: 'b' }])
    const second = hunksMutation(2, path, [{ path, oldText: 'b', newText: 'c' }])
    const a = reconstructFile(path, [first, second])
    const b = reconstructFile(path, [second, first])
    expect(a).toEqual(b)
  })
})

describe('computeNetDiff', () => {
  function kinds(rows: readonly NetDiffRow[]): string[] {
    return rows.map(row => row.kind)
  }

  it('renders a single-line replacement with context', () => {
    const rows = computeNetDiff('a\nb\nc\n', 'a\nB\nc\n')
    expect(rows.filter(row => row.kind === 'del')).toEqual([{ kind: 'del', text: 'b' }])
    expect(rows.filter(row => row.kind === 'add')).toEqual([{ kind: 'add', text: 'B' }])
    // Context lines around the change appear as neutral rows.
    expect(rows.some(row => row.kind === 'ctx' && row.text === 'a')).toBe(true)
    expect(rows.some(row => row.kind === 'ctx' && row.text === 'c')).toBe(true)
  })

  it('renders a pure insertion and a pure deletion', () => {
    const inserted = computeNetDiff('a\nc\n', 'a\nb\nc\n')
    expect(inserted.filter(row => row.kind === 'add')).toEqual([{ kind: 'add', text: 'b' }])
    expect(inserted.filter(row => row.kind === 'del')).toHaveLength(0)
    const deleted = computeNetDiff('a\nb\nc\n', 'a\nc\n')
    expect(deleted.filter(row => row.kind === 'del')).toEqual([{ kind: 'del', text: 'b' }])
    expect(deleted.filter(row => row.kind === 'add')).toHaveLength(0)
  })

  it('renders a created file as pure additions', () => {
    const rows = computeNetDiff('', 'x\ny\n')
    expect(kinds(rows)).toEqual(['add', 'add'])
    expect(rows.map(row => row.text)).toEqual(['x', 'y'])
  })

  it('separates distant regions with a gap row', () => {
    const rows = computeNetDiff(
      'a\nb\nc\nd\ne\nf\ng\nh\n',
      'a\nB\nc\nd\ne\nf\ng\nH\n',
    )
    expect(kinds(rows)).toContain('gap')
    expect(rows.filter(row => row.kind === 'del').map(row => row.text)).toEqual(['b', 'h'])
    expect(rows.filter(row => row.kind === 'add').map(row => row.text)).toEqual(['B', 'H'])
  })

  it('returns nothing for identical texts', () => {
    expect(computeNetDiff('same\n', 'same\n')).toEqual([])
  })

  it('falls back to one unaligned replace region for oversized inputs', () => {
    const big = Array.from({ length: 600 }, (_, i) => `line${i}`).join('\n') + '\n'
    const rows = computeNetDiff(big, big + 'tail\n')
    expect(rows.filter(row => row.kind === 'del')).toHaveLength(600)
    expect(rows.filter(row => row.kind === 'add')).toHaveLength(601)
  })

  it('summarizes added/removed counts', () => {
    const rows = computeNetDiff('a\nb\nc\n', 'a\nB\nd\nc\n')
    expect(summarizeRows(rows)).toEqual({ added: 2, removed: 1 })
  })
})
