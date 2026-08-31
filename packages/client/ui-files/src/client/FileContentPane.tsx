/**
 * Shared file-content pane: the right side of the Files tab. Renders one
 * file's text as a line-numbered,
 * extension-highlighted ReadBlock, with explicit loading / error / binary
 * states for the live (host-read) path and the session-known reconstruction.
 * A header search control finds every occurrence of a query in the shown
 * content, highlights them all, and steps an active cursor through them.
 */
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ReadBlockLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import { ReadBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import { langFromPath } from './files-lang.ts'
import { findMatches, type ContentMatch, type NumberedLine } from './files-search.ts'
import type { FilesTranslate } from './locales.ts'
import css from './FileContentPane.module.css'

/** Content lines the pane shows before truncating (matches the read tool's cap). */
export const FILES_MAX_CONTENT_LINES = 2000

/** Localized ReadBlock chrome. */
function readLabels(t: FilesTranslate): ReadBlockLabels {
  return {
    window: (shown, total) => t('content.window', { shown: String(shown), total: String(total) }),
    copy: t('content.copy'),
    copied: t('content.copied'),
    collapseAria: t('content.collapseAria'),
    expandAria: hidden => t('content.expandAria', { hidden }),
    collapse: t('content.collapse'),
    expand: hidden => t('content.expand', { hidden }),
  }
}

/** Full props of the shared content pane (session-known and live callers both fill it). */
export interface FileContentPaneProps {
  /** Absolute or model-facing path shown in the header; undefined = no selection. */
  path: string | undefined
  /** The file's text; undefined while loading or unknown. */
  content: string | undefined
  /** True when the file is not valid text (render a notice instead of code). */
  binary?: boolean
  /** True while a live read is in flight. */
  loading?: boolean
  /** Human-readable failure; shown when the content could not be produced. */
  error?: string
  /** Optional status badge text (created / modified / read). */
  badge?: string
  /** Optional secondary note (partial reconstruction, host truncation). */
  note?: string
  /** Namespace-bound translator. */
  t: FilesTranslate
}

/** Split a line's text around its matches, marking the active one for navigation. */
function renderHighlighted(text: string, spans: readonly ContentMatch[], activeId: number) {
  const nodes: ReactNode[] = []
  let cursor = 0
  for (const span of spans) {
    if (span.start > cursor) nodes.push(text.slice(cursor, span.start))
    nodes.push(
      <mark key={span.id} id={`files-match-${span.id}`} className={span.id === activeId ? css.matchActive : css.match}>
        {text.slice(span.start, span.end)}
      </mark>,
    )
    cursor = span.end
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

/**
 * Render one file's content as a line-numbered, syntax-highlighted view, with
 * an optional search bar that highlights every match and steps through them.
 * @param props - content facts and the locale seat.
 * @returns the content pane element.
 */
export function FileContentPane({ path, content, binary, loading, error, badge, note, t }: FileContentPaneProps) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeMatch, setActiveMatch] = useState(0)
  const searchInput = useRef<HTMLInputElement>(null)

  // A new file starts a fresh, closed search.
  useEffect(() => {
    setQuery('')
    setSearchOpen(false)
    setActiveMatch(0)
  }, [path])

  const lang = path === undefined ? undefined : langFromPath(path)
  const lines = (content ?? '').split('\n')
  // A trailing newline is a terminator, not a content line.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  const displayTruncated = lines.length > FILES_MAX_CONTENT_LINES
  const visible = displayTruncated ? lines.slice(0, FILES_MAX_CONTENT_LINES) : lines
  const numbered: NumberedLine[] = visible.map((text, index) => ({ number: index + 1, text }))

  const matches = findMatches(numbered, query)
  const matchesByLine = new Map<number, ContentMatch[]>()
  for (const match of matches) {
    const list = matchesByLine.get(match.line)
    if (list === undefined) matchesByLine.set(match.line, [match])
    else list.push(match)
  }

  // Keep the active cursor within the current match set when the query shrinks it.
  useEffect(() => {
    if (matches.length === 0) {
      if (activeMatch !== 0) setActiveMatch(0)
      return
    }
    if (activeMatch >= matches.length) setActiveMatch(0)
  }, [matches.length, activeMatch])

  // Bring the active match into view inside the scrolling body.
  useEffect(() => {
    if (matches.length === 0) return
    const active = matches[Math.min(activeMatch, matches.length - 1)]
    if (active === undefined) return
    document.getElementById(`files-match-${active.id}`)?.scrollIntoView({ block: 'center' })
  }, [activeMatch, matches])

  if (path === undefined) {
    return <div className={css.empty}>{t('content.noContent')}</div>
  }

  const searching = searchOpen && query.length > 0
  const step = (delta: number): void => {
    if (matches.length === 0) return
    setActiveMatch(index => (index + delta + matches.length) % matches.length)
  }

  return (
    <div className={css.pane}>
      <header className={css.header}>
        <span className={css.path} title={path}>{path}</span>
        {badge !== undefined && <span className={css.badge}>{badge}</span>}
        {note !== undefined && <span className={css.note}>{note}</span>}
        {displayTruncated && (
          <span className={css.note}>
            {t('content.truncated', { shown: String(visible.length), total: String(lines.length) })}
          </span>
        )}
        <button
          type="button"
          className={css.searchButton}
          aria-label={t('content.search')}
          title={t('content.search')}
          onClick={() => {
            setSearchOpen(true)
            window.setTimeout(() => { searchInput.current?.focus() }, 0)
          }}
        >
          🔍
        </button>
      </header>

      {searchOpen && (
        <div className={css.searchBar}>
          <input
            ref={searchInput}
            type="text"
            className={css.searchInput}
            placeholder={t('content.searchPlaceholder')}
            value={query}
            onChange={event => { setQuery(event.target.value); setActiveMatch(0) }}
          />
          {query.length > 0 && (
            <>
              <span className={css.matchCount}>
                {matches.length === 0 ? t('content.noMatches') : `${activeMatch + 1} / ${matches.length}`}
              </span>
              <button type="button" className={css.searchNav} aria-label={t('content.searchPrev')} title={t('content.searchPrev')} onClick={() => step(-1)}>↑</button>
              <button type="button" className={css.searchNav} aria-label={t('content.searchNext')} title={t('content.searchNext')} onClick={() => step(1)}>↓</button>
            </>
          )}
          <button type="button" className={css.searchNav} aria-label={t('content.searchClose')} title={t('content.searchClose')} onClick={() => setSearchOpen(false)}>×</button>
        </div>
      )}

      <div className={css.body}>
        {loading === true && <div className={css.empty}>{t('content.loading')}</div>}
        {loading !== true && error !== undefined && <div className={css.empty}>{error}</div>}
        {loading !== true && error === undefined && binary === true && (
          <div className={css.empty}>{t('content.binary')}</div>
        )}
        {loading !== true && error === undefined && binary !== true && searching && (
          <div className={css.searchResults}>
            {numbered.map((line, lineIndex) => {
              const spans = matchesByLine.get(lineIndex)
              return (
                <div key={line.number} className={css.line}>
                  <span className={css.gutter} aria-hidden>{line.number}</span>
                  <span className={css.lineContent}>
                    {spans === undefined ? line.text : renderHighlighted(line.text, spans, activeMatch)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {loading !== true && error === undefined && binary !== true && !searching && (
          <ReadBlock
            label={path}
            lines={numbered}
            totalLines={lines.length}
            lang={lang}
            labels={readLabels(t)}
            maxLines={numbered.length}
          />
        )}
      </div>
    </div>
  )
}
