/**
 * To-dos pill namespace dictionaries for the Session header surface.
 *
 * The title, progress, and status strings mirror ui-conversation's shipped
 * todo.* copy byte for byte, so the pill and the panel read exactly like the
 * card they replace; the two dictionaries stay complete against each other.
 */

/** Dictionary namespace owned by this plugin. */
export const NS = 'todo-pill'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '任务',
  'progress.done': '{done} 已完成',
  'progress.active': '{active} 进行中',
  'progress.pending': '{pending} 待处理',
  'status.completed': '已完成',
  'status.inProgress': '进行中',
  'status.pending': '待处理',
  'fraction': '{done}/{total}',
  'aria.pill': '{title}：{progress}',
} as const

/** The To-dos pill dictionary key union. */
export type TodoPillKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete To-dos pill copy. */
    'todo-pill': TodoPillKey
  }
}

/** Namespace-bound translator threaded through the pill's presentation code. */
export type TodoPillTranslate = import('@deepseek-ai/dsh-client-ui-slots').TranslateNS<typeof NS>

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<TodoPillKey, string> = {
  'title': 'To-dos',
  'progress.done': '{done} completed',
  'progress.active': '{active} in progress',
  'progress.pending': '{pending} pending',
  'status.completed': 'Completed',
  'status.inProgress': 'In progress',
  'status.pending': 'Pending',
  'fraction': '{done}/{total}',
  'aria.pill': '{title}: {progress}',
}
