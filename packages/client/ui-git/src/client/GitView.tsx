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
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { GitLogResult, GitRef, GitShowFileStatus, GitShowResult } from './git-contract.ts'
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

/** Max commits requested per log page. */
const LOG_MAX_COUNT = 200

/** Ref badge color per kind (branch/tag use the fixed GitHub palette). */
const REF_COLORS: Readonly<Record<GitRef['kind'], string>> = {
  head: 'var(--dsh-text-primary, #e6edf3)',
  branch: '#3fb950',
  tag: '#d29922',
  remote: 'var(--dsh-text-secondary, #8b949e)',
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

/** Human-readable timestamp (user data, not product copy). */
function formatTime(time: number): string {
  return new Date(time).toLocaleString()
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

  useEffect(() => {
    if (git === undefined || root === undefined) {
      setState({ kind: 'idle' })
      return
    }
    const controller = new AbortController()
    setState({ kind: 'loading' })
    void git.log(sessionId, { maxCount: LOG_MAX_COUNT }, controller.signal)
      .then((log) => {
        if (controller.signal.aborted) return
        setState({ kind: 'ready', log })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => { controller.abort() }
  }, [git, root, sessionId])

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
        {log.truncated && <span className={css.truncated}>{t('log.truncated', { count: log.commits.length })}</span>}
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
                <span className={css.refs}>
                  {commit.refs.map(ref => (
                    <span key={ref.name} className={css.ref} style={{ color: REF_COLORS[ref.kind] }}>{ref.name}</span>
                  ))}
                </span>
                <span className={css.subject}>{commit.subject}</span>
                <span className={css.byline}>
                  <span className={css.hash} title={commit.hash}>{shortHash(commit.hash)}</span>
                  <span className={css.author}>{commit.authorName}</span>
                  <span className={css.time}>{formatTime(commit.authorTime)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        {selectedHash !== null && (
          <CommitDetails details={details} t={t} onClose={() => { setSelectedHash(null) }} />
        )}
      </div>
    </div>
  )
}
