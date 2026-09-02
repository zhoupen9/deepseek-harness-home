/**
 * Git view: the workspace repository's commit-history tree graph plus a
 * right-side commit-detail pane. When the host `git` remote is present (see
 * HOST_PRIMITIVES.md) and the session names a workspace root, this fetches one
 * bounded log and renders the lane graph (SVG) beside per-commit metadata.
 * Clicking a commit fetches `git.show` and reveals its details (message,
 * author/committer, parents, changed files, and diff) in a right pane.
 * Otherwise it renders a targeted notice — host primitive missing, no
 * workspace, not a repo, no commits, or a host error.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitLogOptions, GitLogResult, GitRef, GitShowFileStatus, GitShowResult } from './git-contract.ts'
import { classifyDiffLine, type DiffLineKind } from './git-diff.ts'
import { layoutGitGraph } from './git-graph.ts'
import type { GitRemote } from './git-remote.ts'
import type { GitTranslate } from './locales.ts'
import { NS, type GitKey } from './locales.ts'
import css from './GitView.module.css'

/** Session-bound controls not already supplied by the conversation view slot. */
export interface GitViewInjected {
  /** The host git remote, or undefined before the host implements it. */
  git: GitRemote | undefined
  /** The session's absolute workspace root (cwd), or undefined. */
  root: string | undefined
}

/** SVG grid constants: lane width and row height in pixels. */
export const GIT_LANE_WIDTH = 16
export const GIT_ROW_HEIGHT = 28

/** Commits loaded per history page; more are fetched on demand. */
const LOG_PAGE_SIZE = 32

/** Ref badge color per kind (branch/tag use the fixed GitHub palette). */
const REF_COLORS: Readonly<Record<GitRef['kind'], string>> = {
  head: 'var(--dsh-text-primary, #e6edf3)',
  branch: '#3fb950',
  tag: '#d29922',
  remote: 'var(--dsh-text-secondary, #8b949e)',
}

/**
 * Commit-history traversal modes the view can request from the host git log.
 * Each entry names the git flag it maps to; `--max-parents=<n>` limits the
 * listing to commits with at most n parents (see HOST_TRAVERSAL_MODES.md).
 */
type Traversal = 'first-parent' | 'max-parents-1' | 'max-parents-2'

const TRAVERSALS: ReadonlyArray<{ readonly mode: Traversal; readonly label: string }> = [
  { mode: 'first-parent', label: '--first-parent' },
  { mode: 'max-parents-1', label: '--max-parents=1' },
  { mode: 'max-parents-2', label: '--max-parents=2' },
]

/** Map a traversal mode to the host log options that reproduce its flag. */
function traversalOptions(mode: Traversal): Pick<GitLogOptions, 'firstParent' | 'maxParents'> {
  switch (mode) {
    case 'first-parent':
      return { firstParent: true, maxParents: undefined }
    case 'max-parents-1':
      return { firstParent: false, maxParents: 1 }
    case 'max-parents-2':
      return { firstParent: false, maxParents: 2 }
  }
}

/** Badge color per changed-file status (the fixed GitHub/VSCode palette). */
const STATUS_COLORS: Readonly<Record<GitShowFileStatus, string>> = {
  added: '#3fb950',
  deleted: '#f85149',
  modified: '#d29922',
  renamed: '#bc8cff',
  copied: '#bc8cff',
  typechanged: '#bc8cff',
  unmerged: '#f85149',
}

/** Status -> locale key. */
const STATUS_KEY: Readonly<Record<GitShowFileStatus, GitKey>> = {
  added: 'status.added',
  deleted: 'status.deleted',
  modified: 'status.modified',
  renamed: 'status.renamed',
  copied: 'status.copied',
  typechanged: 'status.typechanged',
  unmerged: 'status.unmerged',
}

/** Diff-line display class per kind. */
const DIFF_LINE_CLASS: Record<DiffLineKind, string> = {
  add: css.diffAdd,
  del: css.diffDel,
  hunk: css.diffHunk,
  meta: css.diffMeta,
  ctx: '',
}

