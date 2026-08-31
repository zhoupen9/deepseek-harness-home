/**
 * Behavior spec for the Files reconstruction: mutation folding into one
 * current document per file, and read-window fallback for read-only files.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime).
 */
import { describe, expect, it } from 'vitest'
import type { FilesMutation, FilesRead } from '../src/client/files-contract.ts'
import {
  foldMutations,
  reconstructFile,
  reconstructReadFile,
} from '../src/client/files-reconstruct.ts'

function mutation(partial: Partial<FilesMutation> & { path: string; seq: number }): FilesMutation {
  return {
    key: `k${partial.seq}`,
    callId: `c${partial.seq}`,
    tool: partial.tool ?? 'edit',
    seq: partial.seq,
    time: partial.seq * 1000,
    turn: 1,
    step: partial.seq,
    path: partial.path,
    kind: partial.kind ?? 'hunks',
    ...(partial.kind === 'create' ? { content: partial.content } : {}),
    ...(partial.hunks === undefined ? {} : { hunks: partial.hunks }),
  }
}

describe('reconstructFile / foldMutations', () => {
  it('write-create seeds the whole document', () => {
    const file = reconstructFile('a.ts', [
      mutation({ path: 'a.ts', seq: 1, kind: 'create', content: 'line1\nline2\n' }),
    ])
    expect(file.status).toBe('created')
    expect(file.content).toBe('line1\nline2\n')
    expect(file.totalLines).toBe(2)
    expect(file.partial).toBe(false)
    expect(file.lastSeq).toBe(1)
  })

  it('edit hunks apply in seq order', () => {
    const file = reconstructFile('a.ts', [
      mutation({ path: 'a.ts', seq: 2, hunks: [{ path: 'a.ts', oldText: 'old\n', newText: 'new\n' }] }),
      mutation({ path: 'a.ts', seq: 3, hunks: [{ path: 'a.ts', oldText: 'new\n', newText: 'final\n' }] }),
    ])
    expect(file.content).toBe('final\n')
    expect(file.status).toBe('modified')
    expect(file.partial).toBe(false)
    expect(file.lastSeq).toBe(3)
  })

  it('unanchored hunks append as standalone regions flagged degraded', () => {
    const file = reconstructFile('a.ts', [
      mutation({ path: 'a.ts', seq: 4, hunks: [{ path: 'a.ts', oldText: 'first\n', newText: 'one\n' }] }),
      mutation({ path: 'a.ts', seq: 5, hunks: [{ path: 'a.ts', oldText: 'missing\n', newText: 'two\n' }] }),
    ])
    expect(file.content).toBe('one\ntwo\n')
    expect(file.partial).toBe(true)
  })

  it('a later write-create resets the document', () => {
    const file = reconstructFile('a.ts', [
      mutation({ path: 'a.ts', seq: 6, hunks: [{ path: 'a.ts', oldText: 'x\n', newText: 'y\n' }] }),
      mutation({ path: 'a.ts', seq: 7, kind: 'create', content: 'fresh\n' }),
    ])
    expect(file.content).toBe('fresh\n')
    expect(file.status).toBe('created')
  })

  it('empty mutation stream reconstructs an empty file', () => {
    const file = reconstructFile('a.ts', [])
    expect(file.content).toBe('')
    expect(file.totalLines).toBe(0)
  })
})

function read(partial: Partial<FilesRead> & { seq: number }): FilesRead {
  return {
    key: `r${partial.seq}`,
    callId: `c${partial.seq}`,
    seq: partial.seq,
    time: partial.seq * 1000,
    turn: 1,
    step: partial.seq,
    path: partial.path ?? 'b.txt',
    offset: partial.offset ?? 1,
    lines: partial.lines ?? [],
    totalLines: partial.totalLines ?? 0,
  }
}

describe('reconstructReadFile', () => {
  it('uses the last read window as content', () => {
    const file = reconstructReadFile('b.txt', [
      read({ seq: 8, lines: [{ number: 1, text: 'one' }], totalLines: 1 }),
    ])
    expect(file?.status).toBe('read')
    expect(file?.content).toBe('one\n')
    expect(file?.partial).toBe(false)
  })

  it('flags a partial window', () => {
    const file = reconstructReadFile('b.txt', [
      read({ seq: 9, offset: 10, lines: [{ number: 10, text: 'ten' }], totalLines: 100 }),
    ])
    expect(file?.partial).toBe(true)
    expect(file?.totalLines).toBe(100)
  })

  it('returns null when no usable window exists', () => {
    expect(reconstructReadFile('b.txt', [read({ seq: 10, lines: [], totalLines: 5 })])).toBeNull()
    expect(reconstructReadFile('b.txt', [])).toBeNull()
  })
})
