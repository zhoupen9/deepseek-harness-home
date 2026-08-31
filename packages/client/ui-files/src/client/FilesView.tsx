/**
 * Files view: the workspace explorer tab. When the host workspaceFiles remote
 * is present (see HOST_PRIMITIVES.md), this renders the live directories-
 * and-files explorer; otherwise it falls back to the session-known
 * reconstruction (files the session wrote, edited, or read). Both surfaces
 * share the FileContentPane. Chat file-link clicks and view-request focuses
 * reveal and select the target file in both session-known and live modes.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { FilesFile, FileOpenRequest, FileTreeNode } from './files-contract.ts'
import type { WorkspaceFilesRemote } from './files-remote.ts'
import { FilesExplorer } from './FilesExplorer.tsx'
import { FileContentPane } from './FileContentPane.tsx'
import type { FilesTranslate } from './locales.ts'
import { NS } from './locales.ts'
import css from './FilesView.module.css'

/** Session-bound controls not already supplied by the conversation view slot. */
export interface FilesViewInjected {
  /** Pull one older history page; resolves whether the Files window changed. */
  loadOlder: () => Promise<boolean>
  /** Root-scoped chat file-link open requests (this plugin's queue). */
  openRequests: ObservableSnapshot<FileOpenRequest | null>
  /** The host workspace-files remote, or undefined before the host implements it. */
  workspaceFiles: WorkspaceFilesRemote | undefined
  /** Resolve a session's absolute workspace root (cwd), or undefined. */
  workspaceRoot: (sessionId: SessionId) => string | undefined
}

/** Every ancestor directory path of `path` (`a/b/c.ts` -> `a`, `a/b`). */
function ancestorsOf(path: string): readonly string[] {
  const out: string[] = []
  const segments = path.split('/')
  let accumulated = ''
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (segment === '' || segment === '.') continue
    accumulated = accumulated === '' ? segment : accumulated + '/' + segment
    out.push(accumulated)
  }
  return out
}

/** First file path in snapshot insertion order (stable per snapshot). */
function firstFilePath(files: ReadonlyMap<string, unknown>): string | undefined {
  return files.keys().next().value as string | undefined
}

/** Localized status badge for a session-known file. */
export function statusLabel(t: FilesTranslate, status: FilesFile['status']): string {
  if (status === 'created') return t('status.created')
  if (status === 'modified') return t('status.modified')
  return t('status.read')
}

/** One tree row: a directory toggle or a selectable file leaf (session-known mode). */
function TreeRow({
  node, depth, selectedPath, expanded, onSelect, onToggle, t,
}: {
  node: FileTreeNode
  depth: number
  selectedPath: string | null
  expanded: ReadonlySet<string>
  onSelect: (path: string) => void
  onToggle: (path: string) => void
  t: FilesTranslate
}) {
  const isDir = node.kind === 'dir'
  const open = expanded.has(node.path)
  const selected = !isDir && selectedPath === node.path
  return (
    <>
      <button
        type="button"
        role="treeitem"
        aria-expanded={isDir ? open : undefined}
        aria-label={isDir ? t('tree.directory') : t('tree.file')}
        className={selected ? `${css.row} ${css.rowSelected}` : css.row}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => { if (isDir) { onToggle(node.path) } else { onSelect(node.path) } }}
      >
        <span className={css.caret} aria-hidden>{isDir ? (open ? '▾' : '▸') : ''}</span>
        <span className={isDir ? css.dirName : css.fileName}>{node.name}</span>
      </button>
      {isDir && open && (node.children ?? []).map(child => (
        <TreeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
          t={t}
        />
      ))}
    </>
  )
}

/**
 * The Files view slot entry: pure component over the composed props.
 * @param props - conversation view runtime, injected face, and locale seat.
 * @returns the explorer element (live or session-known).
 */
