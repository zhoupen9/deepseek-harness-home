/** `git` namespace dictionaries for the Git view surface. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'git'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'view.git': 'Git',
  'empty.requiresHost': '此标签页需要宿主端的 git 远程接口才能读取提交历史。请参阅 packages/client/ui-git 下的 HOST_PRIMITIVES.md。',
  'empty.noWorkspace': '当前会话没有可用的工作区根目录。',
  'empty.noCommits': '该仓库还没有任何提交。',
  'empty.notRepo': '当前工作区不在 git 仓库内。',
  'loading': '正在加载历史…',
  'error.failed': '加载 git 历史失败：',
  'log.traversalLabel': '历史遍历方式',
  'log.loadMore': '加载更多',
  'log.loadingMore': '加载更多…',
  'details.loading': '正在加载提交详情…',
  'details.notFound': '找不到该提交。',
  'details.close': '关闭详情',
  'details.hash': '哈希',
  'details.author': '作者',
  'details.committer': '提交者',
  'details.parents': '父提交',
  'details.message': '提交说明',
  'details.files': '变更文件',
  'details.diff': '差异',
  'details.diffTruncated': '差异已截断',
  'status.added': '新增',
  'status.deleted': '删除',
  'status.modified': '修改',
  'status.renamed': '重命名',
  'status.copied': '复制',
  'status.typechanged': '类型变更',
  'status.unmerged': '未合并',
} as const

/** The git dictionary key union. */
export type GitKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete Git view copy. */
    git: GitKey
  }
}

/** Namespace-bound translator threaded through Git presentation code. */
export type GitTranslate = import('@deepseek-ai/dsh-client-ui-slots').TranslateNS<typeof NS>

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<GitKey, string> = {
  'view.git': 'Git',
  'empty.requiresHost': 'This tab needs a host-side git remote to read commit history. See HOST_PRIMITIVES.md under packages/client/ui-git.',
  'empty.noWorkspace': 'This session has no workspace root.',
  'empty.noCommits': 'This repository has no commits yet.',
  'empty.notRepo': 'The workspace is not a git repository.',
  'loading': 'Loading history…',
  'error.failed': 'Failed to load git history: ',
  'log.traversalLabel': 'History traversal',
  'log.loadMore': 'Load more',
  'log.loadingMore': 'Loading more…',
  'details.loading': 'Loading commit details…',
  'details.notFound': 'Commit not found.',
  'details.close': 'Close details',
  'details.hash': 'Hash',
  'details.author': 'Author',
  'details.committer': 'Committer',
  'details.parents': 'Parents',
  'details.message': 'Message',
  'details.files': 'Files changed',
  'details.diff': 'Diff',
  'details.diffTruncated': 'Diff truncated',
  'status.added': 'added',
  'status.deleted': 'deleted',
  'status.modified': 'modified',
  'status.renamed': 'renamed',
  'status.copied': 'copied',
  'status.typechanged': 'type changed',
  'status.unmerged': 'unmerged',
}
