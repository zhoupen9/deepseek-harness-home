/**
 * Changes view: per-file cumulative net differences with aligned inline diffs.
 * Unlike the Edits view (per-turn records), each card shows the file's current
 * difference — original regions at first in-window mutation vs. their current
 * state — folded from the whole loaded window.
 */
import { useCallback, useMemo, useState } from 'react'
import type { DiffBlockLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { NetDiffRow } from './changes-diff.ts'
import { computeNetDiff, rowsToText, summarizeRows } from './changes-diff.ts'
import { highlightLine, type HighlightKind, type HighlightToken } from './changes-highlight.ts'
import { langFromPath } from './changes-lang.ts'
import type { ChangesFile } from './changes-contract.ts'
import type { ChangesTranslate } from './locales.ts'
import { NS } from './locales.ts'
import css from './ChangesView.module.css'

/** Body lines one file card shows before the middle collapses. */
export const CHANGES_DIFF_MAX_LINES = 16

/** Session-bound controls not already supplied by the conversation view slot. */
export interface ChangesViewInjected {
  /** Pull one older history page; resolves whether the Changes window changed. */
  loadOlder: () => Promise<boolean>
}

/** Localized diff-card chrome, mirroring the chat row's label split. */
function diffLabels(t: ChangesTranslate): DiffBlockLabels {
  return {
    copy: t('diff.copy'),
    copied: t('diff.copied'),
    collapseAria: t('diff.collapseAria'),
    expandAria: hidden => t('diff.expandAria', { hidden }),
    collapse: t('diff.collapse'),
    expand: hidden => t('diff.expand', { hidden }),
    files: count => t('diff.files', { count }),
  }
}

/** The dim class per row kind (gap chrome vs the diff's own +/- colors). */
const ROW_CLASS: Record<NetDiffRow['kind'], string> = {
  ctx: css.ctx,
  del: css.del,
  add: css.add,
  gap: css.gap,
}

/** A rendered row carrying highlight tokens for changed code lines. */
type DisplayRow =
  | { readonly kind: 'ctx'; readonly text: string }
  | { readonly kind: 'del'; readonly text: string; readonly tokens: readonly HighlightToken[] }
  | { readonly kind: 'add'; readonly text: string; readonly tokens: readonly HighlightToken[] }
  | { readonly kind: 'gap' }

/** Token kind -> CSS class; plain inherits the line's color. */
const TOKEN_CLASS: Record<HighlightKind, string | undefined> = {
  comment: css.tokComment,
  string: css.tokString,
  keyword: css.tokKeyword,
  literal: css.tokLiteral,
  number: css.tokNumber,
  function: css.tokFunction,
  variable: css.tokVariable,
  plain: undefined,
}

/** Render one diff body row, highlighting code when the language is known. */
function Row({ row }: { row: DisplayRow }) {
  const cls = ROW_CLASS[row.kind]
  if (row.kind === 'gap') {
    return <div className={css.line + ' ' + cls}>{'⋯'}</div>
  }
  if (row.kind === 'ctx') {
    return <div className={css.line + ' ' + cls}>{row.text}</div>
  }
  const tokens = row.tokens
  if (tokens.length === 1 && tokens[0].kind === 'plain') {
    return <div className={css.line + ' ' + cls}>{row.text}</div>
  }
  return (
    <div className={css.line + ' ' + cls}>
      {tokens.map((token, index) => {
        const tokenCls = TOKEN_CLASS[token.kind]
        return tokenCls === undefined
          ? <span key={index}>{token.text}</span>
          : <span key={index} className={tokenCls}>{token.text}</span>
      })}
    </div>
  )
}

/**
 * Aligned net diff surface: renders the LCS-computed change regions with
 * context, the same head/tail cap arithmetic as the primitives' DiffBlock.
 */
function NetDiff({
  before, after, path, labels, maxLines = CHANGES_DIFF_MAX_LINES,
}: {
  before: string
  after: string
  path: string
  labels: DiffBlockLabels
  maxLines?: number
}) {
  const rows = useMemo(() => computeNetDiff(before, after), [before, after])
  const display = useMemo(() => {
    const lang = langFromPath(path)
    return rows.map((row): DisplayRow => {
      if (row.kind === 'del') return { kind: 'del', text: row.text, tokens: highlightLine(row.text, lang) }
      if (row.kind === 'add') return { kind: 'add', text: row.text, tokens: highlightLine(row.text, lang) }
      return row
    })
  }, [rows, path])
  const summary = useMemo(() => summarizeRows(rows), [rows])
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const onCopy = useCallback(() => {
    if (copied) return
    void writeClipboard(rowsToText(rows)).then((ok) => {
      if (!ok) return
      setCopied(true)
      window.setTimeout(() => { setCopied(false) }, 1000)
    })
  }, [copied, rows])

  const onToggle = useCallback(() => { setExpanded(value => !value) }, [])

  if (rows.length === 0) return null

  const hidden = rows.length - maxLines
  const capped = hidden > 0 && !expanded
  // Same split arithmetic as the primitives' DiffBlock: head and tail slices
  // agree across the front ends.
  const headLines = Math.ceil(maxLines / 2)
  const tailLines = maxLines - headLines
  const head = capped ? display.slice(0, headLines) : display
  const tail = capped ? display.slice(display.length - tailLines) : []

  return (
    <div className={css.diff} data-net-diff="">
      <button type="button" className={css.copyButton} onClick={onCopy}>
        {copied ? labels.copied : labels.copy}
      </button>
      <div className={css.body}>
        {head.map((row, index) => <Row key={index} row={row} />)}
        {hidden > 0 && (
          <button type="button" className={css.expand} onClick={onToggle} aria-expanded={expanded}>
            {expanded ? labels.collapse : labels.expand(hidden)}
          </button>
        )}
        {tail.map((row, index) => <Row key={index} row={row} />)}
      </div>
      <div className={css.footer}>└ +{summary.added} -{summary.removed}</div>
    </div>
  )
}

function fileFooter(t: ChangesTranslate, file: ChangesFile): string {
  const when = new Date(file.lastTime).toLocaleTimeString()
  return `${t('entry.turn', { turn: file.lastTurn })} · ${when}`
}

export function ChangesView({
  useSession, useChanges, loadOlder, t,
}: ConvViewProps & InjectFace<ChangesViewInjected> & PropsLocale<typeof NS>) {
  const snapshot = useChanges(value => value)
  const hasMore = useSession(value => value.hasMore)
  const loadingOlder = useSession(value => value.loadingOlder)
  const labels = diffLabels(t)
  const files = snapshot.files

  if (files.length === 0) {
    return <div className={css.empty}>{t('empty.noChanges')}</div>
  }

  return (
    <div className={css.view}>
      {hasMore && (
        <button
          type="button"
          className={css.older}
          disabled={loadingOlder}
          onClick={() => { void loadOlder() }}
        >
          {loadingOlder ? t('older.loading') : t('older.load')}
        </button>
      )}
      <header className={css.summary}>
        <span>{t('summary.files', { count: files.length })}</span>
      </header>
      {files.map(file => (
        <section key={file.path} className={css.file}>
          <header className={css.fileHeader}>
            <span className={css.badge}>
              {file.status === 'created' ? t('status.created') : t('status.modified')}
            </span>
            <span className={css.path} title={file.path}>{file.path}</span>
            {file.degraded && (
              <span className={css.degraded} title={t('entry.approximated')}>≈</span>
            )}
          </header>
          <NetDiff before={file.before} after={file.after} path={file.path} labels={labels} />
          <footer className={css.fileFooter}>{fileFooter(t, file)}</footer>
        </section>
      ))}
    </div>
  )
}
