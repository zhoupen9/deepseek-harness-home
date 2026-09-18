/**
 * Pure predicates behind the chat-tab icon decoration: which conversation view
 * ids the plugin draws an icon for, and which rendered tab row is the session
 * view strip. Kept apart from the DOM work, so both rules are testable without
 * a browser.
 */

/** View ids this plugin decorates, in the order the shipped views register. */
export const TAB_ICON_IDS = ['chat', 'trajectory', 'edits', 'changes', 'git'] as const

/** One decorated view id. */
export type TabIconId = (typeof TAB_ICON_IDS)[number]

/**
 * Whether the plugin draws an icon for a view id. An id the plugin does not
 * know — a view another plugin registers later — simply keeps its plain tab.
 * @param id - view id projected from a `conversation.view` entry, or undefined.
 * @returns true when the id is one of the decorated views.
 */
export function hasTabIcon(id: string | undefined): id is TabIconId {
  return id !== undefined && (TAB_ICON_IDS as readonly string[]).includes(id)
}

/**
 * Whether a rendered tab row is the session view strip. That strip carries
 * exactly one tab per registered `conversation.view` entry, because the
 * conversation shell projects one tab per entry; any other `tablist` on the
 * page (a settings surface, a third-party panel) is left alone.
 * @param tabCount - tabs rendered in the candidate row.
 * @param viewCount - registered `conversation.view` entries.
 * @returns true when the row maps one-to-one onto the view entries.
 */
export function isSessionTabRow(tabCount: number, viewCount: number): boolean {
  return tabCount > 1 && tabCount === viewCount
}
