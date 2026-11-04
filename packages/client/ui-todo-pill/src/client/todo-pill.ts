/**
 * Pure display folds for the To-dos header pill.
 *
 * The list is the session-standard todos projection (a whole-list snapshot,
 * last write wins), so every reading here is a pure function of the latest
 * value. The progress wording and the separator mirror ui-conversation's
 * shipped To-dos card (locales.ts keeps the copy in step), because this pill
 * replaces the card the composer used to render.
 */
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo/client'
import type { TodoPillTranslate } from './locales.ts'

/**
 * En spaces around the separator: HTML collapses runs of ASCII spaces, so the
 * shipped card's breathing room needs a literal wide space.
 */
const SEPARATOR = '\u2002\u00b7\u2002'

/** Local exhaustiveness helper (client packages do not depend on dsh-llm). */
function assertNever(value: never): never {
  throw new Error('unreachable todo status: ' + String(value))
}

/**
 * Whether a projection value has anything to show.
 * @param todos - the todos projection value (null before the first write).
 * @returns true for a non-empty list.
 */
export function hasTodos(todos: readonly TodoItem[] | null | undefined): todos is readonly TodoItem[] {
  return todos !== null && todos !== undefined && todos.length > 0
}

/** Per-status counts of one todo snapshot. */
export interface TodoCounts {
  /** Completed entries. */
  readonly done: number
  /** Entries being worked now; parallel work may mark several. */
  readonly active: number
  /** Entries not started. */
  readonly pending: number
  /** All entries. */
  readonly total: number
}

/**
 * Count one snapshot by lifecycle state.
 * @param todos - a todo list.
 * @returns the per-status counts; total is the list length.
 */
export function countTodos(todos: readonly TodoItem[]): TodoCounts {
  let done = 0
  let active = 0
  for (const item of todos) {
    if (item.status === 'completed') done += 1
    else if (item.status === 'in_progress') active += 1
  }
  return { done, active, pending: todos.length - done - active, total: todos.length }
}

/**
 * The per-status progress segments in the shipped card's order (completed, in
 * progress, pending), omitting zero-count segments as noise.
 * @param todos - a non-empty todo list.
 * @param t - namespace-bound translator.
 * @returns at least one localized segment.
 */
export function progressSegments(todos: readonly TodoItem[], t: TodoPillTranslate): string[] {
  const counts = countTodos(todos)
  return [
    ...counts.done > 0 ? [t('progress.done', { done: counts.done })] : [],
    ...counts.active > 0 ? [t('progress.active', { active: counts.active })] : [],
    ...counts.pending > 0 ? [t('progress.pending', { pending: counts.pending })] : [],
  ]
}

/**
 * The joined progress summary the pill shows and the panel heads with.
 * @param todos - a non-empty todo list.
 * @param t - namespace-bound translator.
 * @returns the localized summary.
 */
export function progressText(todos: readonly TodoItem[], t: TodoPillTranslate): string {
  return progressSegments(todos, t).join(SEPARATOR)
}

/**
 * Compact reading for narrow header rows.
 * @param todos - a non-empty todo list.
 * @param t - namespace-bound translator.
 * @returns completed over total, for example 2/5.
 */
export function fractionText(todos: readonly TodoItem[], t: TodoPillTranslate): string {
  const counts = countTodos(todos)
  return t('fraction', { done: counts.done, total: counts.total })
}

/**
 * Accessible name of the pill: the surface title plus the full summary.
 * @param todos - a non-empty todo list.
 * @param t - namespace-bound translator.
 * @returns the localized name.
 */
export function ariaText(todos: readonly TodoItem[], t: TodoPillTranslate): string {
  return t('aria.pill', { title: t('title'), progress: progressText(todos, t) })
}

/**
 * Map a Todo lifecycle state onto the shared compact status language.
 * @param status - todo lifecycle state.
 * @returns the StateDot state to draw beside the item.
 */
export function statusState(status: TodoItem['status']): 'done' | 'ongoing' | 'idle' {
  switch (status) {
    case 'completed': return 'done'
    case 'in_progress': return 'ongoing'
    case 'pending': return 'idle'
    /* v8 ignore next -- closed TodoItem status union */
    default: return assertNever(status)
  }
}

/**
 * Localized status name for the panel row's screen-reader label.
 * @param status - todo lifecycle state.
 * @param t - namespace-bound translator.
 * @returns the localized status.
 */
export function statusLabel(status: TodoItem['status'], t: TodoPillTranslate): string {
  switch (status) {
    case 'completed': return t('status.completed')
    case 'in_progress': return t('status.inProgress')
    case 'pending': return t('status.pending')
    /* v8 ignore next -- closed TodoItem status union */
    default: return assertNever(status)
  }
}