export function FilesView({
  useFiles, useSession, sessionId, viewRequest, completeViewRequest, loadOlder, openRequests, workspaceFiles, workspaceRoot, t,
}: ConvViewProps & InjectFace<FilesViewInjected> & PropsLocale<typeof NS>) {
  const snapshot = useFiles(value => value)
  const hasMore = useSession(value => value.hasMore)
  const loadingOlder = useSession(value => value.loadingOlder)
  const request = useSyncExternalStore(
    openRequests.subscribe,
    openRequests.getSnapshot,
    openRequests.getSnapshot,
  )
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const consumedNonce = useRef(0)

  // A chat file-link click for THIS session selects the file and expands its
  // ancestors the moment the view mounts (or when a new request lands while
  // mounted). The nonce guard makes repeated clicks on the same path re-open.
  useEffect(() => {
    if (request === null || request.sessionId !== sessionId || request.nonce <= consumedNonce.current) return
    consumedNonce.current = request.nonce
    setSelectedPath(request.path)
    setExpanded(prev => new Set([...prev, ...ancestorsOf(request.path)]))
  }, [request, sessionId])

  // The platform's one-shot view-request focus (openView('files', path)) is
  // honored exactly like the Trajectory view honors its callId focus.
  useEffect(() => {
    if (viewRequest === null || viewRequest.view !== 'files') return
    setSelectedPath(viewRequest.focus)
    setExpanded(prev => new Set([...prev, ...ancestorsOf(viewRequest.focus)]))
    completeViewRequest()
  }, [viewRequest, completeViewRequest])

  // First selection: pick the first known file so the pane is never blank
  // once the session has touched files.
  useEffect(() => {
    if (selectedPath !== null || snapshot.files.size === 0) return
    const first = firstFilePath(snapshot.files)
    if (first !== undefined) {
      setSelectedPath(first)
      setExpanded(prev => new Set([...prev, ...ancestorsOf(first)]))
    }
  }, [snapshot, selectedPath])

  const selected = useMemo(
    () => selectedPath === null ? undefined : snapshot.files.get(selectedPath),
    [snapshot, selectedPath],
  )

  // Live explorer path: the host remote is present and this session names a root.
  const liveRoot = workspaceFiles === undefined ? undefined : workspaceRoot(sessionId)
  if (workspaceFiles !== undefined && liveRoot !== undefined) {
    return <FilesExplorer key={liveRoot} remote={workspaceFiles} sessionId={sessionId} rootPath={liveRoot} openRequest={request} t={t} />
  }

  if (snapshot.roots.length === 0) {
    return (
      <div className={css.view}>
        {hasMore && (
          <button type="button" className={css.older} disabled={loadingOlder}
            onClick={() => { void loadOlder() }}>
            {loadingOlder ? t('older.loading') : t('older.load')}
          </button>
        )}
        <div className={css.empty}>{t('empty.noFiles')}</div>
      </div>
    )
  }

  return (
    <div className={css.view}>
      {hasMore && (
        <button type="button" className={css.older} disabled={loadingOlder}
          onClick={() => { void loadOlder() }}>
          {loadingOlder ? t('older.loading') : t('older.load')}
        </button>
      )}
      <div className={css.split}>
        <div className={css.tree} role="tree">
          {snapshot.roots.map(root => (
            <TreeRow
              key={root.path}
              node={root}
              depth={0}
              selectedPath={selectedPath}
              expanded={expanded}
              onSelect={setSelectedPath}
              onToggle={(path) => {
                setExpanded(prev => {
                  const next = new Set(prev)
                  if (next.has(path)) next.delete(path)
                  else next.add(path)
                  return next
                })
              }}
              t={t}
            />
          ))}
        </div>
        <div className={css.content}>
          <FileContentPane
            path={selected?.path}
            content={selected?.content}
            badge={selected === undefined ? undefined : statusLabel(t, selected.status)}
            note={selected?.partial === true ? t('content.partial') : undefined}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}
