import { useCallback, useMemo, useState } from 'react'
import type { DiffBlockLabels, DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import { highlightLine, type HighlightKind, type HighlightToken } from './edits-highlight.ts'
import { langFromPath } from './edits-lang.ts'
import css from './EditsDiff.module.css'

/** Body lines shown before the height cap collapses the middle. */
export const DEFAULT_EDITS_DIFF_MAX_LINES = 16

/** One flattened body row: a file header, a gap, or a removed/added code line. */
interface DiffRow {
  readonly kind: 'path' | 'del' | 'add' | 'gap'
  readonly text: string
  /** Highlighted spans for del/add rows (single plain span = render as raw text). */
  readonly tokens?: readonly HighlightToken[]
}

/** Split a side's text into content lines (empty text = zero lines; a trailing newline is a terminator). */
function contentLines(text: string): string[] {
  if (text === '') return []
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return body.split('\n')
}

/** Flatten hunks into rows, highlighting code lines by the file's language hint. */
function buildRows(diffs: DiffHunk[]): { rows: DiffRow[]; added: number; removed: number; files: number } {
  const rows: DiffRow[] = []
  const paths = new Set<string>()
  let added = 0
  let removed = 0
  let prevPath: string | undefined
  for (const diff of diffs) {
    paths.add(diff.path)
    if (diff.path !== prevPath) rows.push({ kind: 'path', text: diff.path })
    else rows.push({ kind: 'gap', text: '\u22EF' })
    prevPath = diff.path
    const lang = langFromPath(diff.path)
    if (diff.oldText !== null) {
      for (const line of contentLines(diff.oldText)) {
        rows.push({ kind: 'del', text: line, tokens: highlightLine(line, lang) })
        removed++
      }
    }
    for (const line of contentLines(diff.newText)) {
      rows.push({ kind: 'add', text: line, tokens: highlightLine(line, lang) })
      added++
    }
  }
  return { rows, added, removed, files: paths.size }
}

/** The plain-text diff a reader copies: each row's -/+/path prefix plus its content. */
function copyText(rows: DiffRow[]): string {
  return rows.map((row) => {
    switch (row.kind) {
      case 'del': return '- ' + row.text
      case 'add': return '+ ' + row.text
      case 'path': return row.text
      case 'gap': return row.text
    }
  }).join('\n')
}

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

/** Render one body row, highlighting its code when tokens are present. */
function Row({ row }: { row: DiffRow }) {
  const cls = row.kind === 'path' ? css.path : row.kind === 'gap' ? css.gap : row.kind === 'del' ? css.del : css.add
  const tokens = row.tokens
  if (tokens === undefined || (tokens.length === 1 && tokens[0].kind === 'plain')) {
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
 * Render file mutations as an inline diff: removed lines on a dark red
 * background, added lines on a dark green background, with the code always
 * syntax-highlighted for well-known code extensions.
 */
export function EditsDiff({ diffs, labels, maxLines = DEFAULT_EDITS_DIFF_MAX_LINES, className }: {
  diffs: DiffHunk[]
  labels: DiffBlockLabels
  maxLines?: number
  className?: string
}) {
  const { rows, added, removed, files } = useMemo(() => buildRows(diffs), [diffs])
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const onCopy = useCallback(() => {
    if (copied) return
    void writeClipboard(copyText(rows)).then((ok) => {
      if (!ok) return
      setCopied(true)
      window.setTimeout(() => { setCopied(false) }, 1000)
    })
  }, [copied, rows])

  const onToggle = useCallback(() => { setExpanded(value => !value) }, [])

  if (rows.length === 0) return null

  const hidden = rows.length - maxLines
  const capped = hidden > 0 && !expanded
  const headLines = Math.ceil(maxLines / 2)
  const tailLines = maxLines - headLines
  const head = capped ? rows.slice(0, headLines) : rows
  const tail = capped ? rows.slice(rows.length - tailLines) : []

  return (
    <div className={className === undefined ? css.block : css.block + ' ' + className} data-diff="">
      <button type="button" className={css.copyButton} onClick={onCopy}>
        {copied ? labels.copied : labels.copy}
      </button>
      <div className={css.body}>
        {head.map((row, index) => <Row key={'h' + index} row={row} />)}
        {hidden > 0 && (
          <button
            type="button"
            className={css.expand}
            aria-label={expanded ? labels.collapseAria : labels.expandAria(hidden)}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {expanded ? labels.collapse : labels.expand(hidden)}
          </button>
        )}
        {tail.map((row, index) => <Row key={'t' + index} row={row} />)}
      </div>
      <div className={css.footer}>{'\u2514'} +{added} -{removed} {'\u00B7'} {labels.files(files)}</div>
    </div>
  )
}
