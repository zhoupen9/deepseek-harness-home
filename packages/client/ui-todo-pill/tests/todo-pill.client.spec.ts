/**
 * Behavior spec for the To-dos pill's pure logic: the visibility gate,
 * per-status counts, the shipped progress ordering with zero-count omission,
 * the wide-space separator, the compact fraction, the accessible name, the
 * status-dot mapping, the registration descriptors, and zh/en dictionary
 * completeness.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime); typechecks fully under the harness tsconfig once the
 * package is dropped into packages/client/ui-todo-pill.
 */
import { describe, expect, it } from 'vitest'
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo/client'
import { en, zh, type TodoPillKey } from '../src/client/locales.ts'
import {
  ariaText,
  countTodos,
  fractionText,
  hasTodos,
  progressSegments,
  progressText,
  statusLabel,
  statusState,
} from '../src/client/todo-pill.ts'
import { DOCK_SHADOW, HEADER_ENTRY, SESSION_METRICS_ORDER } from '../src/client/registrations.ts'

/** Tiny namespace translator with {placeholder} interpolation. */
function translator(dictionary: Record<TodoPillKey, string>) {
  return (key: string, params?: Record<string, string | number>): string => {
    const template = dictionary[key as TodoPillKey] as string | undefined
    if (template === undefined) throw new Error('missing dictionary key: ' + key)
    let out = template
    for (const [name, value] of Object.entries(params ?? {})) {
      out = out.split('{' + name + '}').join(String(value))
    }
    return out
  }
}

const zhT = translator(zh)
const enT = translator(en)

/** En space around the middle dot, mirrored from the shipped card. */
const SEP = '\u2002\u00b7\u2002'

function item(content: string, status: TodoItem['status']): TodoItem {
  return { content, status }
}

const mixed: TodoItem[] = [
  item('read the failing spec', 'completed'),
  item('fix the fold', 'in_progress'),
  item('update the snapshot', 'pending'),
  item('push the branch', 'pending'),
]

describe('hasTodos', () => {
  it('rejects the pre-first-write and empty values', () => {
    expect(hasTodos(null)).toBe(false)
    expect(hasTodos(undefined)).toBe(false)
    expect(hasTodos([])).toBe(false)
  })

  it('accepts any non-empty list', () => {
    expect(hasTodos(mixed)).toBe(true)
  })
})

describe('countTodos', () => {
  it('splits a mixed list by lifecycle state', () => {
    expect(countTodos(mixed)).toEqual({ done: 1, active: 1, pending: 2, total: 4 })
  })

  it('counts single-status lists', () => {
    expect(countTodos([item('a', 'pending'), item('b', 'pending')]))
      .toEqual({ done: 0, active: 0, pending: 2, total: 2 })
    expect(countTodos([item('a', 'completed')]))
      .toEqual({ done: 1, active: 0, pending: 0, total: 1 })
  })
})

describe('progressSegments', () => {
  it('keeps the shipped order and drops zero-count segments', () => {
    expect(progressSegments(mixed, zhT)).toEqual(['1 已完成', '1 进行中', '2 待处理'])
    expect(progressSegments([item('a', 'in_progress')], zhT)).toEqual(['1 进行中'])
    expect(progressSegments([item('a', 'completed'), item('b', 'completed')], zhT)).toEqual(['2 已完成'])
    expect(progressSegments([item('a', 'pending')], enT)).toEqual(['1 pending'])
  })
})

describe('progressText', () => {
  it('joins the segments with the shipped wide-space separator', () => {
    expect(progressText(mixed, zhT)).toBe('1 已完成' + SEP + '1 进行中' + SEP + '2 待处理')
    expect(progressText(mixed, enT)).toBe('1 completed' + SEP + '1 in progress' + SEP + '2 pending')
  })
})

describe('fractionText', () => {
  it('reports completed over total for narrow header rows', () => {
    expect(fractionText(mixed, zhT)).toBe('1/4')
    expect(fractionText([item('a', 'pending')], enT)).toBe('0/1')
  })
})

describe('ariaText', () => {
  it('states the surface and the full summary', () => {
    expect(ariaText(mixed, enT)).toBe('To-dos: 1 completed' + SEP + '1 in progress' + SEP + '2 pending')
    expect(ariaText([item('a', 'pending')], zhT)).toBe('任务：1 待处理')
  })
})

describe('status mapping', () => {
  it('maps lifecycle state onto the shared compact status language', () => {
    expect(statusState('completed')).toBe('done')
    expect(statusState('in_progress')).toBe('ongoing')
    expect(statusState('pending')).toBe('idle')
  })

  it('names each state for the panel row', () => {
    expect(statusLabel('completed', zhT)).toBe('已完成')
    expect(statusLabel('in_progress', enT)).toBe('In progress')
    expect(statusLabel('pending', zhT)).toBe('待处理')
  })
})

describe('registration descriptors', () => {
  it('puts the pill in the header utilities left of the metrics capsule', () => {
    expect(HEADER_ENTRY).toEqual({
      name: 'conversation.session.header.utilities',
      id: 'todo-pill',
      order: -12,
    })
    expect(SESSION_METRICS_ORDER).toBe(-11)
    expect(HEADER_ENTRY.order).toBeLessThan(SESSION_METRICS_ORDER)
  })

  it('shadows the shipped composer card by reusing its cell at a lower priority', () => {
    expect(DOCK_SHADOW).toEqual({ name: 'conversation.input.dock', id: 'todo', priority: -1 })
    expect(DOCK_SHADOW.priority).toBeLessThan(0)
  })
})

describe('dictionaries', () => {
  it('keeps en complete against the zh source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('leaves no empty value', () => {
    for (const [key, value] of [...Object.entries(zh), ...Object.entries(en)]) {
      expect(value, key).not.toBe('')
    }
  })
})
