/** Composer-pill row dictionaries for the General settings section. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.composer-pills'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '内置统计胶囊',
  'description': '隐藏聊天输入框下方的内置统计胶囊（运行状态与用量）以及上下文用量表。',
  'hide': '隐藏内置胶囊',
} as const

/** The composer-pill row dictionary key union. */
export type ComposerPillsKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete composer-pill row copy. */
    'settings.composer-pills': ComposerPillsKey
  }
}

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<ComposerPillsKey, string> = {
  'title': 'Builtin composer pills',
  'description': 'Hide the shipped statistics pills (activity and usage) and the context-usage meter below the chat input.',
  'hide': 'Hide builtin pills',
}
