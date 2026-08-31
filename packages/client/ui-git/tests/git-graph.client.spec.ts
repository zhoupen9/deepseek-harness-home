/**
 * Behavior spec for the Git graph pure logic: column assignment (first parent
 * continues a lane, later parents branch right, merge targets reuse their
 * reserved lane, dangling parents keep a reserved lane) and edge routing
 * (straight, rightward branch, leftward merge).
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime); typechecks fully under the harness tsconfig once the
 * package is dropped into packages/client/ui-git.
 */
import { describe, expect, it } from 'vitest'
import type { GitCommit } from '../src/client/git-contract.ts'
import { layoutGitGraph, routeEdge } from '../src/client/git-graph.ts'

function commit(hash: string, parents: readonly string[] = [], extra: Partial<GitCommit> = {}): GitCommit {
  return {
    hash,
    parents,
    authorName: 'author',
    authorEmail: 'author@example.com',
    authorTime: 0,
    subject: hash,
    refs: [],
    ...extra,
  }
}

describe('routeEdge', () => {
  it('routes a same-column edge straight down', () => {
    expect(routeEdge({ column: 0, row: 0 }, { column: 0, row: 2 })).toEqual([
      { column: 0, row: 0 },
      { column: 0, row: 2 },
    ])
  })

  it('routes a rightward branch horizontally then down', () => {
    expect(routeEdge({ column: 0, row: 0 }, { column: 2, row: 1 })).toEqual([
      { column: 0, row: 0 },
      { column: 2, row: 0 },
      { column: 2, row: 1 },
    ])
  })

  it('routes a leftward merge down then horizontally', () => {
    expect(routeEdge({ column: 2, row: 0 }, { column: 0, row: 1 })).toEqual([
      { column: 2, row: 0 },
      { column: 2, row: 1 },
      { column: 0, row: 1 },
    ])
  })
})

describe('layoutGitGraph', () => {
  it('keeps a linear history in one column with straight edges', () => {
    const layout = layoutGitGraph([
      commit('A', ['B']),
      commit('B', ['C']),
      commit('C'),
    ])
    expect(layout.width).toBe(1)
    expect(layout.nodes.map(node => node.column)).toEqual([0, 0, 0])
    expect(layout.edges).toEqual([
      { points: [{ column: 0, row: 0 }, { column: 0, row: 1 }] },
      { points: [{ column: 0, row: 1 }, { column: 0, row: 2 }] },
    ])
  })

  it('branches a second parent right and merges it back into the first-parent lane', () => {
    const layout = layoutGitGraph([
      commit('A', ['B', 'C']),
      commit('B', ['D']),
      commit('C', ['D']),
      commit('D'),
    ])
    expect(layout.nodes.map(node => [node.hash, node.column])).toEqual([
      ['A', 0], ['B', 0], ['C', 1], ['D', 0],
    ])
    expect(layout.edges).toEqual([
      { points: [{ column: 0, row: 0 }, { column: 0, row: 1 }] },
      { points: [{ column: 0, row: 0 }, { column: 1, row: 0 }, { column: 1, row: 2 }] },
      { points: [{ column: 0, row: 1 }, { column: 0, row: 3 }] },
      { points: [{ column: 1, row: 2 }, { column: 1, row: 3 }, { column: 0, row: 3 }] },
    ])
    expect(layout.width).toBe(2)
  })

  it('dangles a parent outside the window off the bottom of its lane', () => {
    const layout = layoutGitGraph([
      commit('A', ['B']),
      commit('B', ['MISSING']),
    ])
    expect(layout.width).toBe(1)
    expect(layout.edges[1]).toEqual({
      points: [{ column: 0, row: 1 }, { column: 0, row: 2 }],
    })
  })

  it('reuses one reserved lane when two children share a parent', () => {
    const layout = layoutGitGraph([
      commit('A', ['C']),
      commit('B', ['C']),
      commit('C'),
    ])
    // A and B each open their own lane; both point at C, which takes A's lane.
    expect(layout.nodes.map(node => [node.hash, node.column])).toEqual([
      ['A', 0], ['B', 1], ['C', 0],
    ])
    expect(layout.edges[1]).toEqual({
      points: [{ column: 1, row: 1 }, { column: 1, row: 2 }, { column: 0, row: 2 }],
    })
  })
})
