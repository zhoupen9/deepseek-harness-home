/** `edits` namespace dictionaries for the Edits view surface. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'edits'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'view.edits': '编辑',
  'empty.noEdits': '本会话尚未产生文件修改。',
  'turn.label': '第 {turn} 轮',
  'turn.collapseAria': '收起第 {turn} 轮修改',
  'turn.expandAria': '展开第 {turn} 轮修改',
  'older.load': '加载更早的修改',
  'older.loading': '正在加载…',
  'kind.edit': '编辑',
  'kind.write': '写入',
  'kind.unknown': '修改',
  'entry.error': '失败',
  'diff.copy': '复制',
  'diff.copied': '已复制',
  'diff.collapse': '收起',
  'diff.collapseAria': '收起差异',
  'diff.expand': '展开（隐藏 {hidden} 行）',
  'diff.expandAria': '展开差异（隐藏 {hidden} 行）',
  'diff.files': '{count} 个文件',
} as const

/** The edits dictionary key union. */
export type EditsKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete Edits view copy. */
    edits: EditsKey
  }
}

/** Namespace-bound translator threaded through Edits presentation code. */
export type EditsTranslate = import('@deepseek-ai/dsh-client-ui-slots').TranslateNS<typeof NS>

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<EditsKey, string> = {
  'view.edits': 'Edits',
  'empty.noEdits': 'No file changes in this session yet.',
  'turn.label': 'Turn {turn}',
  'turn.collapseAria': 'Collapse turn {turn}',
  'turn.expandAria': 'Expand turn {turn}',
  'older.load': 'Load earlier edits',
  'older.loading': 'Loading…',
  'kind.edit': 'Edit',
  'kind.write': 'Write',
  'kind.unknown': 'Change',
  'entry.error': 'Failed',
  'diff.copy': 'Copy',
  'diff.copied': 'Copied',
  'diff.collapse': 'Collapse',
  'diff.collapseAria': 'Collapse diff',
  'diff.expand': 'Expand ({hidden} hidden lines)',
  'diff.expandAria': 'Expand diff ({hidden} hidden lines)',
  'diff.files': '{count} files',
}
