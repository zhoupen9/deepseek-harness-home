/**
 * Pure lane-and-edge layout for the Git view: given commits newest-first with
 * parent links, assign each commit a column and route every parent edge as a
 * straight or L-shaped polyline. Fully deterministic and replayable — the view
 * renders exactly what this function returns, with no hidden state.
 * @module @deepseek-ai/dsh-client-ui-git/client
 */
import type { GitCommit } from './git-contract.ts'

/** One node position in grid units (column, row; row 0 is the newest commit). */
export interface GitGraphNode {
  readonly hash: string
  readonly row: number
  readonly column: number
}

/** One grid-space point on a routed edge. */
export interface GitGraphPoint {
  readonly column: number
  readonly row: number
}

/** One routed edge from a commit node to one of its parent nodes. */
export interface GitGraphEdge {
  /** Polyline in grid units; the first point is the child node, the last the parent. */
  readonly points: readonly GitGraphPoint[]
}

/** The whole layout: nodes and routed edges, plus the total column count. */
export interface GitGraphLayout {
  readonly width: number
  readonly nodes: readonly GitGraphNode[]
  readonly edges: readonly GitGraphEdge[]
}

/**
 * Route one edge between two grid points. A same-column edge is a straight
 * vertical line; a rightward branch (child left of parent) is horizontal at the
 * child row then vertical down; a leftward merge (child right of parent) is
 * vertical down the child column then horizontal at the parent row.
 * @param from - child node grid position.
 * @param to - parent node grid position.
 * @returns the routed polyline points.
 */
export function routeEdge(
  from: GitGraphPoint,
  to: GitGraphPoint,
): readonly GitGraphPoint[] {
  if (from.column === to.column) {
    return [from, to]
  }
  if (from.column < to.column) {
    return [
      from,
      { column: to.column, row: from.row },
      to,
    ]
  }
  return [
    from,
    { column: from.column, row: to.row },
    to,
  ]
}

/**
 * Assign a column to every commit (newest first) and route every parent edge.
 * The first parent of a commit continues that commit's column (a straight
 * vertical line); later parents branch to fresh columns to the right; a commit
 * already reserved as some earlier commit's parent reuses its reserved column
 * (a branch merges back). A parent whose commit lies outside the window keeps
 * its reserved column, so its edge still dangles cleanly off the bottom.
 * @param commits - the requested window, newest first.
 * @returns the layout with routed edges.
 */
export function layoutGitGraph(commits: readonly GitCommit[]): GitGraphLayout {
  const rowByHash = new Map<string, number>()
  commits.forEach((commit, row) => { rowByHash.set(commit.hash, row) })

  const columnByHash = new Map<string, number>()
  let nextColumn = 0

  const nodes: GitGraphNode[] = []
  const edges: GitGraphEdge[] = []

  commits.forEach((commit, row) => {
    let column = columnByHash.get(commit.hash)
    if (column === undefined) {
      column = nextColumn++
      columnByHash.set(commit.hash, column)
    }
    nodes.push({ hash: commit.hash, row, column })

    commit.parents.forEach((parentHash, parentIndex) => {
      let parentColumn = columnByHash.get(parentHash)
      if (parentColumn === undefined) {
        // First parent continues this commit's column (straight line);
        // later parents branch right into fresh columns.
        parentColumn = parentIndex === 0 ? column : nextColumn++
        columnByHash.set(parentHash, parentColumn)
      }
      const parentRow = rowByHash.get(parentHash) ?? row + 1
      edges.push({
        points: routeEdge(
          { column, row },
          { column: parentColumn, row: parentRow },
        ),
      })
    })
  })

  return { width: nextColumn, nodes, edges }
}
