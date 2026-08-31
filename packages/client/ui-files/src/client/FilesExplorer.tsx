/**
 * Live directories-and-files explorer: a lazily loaded tree rooted at the
 * session workspace, driven by the host workspaceFiles remote (list + read).
 * Each directory level is fetched on first expand; selecting a file reads its
 * bounded text through the same remote and renders it in the shared content
 * pane. The parent mounts this keyed by rootPath so a workspace change resets
 * the lazy-load dedupe set.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceFilesContent, WorkspaceFilesEntry, WorkspaceFilesRemote } from './files-remote.ts'
import { ancestorPaths, formatSize, isIgnoredEntry, resolveUnderRoot, sortEntries, VCS_COLORS, vcsMarker, vcsNameColor } from './files-explorer.ts'
import type { FileOpenRequest } from './files-contract.ts'
import { FileContentPane } from './FileContentPane.tsx'
import type { FilesTranslate } from './locales.ts'
import css from './FilesExplorer.module.css'

/** Props of the live explorer. */
export interface FilesExplorerProps {
  /** The host remote (list + read); already resolved by the caller. */
  remote: WorkspaceFilesRemote
  /** Session whose workspace root fences the explorer (agentId for the remote). */
  sessionId: SessionId
  /** Absolute workspace root this explorer is scoped to. */
  rootPath: string
  /** Namespace-bound translator. */
  t: FilesTranslate
  /** Chat file-link open request to reveal (resolved by the caller). */
  openRequest: FileOpenRequest | null
  /** The platform's one-shot view-request focus (openView('files', path)); null when none pending. */
  focusPath: string | null
}

/** One directory level's loaded facts. */
interface LevelState {
  readonly entries: readonly WorkspaceFilesEntry[]
  readonly truncated: boolean
  readonly error?: string
}

/** Aggregate live-tree state. */
interface ExplorerState {
  /** Loaded levels keyed by directory path (present = loaded, even if empty). */
  readonly levels: ReadonlyMap<string, LevelState>
  /** Directories with an in-flight list call. */
  readonly loading: ReadonlySet<string>
}

/** Reducer actions. */
type ExplorerAction =
  | { readonly type: 'load-start'; readonly path: string }
  | { readonly type: 'load-ok'; readonly path: string; readonly entries: readonly WorkspaceFilesEntry[]; readonly truncated: boolean }
  | { readonly type: 'load-error'; readonly path: string; readonly message: string }

function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'load-start': {
      const loading = new Set(state.loading)
      loading.add(action.path)
      return { ...state, loading }
    }
    case 'load-ok': {
      const loading = new Set(state.loading)
      loading.delete(action.path)
      const levels = new Map(state.levels)
      levels.set(action.path, { entries: action.entries, truncated: action.truncated })
      return { ...state, loading, levels }
    }
    case 'load-error': {
      const loading = new Set(state.loading)
      loading.delete(action.path)
      const levels = new Map(state.levels)
      levels.set(action.path, { entries: [], truncated: false, error: action.message })
      return { ...state, loading, levels }
    }
  }
}

/** Content read state for the selected file. */
type LiveContentState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: WorkspaceFilesContent }
  | { readonly status: 'error'; readonly message: string }

/** A thrown value as an Error's message. */
function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

/**
 * The live explorer view.
 * @param props - remote, root, and locale seat.
 * @returns the explorer element.
 */
