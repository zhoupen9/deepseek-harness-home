/**
 * To-dos pill for the Session header and its list panel.
 *
 * The wide pill is the header's leftmost utility (order -12), one step left of
 * the session-metrics capsule, and shows the shipped To-dos card's progress
 * summary. Clicking it opens one row per todo, each with the shared status dot,
 * in a portaled panel placed by CSS anchor positioning: the trigger declares a
 * per-instance `anchor-name` and the panel resolves it (the same mechanism the
 * shipped menu uses, and the replacement for the removed
 * `useAnchoredPosition` primitive). The sibling TodoPillSuppressed occupant
 * reuses the composer dock's todo cell at a lower priority, so the shipped card
 * above the input disappears while this plugin is mounted.
 *
 * The panel mirrors rather than imports the shipped card's surface: a feature
 * plugin may not import another feature plugin's stylesheet, so the menu
 * surface, elevation, and scrollbar colors are copied into the module CSS.
 */
import { memo, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  IconChecklistOutlineRegular,
  StateDot,
  Tooltip,
  useDismissOnOutsidePointer,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: merges the todos key into SessionProjectionMap for useProjection.
import type {} from '@deepseek-ai/dsh-tool-todo/client'
import { ariaText, fractionText, hasTodos, progressText, statusLabel, statusState } from './todo-pill.ts'
import type { TodoPillTranslate } from './locales.ts'
import css from './TodoPill.module.css'

/** Props: the projection read seat, the owning Session, and the locale seat. */
export interface TodoPillProps {
  /** Key-addressed session projection reader (session-standard seat). */
  useProjection: UseProjection
  /** Owning Session; a switch collapses an open panel. */
  sessionId: SessionId
  /** The owning header row's locale seat. */
  t: TodoPillTranslate
}

/**
 * Anchor-positioning styles the React 18 style types predate: the trigger's
 * `anchor-name` and the panel's `position-anchor` (the panel is portaled to
 * `document.body`, so the name is the only link between the two).
 */
const anchorNameStyle = (anchor: string): CSSProperties => ({ anchorName: anchor } as CSSProperties)
const positionAnchorStyle = (anchor: string): CSSProperties => ({ positionAnchor: anchor } as CSSProperties)

/** The header To-dos pill; renders nothing without todos. */
export const TodoPill = memo(function TodoPill({ useProjection, sessionId, t }: TodoPillProps) {
  const projected = useProjection('todos')
  const todos = hasTodos(projected) ? projected : null
  const [open, setOpen] = useState(false)
  const [openSession, setOpenSession] = useState<SessionId>(sessionId)
  // The entry stays mounted across Sessions while the projection swaps: an open
  // panel collapses with the Session it was opened for instead of carrying its
  // state onto another list.
  if (openSession !== sessionId) {
    setOpenSession(sessionId)
    if (open) setOpen(false)
  }
  // An emptied list removes the trigger; a panel left open would reappear on
  // the next write, so it collapses with the trigger instead of waiting.
  if (todos === null && open) setOpen(false)
  const shown = open && todos !== null
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  // One anchor name per mounted pill, so two headers never resolve each
  // other's panel; the ids React hands out carry colons, which an anchor name
  // may not.
  const anchor = '--dsh-todo-pill-' + useId().replaceAll(':', '')
  useDismissOnOutsidePointer(rootRef, shown, setOpen, panelRef)
  useEffect(() => {
    if (!shown) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [shown])
  if (todos === null) return null
  const summary = progressText(todos, t)
  return (
    <div ref={rootRef} className={css.root}>
      <Tooltip label={summary} side="bottom" delayMs={400} portal disabled={open}>
        <button
          ref={triggerRef}
          type="button"
          className={css.trigger}
          style={anchorNameStyle(anchor)}
          aria-label={ariaText(todos, t)}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => { setOpen(value => !value) }}
        >
          <IconChecklistOutlineRegular className={css.icon} />
          <span className={css.full}>{summary}</span>
          <span className={css.compact}>{fractionText(todos, t)}</span>
        </button>
      </Tooltip>
      {shown && createPortal(
        <div
          ref={panelRef}
          className={css.panel}
          role="dialog"
          aria-label={t('title')}
          style={positionAnchorStyle(anchor)}
        >
          <div className={css.head}>
            <span className={css.headTitle}>
              <IconChecklistOutlineRegular className={css.panelIcon} />
              {t('title')}
            </span>
            <span className={css.headValue}>{summary}</span>
          </div>
          <div className={css.rule} aria-hidden />
          <ul className={css.list}>
            {todos.map(item => (
              <li key={item.content} className={css.item} data-status={item.status}>
                <span className={css.glyph} role="img" aria-label={statusLabel(item.status, t)}>
                  <StateDot state={statusState(item.status)} />
                </span>
                <span className={css.content}>{item.content}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
})

/**
 * Replacement occupant of the shipped composer To-dos card: this entry reuses
 * the todo cell of conversation.input.dock at a lower priority, so
 * ui-conversation's TodoDock (priority 0) is shadowed and the card above the
 * input disappears — its list lives in the header pill instead.
 */
export const TodoPillSuppressed = memo(function TodoPillSuppressed(): null {
  return null
})
