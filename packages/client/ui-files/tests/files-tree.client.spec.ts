/**
 * Behavior spec for the Files tree projection: paths → sorted directory/file
 * tree, deterministic and safe on hostile input.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime).
 */
import { describe, expect, it } from 'vitest'
import { projectTree } from '../src/client/files-tree.ts'
import type { FileTreeNode } from '../src/client/files-contract.ts'

function names(nodes: readonly FileTreeNode[]): string[] {
  return nodes.map(node => node.name)
}

describe('projectTree', () => {
  it('projects a single file to one leaf', () => {
    const roots = projectTree(['a.ts'])
    expect(roots).toEqual([{ name: 'a.ts', path: 'a.ts', kind: 'file' }])
  })

  it('projects nested paths into directories with leaves', () => {
    const roots = projectTree(['a/b/c.ts', 'a/d.ts'])
    expect(roots).toHaveLength(1)
    const a = roots[0]
    expect(a.kind).toBe('dir')
    expect(a.path).toBe('a')
    expect(names(a.children ?? [])).toEqual(['b', 'd.ts'])
    const b = a.children?.[0]
    expect(b?.kind).toBe('dir')
    expect(b?.children).toEqual([{ name: 'c.ts', path: 'a/b/c.ts', kind: 'file' }])
  })

  it('sorts directories before files and each group alphabetically', () => {
    const roots = projectTree(['z.txt', 'b/d.ts', 'a/c.ts', 'm/x.ts'])
    expect(names(roots)).toEqual(['a', 'b', 'm', 'z.txt'])
  })

  it('dedupes a path appearing multiple times', () => {
    expect(projectTree(['a/b.ts', 'a/b.ts'])).toEqual([
      { name: 'a', path: 'a', kind: 'dir', children: [{ name: 'b.ts', path: 'a/b.ts', kind: 'file' }] },
    ])
  })

  it('treats a directory that is also a file path as a file leaf', () => {
    const roots = projectTree(['a', 'a/b.ts'])
    expect(roots).toEqual([{ name: 'a', path: 'a', kind: 'file' }])
  })

  it('skips empty, root, and dot segments', () => {
    expect(projectTree(['.', '/', '', './a/b.ts'])).toEqual([
      { name: 'a', path: 'a', kind: 'dir', children: [{ name: 'b.ts', path: 'a/b.ts', kind: 'file' }] },
    ])
  })

  it('keeps dotfile leaves (no extension handling here)', () => {
    expect(projectTree(['.gitignore'])).toEqual([{ name: '.gitignore', path: '.gitignore', kind: 'file' }])
  })

  it('returns no roots for an empty input', () => {
    expect(projectTree([])).toEqual([])
  })
})
