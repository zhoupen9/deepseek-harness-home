/** `changes` namespace dictionaries for the Changes view surface. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'changes'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'view.changes': '变更',
  'empty.noChanges': '本会话尚未产生文件变更。',
  'summary.files': '{count} 个文件',
  'older.load': '加载更早的变更',
  'older.loading': '正在加载…',
  'status.created': '新建',
  'status.modified': '已修改',
  'entry.turn': '第 {turn} 轮',
  'entry.approximated': '部分区域按变更顺序近似合并（无法精确锚定）',
  'diff.copy': '复制',
  'diff.copied': '已复制',
  'diff.collapse': '收起',
  'diff.collapseAria': '收起差异',
  'diff.expand': '展开（隐藏 {hidden} 行）',
  'diff.expandAria': '展开差异（隐藏 {hidden} 行）',
  'diff.files': '{count} 个文件',
} as const

/** The changes dictionary key union. */
export type ChangesKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete Changes view copy. */
    changes: ChangesKey
  }
}

/** Namespace-bound translator threaded through Changes presentation code. */
export type ChangesTranslate = import('@deepseek-ai/dsh-client-ui-slots').TranslateNS<typeof NS>

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<ChangesKey, string> = {
  'view.changes': 'Changes',
  'empty.noChanges': 'No file changes in this session yet.',
  'summary.files': '{count} files',
  'older.load': 'Load earlier changes',
  'older.loading': 'Loading…',
  'status.created': 'Created',
  'status.modified': 'Modified',
  'entry.turn': 'Turn {turn}',
  'entry.approximated': 'Some regions merged in change order (could not be anchored exactly)',
  'diff.copy': 'Copy',
  'diff.copied': 'Copied',
  'diff.collapse': 'Collapse',
  'diff.collapseAria': 'Collapse diff',
  'diff.expand': 'Expand ({hidden} hidden lines)',
  'diff.expandAria': 'Expand diff ({hidden} hidden lines)',
  'diff.files': '{count} files',
}
