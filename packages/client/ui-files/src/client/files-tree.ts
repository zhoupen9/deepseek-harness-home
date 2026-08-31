/**
 * Path list → directory tree projection for the Files view. Pure and
 * deterministic: directories precede files, each level sorts alphabetically,
 * dotfiles are leaves.
 * @module @deepseek-ai/dsh-client-ui-files/client
 */
import type { FileTreeNode } from './files-contract.ts'

/** A mutable tree node used during projection. */
interface MutableNode {
  readonly name: string
  readonly path: string
  readonly children: Map<string, MutableNode>
  file: boolean
}

function leaf(name: string, path: string): FileTreeNode {
  return { name, path, kind: 'file' }
}

function directory(node: MutableNode): FileTreeNode {
  const entries = [...node.children.values()]
    .sort((left, right) => {
      if (left.file !== right.file) return left.file ? 1 : -1
      return left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    })
    .map(child => child.file ? leaf(child.name, child.path) : directory(child))
  return { name: node.name, path: node.path, kind: 'dir', children: entries }
}

/**
 * Project a set of file paths into a tree of directories and file leaves.
 * A path like `a/b/c.ts` contributes directories `a`, `a/b` and the leaf
 * `a/b/c.ts`. A directory that is itself also a known file path resolves to a
 * file leaf (files win over directories at the same path).
 * @param paths - the model-facing paths.
 * @returns the top-level entries, sorted.
 */
export function projectTree(paths: Iterable<string>): FileTreeNode[] {
  const root = new Map<string, MutableNode>()
  for (const path of paths) {
    if (path.length === 0 || path === '.' || path === '/') continue
    const segments = path.split('/').filter(segment => segment.length > 0 && segment !== '.')
    let level = root
    let accumulated = ''
    for (const [index, segment] of segments.entries()) {
      accumulated = accumulated === '' ? segment : accumulated + '/' + segment
      const last = index === segments.length - 1
      let node = level.get(segment)
      if (node === undefined) {
        node = { name: segment, path: accumulated, children: new Map(), file: last }
        level.set(segment, node)
      } else if (last) {
        node.file = true
      }
      level = node.children
    }
  }
  const entries = [...root.values()]
    .sort((left, right) => {
      if (left.file !== right.file) return left.file ? 1 : -1
      return left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    })
    .map(child => child.file ? leaf(child.name, child.path) : directory(child))
  return entries
}
