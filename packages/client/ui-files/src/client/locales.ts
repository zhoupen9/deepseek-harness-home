/** `files` namespace dictionaries for the Files view surface. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'files'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'view.files': '文件',
  'empty.noFiles': '本会话尚未触及任何文件。',
  'content.noContent': '该文件没有可显示的内容。',
  'content.loading': '正在加载内容…',
  'content.loadError': '无法读取该文件。',
  'content.binary': '二进制文件，无法以文本形式显示。',
  'content.partial': '部分内容（会话日志仅含被触及的区域）',
  'content.truncated': '已显示前 {shown} 行 / 共 {total} 行',
  'content.hostTruncated': '内容已截断（超过读取上限）',
  'content.window': '显示 {shown} / {total} 行',
  'content.copy': '复制',
  'content.copied': '已复制',
  'content.collapse': '收起',
  'content.collapseAria': '收起内容',
  'content.expand': '展开（隐藏 {hidden} 行）',
  'content.expandAria': '展开内容（隐藏 {hidden} 行）',
  'content.search': '搜索',
  'content.searchPlaceholder': '搜索文件内容…',
  'content.searchClose': '关闭搜索',
  'content.searchPrev': '上一个匹配',
  'content.searchNext': '下一个匹配',
  'content.noMatches': '无匹配',
  'status.created': '新建',
  'status.modified': '已修改',
  'status.read': '已读',
  'older.load': '加载更早的文件',
  'older.loading': '正在加载…',
  'tree.directory': '目录',
  'tree.file': '文件',
  'explorer.showHidden': '显示隐藏文件',
  'explorer.refresh': '刷新',
  'explorer.loading': '加载中…',
  'explorer.loadError': '目录加载失败：',
  'explorer.truncated': '条目过多，仅显示开头部分。',
} as const

/** The files dictionary key union. */
export type FilesKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete Files view copy. */
    files: FilesKey
  }
}

/** Namespace-bound translator threaded through Files presentation code. */
export type FilesTranslate = import('@deepseek-ai/dsh-client-ui-slots').TranslateNS<typeof NS>

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<FilesKey, string> = {
  'view.files': 'Files',
  'empty.noFiles': 'No files touched in this session yet.',
  'content.noContent': 'No content available for this file.',
  'content.loading': 'Loading content…',
  'content.loadError': 'This file could not be read.',
  'content.binary': 'Binary file — cannot be shown as text.',
  'content.partial': 'Partial content (session log only shows touched regions)',
  'content.truncated': 'Showing first {shown} of {total} lines',
  'content.hostTruncated': 'Content truncated (read limit)',
  'content.window': 'Showing {shown} of {total} lines',
  'content.copy': 'Copy',
  'content.copied': 'Copied',
  'content.collapse': 'Collapse',
  'content.collapseAria': 'Collapse content',
  'content.expand': 'Expand ({hidden} hidden lines)',
  'content.expandAria': 'Expand content ({hidden} hidden lines)',
  'content.search': 'Search',
  'content.searchPlaceholder': 'Search in file…',
  'content.searchClose': 'Close search',
  'content.searchPrev': 'Previous match',
  'content.searchNext': 'Next match',
  'content.noMatches': 'No matches',
  'status.created': 'Created',
  'status.modified': 'Modified',
  'status.read': 'Read',
  'older.load': 'Load earlier files',
  'older.loading': 'Loading…',
  'tree.directory': 'Directory',
  'tree.file': 'File',
  'explorer.showHidden': 'Show hidden files',
  'explorer.refresh': 'Refresh',
  'explorer.loading': 'Loading…',
  'explorer.loadError': 'Failed to load directory: ',
  'explorer.truncated': 'Too many entries; only the beginning is shown.',
}