/** Pixel x of a grid column center. */
function xOf(column: number): number {
  return column * GIT_LANE_WIDTH + GIT_LANE_WIDTH / 2
}

/** Pixel y of a grid row center. */
function yOf(row: number): number {
  return row * GIT_ROW_HEIGHT + GIT_ROW_HEIGHT / 2
}

/** Abbreviated object id shown next to a commit. */
function shortHash(hash: string): string {
  return hash.slice(0, 7)
}

/** Zero-pad a numeric date/time part to two digits. */
function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Human-readable timestamp (user data, not product copy): local date and time
 * with zero-padded month/day and hour/minute/second, e.g. "01/03/2026, 03:05:08". */
function formatTime(time: number): string {
  const date = new Date(time)
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hours = pad2(date.getHours())
  const minutes = pad2(date.getMinutes())
  const seconds = pad2(date.getSeconds())
  return `${month}/${day}/${date.getFullYear()}, ${hours}:${minutes}:${seconds}`
}

type LoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly log: GitLogResult }
  | { readonly kind: 'error'; readonly message: string }

type DetailsState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly result: GitShowResult }
  | { readonly kind: 'error'; readonly message: string }

/** One unified-diff line, colored by its display kind. */
function DiffText({ diff }: { diff: string }) {
  const lines = diff.split('\n')
  return (
    <pre className={css.diff}>
      {lines.map((line, index) => (
        <span key={index} className={DIFF_LINE_CLASS[classifyDiffLine(line)]}>
          {line}{index < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </pre>
  )
}

/** The selected commit's full detail surface. */
function CommitDetailBody({ result, t }: { result: GitShowResult; t: GitTranslate }) {
  if (result.vcs.kind !== 'git') {
    const message = result.vcs.kind === 'error' ? t('error.failed') + result.vcs.message : t('empty.notRepo')
    return <div className={css.detailsState}>{message}</div>
  }
  if (result.commit === undefined) {
    return <div className={css.detailsState}>{t('details.notFound')}</div>
  }
  const commit = result.commit
  return (
    <>
      <h2 className={css.detailSubject}>{commit.subject}</h2>
      {commit.refs.length > 0 && (
        <div className={css.detailRefs}>
          {commit.refs.map(ref => (
            <span key={ref.name} className={css.ref} style={{ color: REF_COLORS[ref.kind] }}>{ref.name}</span>
          ))}
        </div>
      )}
      <dl className={css.detailMeta}>
        <div className={css.metaRow}>
          <dt className={css.metaLabel}>{t('details.hash')}</dt>
          <dd className={css.metaValue}><span className={css.hash} title={commit.hash}>{commit.hash}</span></dd>
        </div>
        <div className={css.metaRow}>
          <dt className={css.metaLabel}>{t('details.author')}</dt>
          <dd className={css.metaValue}>{commit.authorName} &lt;{commit.authorEmail}&gt; · {formatTime(commit.authorTime)}</dd>
        </div>
        <div className={css.metaRow}>
          <dt className={css.metaLabel}>{t('details.committer')}</dt>
          <dd className={css.metaValue}>{commit.committerName} &lt;{commit.committerEmail}&gt; · {formatTime(commit.committerTime)}</dd>
        </div>
        <div className={css.metaRow}>
          <dt className={css.metaLabel}>{t('details.parents')}</dt>
          <dd className={css.metaValue}>{commit.parents.length === 0 ? '—' : commit.parents.map(shortHash).join(', ')}</dd>
        </div>
      </dl>
      {commit.body !== '' && (
        <section className={css.detailSection}>
          <h3 className={css.detailHeading}>{t('details.message')}</h3>
          <pre className={css.detailBody}>{commit.body}</pre>
        </section>
      )}
      <section className={css.detailSection}>
        <h3 className={css.detailHeading}>{t('details.files')} ({result.files.length})</h3>
        <ul className={css.files}>
          {result.files.map(file => (
            <li key={file.path + ':' + file.status} className={css.fileRow}>
              <span className={css.fileStatus} style={{ color: STATUS_COLORS[file.status] }}>{t(STATUS_KEY[file.status])}</span>
              <span className={css.filePath}>{file.previousPath !== undefined ? file.previousPath + ' → ' + file.path : file.path}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className={css.detailSection}>
        <h3 className={css.detailHeading}>{t('details.diff')}</h3>
        {result.diffTruncated && <div className={css.diffTruncated}>{t('details.diffTruncated')}</div>}
        <DiffText diff={result.diff} />
      </section>
    </>
  )
}

/** The right-side pane: loading/error/ready commit detail. */
function CommitDetails({ details, t, onClose }: { details: DetailsState; t: GitTranslate; onClose: () => void }) {
  if (details.kind === 'idle') return null
  return (
    <aside className={css.details}>
      <header className={css.detailsHeader}>
        <button type="button" className={css.close} onClick={onClose} aria-label={t('details.close')}>×</button>
      </header>
      <div className={css.detailsBody}>
        {details.kind === 'loading' && <div className={css.detailsState}>{t('details.loading')}</div>}
        {details.kind === 'error' && <div className={css.detailsState}>{t('error.failed')}{details.message}</div>}
        {details.kind === 'ready' && <CommitDetailBody result={details.result} t={t} />}
      </div>
    </aside>
  )
}

/**
 * The Git view slot entry: pure component over the composed props.
 * @param props - conversation view runtime, injected face, and locale seat.
 * @returns the history graph with the commit-detail pane, or a targeted notice.
 */
export function GitView({
  sessionId, git, root, t,
}: ConvViewProps & InjectFace<GitViewInjected> & PropsLocale<typeof NS>) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' })
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [details, setDetails] = useState<DetailsState>({ kind: 'idle' })
  const [traversal, setTraversal] = useState<Traversal>('first-parent')
  /** Commit window currently loaded (grows by LOG_PAGE_SIZE per load-more). */
  const [windowCount, setWindowCount] = useState<number>(LOG_PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (git === undefined || root === undefined) {
      loadMoreRef.current?.abort()
      setState({ kind: 'idle' })
      return
    }
    loadMoreRef.current?.abort()
    setWindowCount(LOG_PAGE_SIZE)
    setLoadingMore(false)
    const controller = new AbortController()
    setState({ kind: 'loading' })
    const options: GitLogOptions = { maxCount: LOG_PAGE_SIZE, ...traversalOptions(traversal) }
    void git.log(sessionId, options, controller.signal)
      .then((log) => {
        if (controller.signal.aborted) return
        setState({ kind: 'ready', log })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => { controller.abort() }
  }, [git, root, sessionId, traversal])

  useEffect(() => {
    if (git === undefined || selectedHash === null) {
      setDetails({ kind: 'idle' })
      return
    }
    const controller = new AbortController()
    setDetails({ kind: 'loading' })
    void git.show(sessionId, selectedHash, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setDetails({ kind: 'ready', result })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setDetails({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => { controller.abort() }
  }, [git, sessionId, selectedHash])

  const layout = useMemo(
    () => state.kind === 'ready' ? layoutGitGraph(state.log.commits) : undefined,
    [state],
  )

  const toggleSelection = (hash: string): void => {
    setSelectedHash(selectedHash === hash ? null : hash)
  }

  const rowKeyDown = (hash: string) => (event: KeyboardEvent<HTMLLIElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleSelection(hash)
    }
  }

  const changeMode = (mode: Traversal): void => {
    if (mode === traversal) return
    loadMoreRef.current?.abort()
    setTraversal(mode)
    setWindowCount(LOG_PAGE_SIZE)
    setLoadingMore(false)
    setSelectedHash(null)
    setDetails({ kind: 'idle' })
  }

  const loadMore = (): void => {
    if (git === undefined || state.kind !== 'ready') return
    const next = windowCount + LOG_PAGE_SIZE
    loadMoreRef.current?.abort()
    const controller = new AbortController()
    loadMoreRef.current = controller
    setWindowCount(next)
    setLoadingMore(true)
    const options: GitLogOptions = { maxCount: next, ...traversalOptions(traversal) }
    void git.log(sessionId, options, controller.signal)
      .then((log) => {
        if (controller.signal.aborted) return
        setState({ kind: 'ready', log })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMore(false)
      })
  }

  if (git === undefined) {
    return <div className={css.view}><div className={css.empty}>{t('empty.requiresHost')}</div></div>
  }
  if (root === undefined) {
    return <div className={css.view}><div className={css.empty}>{t('empty.noWorkspace')}</div></div>
  }
  if (state.kind === 'idle' || state.kind === 'loading') {
    return <div className={css.view}><div className={css.empty}>{t('loading')}</div></div>
  }
  if (state.kind === 'error') {
    return <div className={css.view}><div className={css.empty}>{t('error.failed')}{state.message}</div></div>
  }

  const { log } = state
  if (log.vcs.kind !== 'git') {
    const message = log.vcs.kind === 'error' ? t('error.failed') + log.vcs.message : t('empty.notRepo')
    return <div className={css.view}><div className={css.empty}>{message}</div></div>
  }
  if (log.commits.length === 0 || layout === undefined) {
    return <div className={css.view}><div className={css.empty}>{t('empty.noCommits')}</div></div>
  }

  const width = layout.width * GIT_LANE_WIDTH
  const height = log.commits.length * GIT_ROW_HEIGHT

  return (
    <div className={css.view}>
      <header className={css.header}>
        <span className={css.branch} title={log.headHash}>{log.currentBranch ?? 'HEAD'}</span>
        <div
          className={css.traversalGroup}
          role="group"
          aria-label={t('log.traversalLabel')}
          title={t('log.traversalLabel')}
        >
          {TRAVERSALS.map(entry => (
            <button
              key={entry.mode}
              type="button"
              className={entry.mode === traversal ? css.traversalButton + ' ' + css.traversalActive : css.traversalButton}
              aria-pressed={entry.mode === traversal}
              onClick={() => { changeMode(entry.mode) }}
            >
              {entry.label}
            </button>
          ))}
        </div>

      </header>
      <div className={css.body}>
        <div className={css.history}>
          <svg className={css.graph} width={width} height={height} aria-hidden="true">
            {layout.edges.map((edge, index) => (
              <polyline
                key={index}
                className={css.edge}
                points={edge.points.map(point => xOf(point.column) + ',' + yOf(point.row)).join(' ')}
              />
            ))}
            {layout.nodes.map(node => (
              <circle key={node.hash} className={css.node} cx={xOf(node.column)} cy={yOf(node.row)} r={3} />
            ))}
          </svg>
          <div className={css.logColumn}>
          <ol className={css.commits}>
            {log.commits.map(commit => (
              <li
                key={commit.hash}
                className={commit.hash === selectedHash ? css.commit + ' ' + css.commitSelected : css.commit}
                style={{ height: GIT_ROW_HEIGHT }}
                role="button"
                tabIndex={0}
                aria-pressed={commit.hash === selectedHash}
                onClick={() => { toggleSelection(commit.hash) }}
                onKeyDown={rowKeyDown(commit.hash)}
              >
                <span className={css.hash} title={commit.hash}>{shortHash(commit.hash)}</span>
                <span className={css.refs}>
                  {commit.refs.map(ref => (
                    <span key={ref.name} className={css.ref} style={{ color: REF_COLORS[ref.kind] }}>{ref.name}</span>
                  ))}
                </span>
                <span className={css.subject}>{commit.subject}</span>
                <span className={css.byline}>
                  <span className={css.author}>
                    <svg className={css.userGlyph} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {commit.authorName}
                  </span>
                  <span className={css.time}>
                    <svg className={css.calendarGlyph} viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formatTime(commit.authorTime)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {log.truncated && (
            <button
              type="button"
              className={css.loadMore}
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? t('log.loadingMore') : t('log.loadMore')}
            </button>
          )}
          </div>
        </div>
        {selectedHash !== null && (
          <CommitDetails details={details} t={t} onClose={() => { setSelectedHash(null) }} />
        )}
      </div>
    </div>
  )
}