export function FilesExplorer({ remote, sessionId, rootPath, openRequest, focusPath, t }: FilesExplorerProps) {
  const [state, dispatch] = useReducer(explorerReducer, { levels: new Map(), loading: new Set() })
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set([rootPath]))
  const [showHidden, setShowHidden] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [content, setContent] = useState<LiveContentState>({ status: 'idle' })
  const seen = useRef(new Set<string>())
  const readAbort = useRef<AbortController | null>(null)
  const consumedRequest = useRef(0)

  const loadDir = useCallback((path: string) => {
    if (seen.current.has(path)) return
    seen.current.add(path)
    dispatch({ type: 'load-start', path })
    remote.list(sessionId, path).then(
      (listing) => dispatch({ type: 'load-ok', path, entries: sortEntries(listing.entries), truncated: listing.truncated }),
      (reason: unknown) => dispatch({ type: 'load-error', path, message: messageOf(reason) }),
    )
  }, [remote, sessionId])

  useEffect(() => { loadDir(rootPath) }, [rootPath, loadDir])

  useEffect(() => {
    readAbort.current?.abort()
    if (selectedPath === null) {
      setContent({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    readAbort.current = controller
    setContent({ status: 'loading' })
    remote.read(sessionId, selectedPath, controller.signal).then(
      (value) => { if (!controller.signal.aborted) setContent({ status: 'ready', value }) },
      (reason: unknown) => { if (!controller.signal.aborted) setContent({ status: 'error', message: messageOf(reason) }) },
    )
    return () => { controller.abort() }
  }, [selectedPath, remote, sessionId])

  const selectFile = useCallback((path: string) => {
    setSelectedPath(path)
    setExpanded(prev => new Set([...prev, ...ancestorPaths(path)]))
  }, [])

  // A chat file-link click for THIS session reveals and selects the file the
  // moment a request lands (or on mount when one is already pending): expand
  // its ancestors, lazily load each directory along the path, and read the
  // file. The nonce guard makes repeated clicks on the same path re-open.
  useEffect(() => {
    if (openRequest === null || openRequest.sessionId !== sessionId || openRequest.nonce <= consumedRequest.current) return
    consumedRequest.current = openRequest.nonce
    for (const dir of ancestorPaths(openRequest.path)) loadDir(dir)
    selectFile(openRequest.path)
  }, [openRequest, sessionId, loadDir, selectFile])

  // The platform's one-shot view-request focus (openView('files', path)) is
  // revealed exactly like a chat file-link click: root a relative focus under
  // the workspace root, expand its ancestors, lazily load each directory along
  // the path, and read the file. The conversation store clears the request as
  // soon as the view completes it, so this prop flips back to null right after
  // the reveal ran — the selection persists.
  useEffect(() => {
    if (focusPath === null) return
    const target = resolveUnderRoot(rootPath, focusPath)
    for (const dir of ancestorPaths(target)) loadDir(dir)
    selectFile(target)
  }, [focusPath, rootPath, loadDir, selectFile])

  const toggleDir = useCallback((path: string) => {
    const willExpand = !expanded.has(path)
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
    if (willExpand) loadDir(path)
  }, [expanded, loadDir])

  const rootLevel = state.levels.get(rootPath)
  const rootEntries = rootLevel === undefined ? undefined : visible(rootLevel.entries, showHidden)
  const contentPane = selectedPath === null
    ? <FileContentPane path={undefined} content={undefined} t={t} />
    : <FileContentPane
        path={selectedPath}
        content={content.status === 'ready' ? content.value.content : undefined}
        binary={content.status === 'ready' ? content.value.binary : undefined}
        loading={content.status === 'loading'}
        error={content.status === 'error' ? content.message : undefined}
        note={content.status === 'ready' && content.value.truncated ? t('content.hostTruncated') : undefined}
        t={t}
      />

  return (
    <div className={css.view}>
      <header className={css.bar}>
        <span className={css.root} title={rootPath}>{rootPath}</span>
        <label className={css.toggle}><input type="checkbox" checked={showHidden} onChange={event => setShowHidden(event.target.checked)} /> {t('explorer.showHidden')}</label>
        <button type="button" className={css.refresh} onClick={() => { seen.current.delete(rootPath); loadDir(rootPath) }}>{t('explorer.refresh')}</button>
      </header>
      <div className={css.split}>
        <div className={css.tree} role="tree">
          {rootEntries === undefined && <div className={css.note}>{t('explorer.loading')}</div>}
          {rootEntries !== undefined && rootLevel?.error !== undefined && (
            <div className={css.note}>{t('explorer.loadError')} {rootLevel.error}</div>
          )}
          {rootEntries !== undefined && renderLevel(
            rootEntries, 0, state.levels, state.loading, expanded, selectedPath, showHidden, loadDir, toggleDir, selectFile, t
          )}
          {rootEntries !== undefined && rootLevel?.truncated === true && (
            <div className={css.note}>{t('explorer.truncated')}</div>
          )}
        </div>
        <div className={css.content}>{contentPane}</div>
      </div>
    </div>
  )
}

/** One level's entries with the hidden filter applied. */
function visible(entries: readonly WorkspaceFilesEntry[], showHidden: boolean): WorkspaceFilesEntry[] {
  return showHidden ? [...entries] : entries.filter(entry => !entry.hidden)
}

/**
 * Recursively render a level's rows. Directories toggle; files select.
 * @returns the row elements.
 */
function renderLevel(
  entries: readonly WorkspaceFilesEntry[],
  depth: number,
  levels: ReadonlyMap<string, LevelState>,
  loading: ReadonlySet<string>,
  expanded: ReadonlySet<string>,
  selectedPath: string | null,
  showHidden: boolean,
  loadDir: (path: string) => void,
  toggleDir: (path: string) => void,
  selectFile: (path: string) => void,
  t: FilesTranslate,
) {
  return entries.map(entry => {
    const ignored = isIgnoredEntry(entry)
    const nameColor = vcsNameColor(entry)
    if (entry.kind === 'file') {
      const selected = selectedPath === entry.path
      const rowClass = css.row
        + (selected ? ' ' + css.rowSelected : '')
        + (ignored ? ' ' + css.ignored : '')
      return (
        <button
          key={entry.path}
          type="button"
          role="treeitem"
          aria-label={t('tree.file')}
          className={rowClass}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => { selectFile(entry.path) }}
        >
          <span className={css.caret} aria-hidden />
          <span className={css.fileName} style={nameColor !== undefined ? { color: nameColor } : undefined}>{entry.name}</span>
          {entry.vcs !== undefined && (
            <span className={css.vcs} style={{ color: VCS_COLORS[entry.vcs] }} title={entry.vcs}>{vcsMarker(entry.vcs)}</span>
          )}
          {entry.size !== undefined && <span className={css.size}>{formatSize(entry.size)}</span>}
        </button>
      )
    }
    const open = expanded.has(entry.path)
    const level = levels.get(entry.path)
    const isLoading = loading.has(entry.path)
    const rowClass = css.row + (ignored ? ' ' + css.ignored : '')
    return (
      <div key={entry.path}>
        <button
          type="button"
          role="treeitem"
          aria-expanded={open}
          aria-label={t('tree.directory')}
          className={rowClass}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => { toggleDir(entry.path) }}
        >
          <span className={css.caret} aria-hidden>{open ? '▾' : '▸'}</span>
          <span className={css.dirName} style={nameColor !== undefined ? { color: nameColor } : undefined}>{entry.name}</span>
          {ignored && <span className={css.vcs} style={{ color: VCS_COLORS.ignored }} title="ignored">{vcsMarker('ignored')}</span>}
          {entry.vcsDirty === true && <span className={css.vcsDirty} aria-hidden>●</span>}
        </button>
        {open && isLoading && <div className={css.note} style={{ paddingLeft: 8 + (depth + 1) * 14 }}>{t('explorer.loading')}</div>}
        {open && !isLoading && level?.error !== undefined && (
          <div className={css.note} style={{ paddingLeft: 8 + (depth + 1) * 14 }}>{t('explorer.loadError')} {level.error}</div>
        )}
        {open && !isLoading && level !== undefined && level.error === undefined && (
          renderLevel(visible(level.entries, showHidden), depth + 1, levels, loading, expanded, selectedPath, showHidden, loadDir, toggleDir, selectFile, t)
        )}
        {open && !isLoading && level !== undefined && level.truncated && (
          <div className={css.note} style={{ paddingLeft: 8 + (depth + 1) * 14 }}>{t('explorer.truncated')}</div>
        )}
      </div>
    )
  })
}
