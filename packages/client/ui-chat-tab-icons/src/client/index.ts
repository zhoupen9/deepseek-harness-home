/**
 * Browser chat-tab-icons plugin: prepends one shipped icon to each conversation
 * view tab — Chat, Trajectory, Edits, Changes, and Git.
 *
 * The decoration rides two renderer seams and patches no shipped package:
 * - `ctx.slots.entries('conversation.view')` yields the registered view ids in
 *   tab order, so tabs are matched by id rather than by label text: a locale
 *   switch cannot break the mapping, and a view this plugin does not know
 *   keeps its plain tab.
 * - every slot render site exposes the renderer's `[data-slot="<key>"]` anchor
 *   (a `display: contents` wrapper), so the session strip is the
 *   `[role="tablist"]` inside `[data-slot="conversation.session"]` whose tab
 *   count equals the view-entry count; any other tab row is left alone.
 *
 * Each icon is rendered once from its shipped `ui-primitives` component and
 * cloned into the tab button, so React never owns a child this plugin moved.
 * A `MutationObserver` re-applies after the shell re-renders the strip (a
 * view registering or unregistering, a session switch), filtered to mutations
 * that actually touch a tab list so streaming transcript churn costs nothing.
 */
import { createElement, type ComponentType } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  IconBranchOutline16,
  IconCodeOutline16,
  IconEditOutline16,
  IconNewChatOutline16,
  IconThinkOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: the `conversation.view` SlotMap row this plugin reads.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { hasTabIcon, isSessionTabRow, type TabIconId } from './tab-icons.ts'
import css from './TabIcons.module.css'

/** Required service: the slot registry that owns the view entries. */
export const inject = ['slots']

/** Shipped icon drawn on each decorated view tab. */
const TAB_ICONS: Readonly<Record<TabIconId, ComponentType<{ className?: string }>>> = {
  chat: IconNewChatOutline16,
  trajectory: IconThinkOutline16,
  edits: IconEditOutline16,
  changes: IconCodeOutline16,
  git: IconBranchOutline16,
}

/**
 * Render-site anchors that own the tab strip, most specific first. The strip
 * lives in the conversation header's slot anchor; the session anchor stays as
 * a second candidate because the header is projected inside the session
 * surface.
 */
const STRIP_ANCHORS = [
  '[data-slot="conversation.session.header"]',
  '[data-slot="conversation.session"]',
] as const

/** Selector matching every rendered tab row. */
const TABLIST = '[role="tablist"]'

/** Selector matching one tab inside a rendered row. */
const TAB = '[role="tab"]'

/**
 * Render every decorated icon once and keep a detached clone of each.
 * @returns the icon node per view id.
 */
function buildTabIcons(): Map<string, SVGElement> {
  const icons = new Map<string, SVGElement>()
  for (const [id, Icon] of Object.entries(TAB_ICONS)) {
    const holder = document.createElement('span')
    const root = createRoot(holder)
    flushSync(() => { root.render(createElement(Icon, { className: css.icon })) })
    const rendered = holder.firstElementChild
    const icon = rendered === null ? null : rendered.cloneNode(true) as SVGElement
    root.unmount()
    if (icon !== null) icons.set(id, icon)
  }
  return icons
}

/**
 * Whether a mutation batch can change the tab strip. Transcript and composer
 * churn mutates other subtrees continuously, so every record is screened
 * before the decoration pass is scheduled.
 * @param records - one MutationObserver batch.
 * @returns true when a record touched a tab row or introduced one.
 */
/** Element node type; the realm-safe test for a DOM element. */
const ELEMENT_NODE = 1

/**
 * Narrow a mutation target or added node to an element.
 * @param node - node observed by the mutation record.
 * @returns the element, or null for text, comment, and document nodes.
 */
function asElement(node: Node): Element | null {
  return node.nodeType === ELEMENT_NODE ? node as Element : null
}

function touchesTabStrip(records: readonly MutationRecord[]): boolean {
  return records.some(record => {
    const target = asElement(record.target)
    if (target !== null && target.closest(TABLIST) !== null) return true
    for (const node of record.addedNodes) {
      const element = asElement(node)
      if (element !== null && (element.matches(TABLIST) || element.querySelector(TABLIST) !== null)) return true
    }
    return false
  })
}

/**
 * Candidate tab rows, most specific anchor first. Falling back to every
 * rendered row keeps a shell change that moves the strip from silently
 * disabling the decoration: the tab-count check is what identifies the strip.
 * @returns the tab rows to consider.
 */
function findTabRows(): Element[] {
  for (const anchor of STRIP_ANCHORS) {
    const surface = document.querySelector(anchor)
    if (surface === null) continue
    const rows = Array.from(surface.querySelectorAll(TABLIST))
    if (rows.length > 0) return rows
  }
  return Array.from(document.querySelectorAll(TABLIST))
}

/**
 * Place the icons on the session tab row, in view order.
 * @param icons - icon node per view id.
 * @param viewIds - registered view ids, in tab order.
 */
function decorateTabRow(
  icons: ReadonlyMap<string, SVGElement>,
  viewIds: readonly (string | undefined)[],
): void {
  for (const tablist of findTabRows()) {
    const tabs = Array.from(tablist.querySelectorAll(TAB))
    if (!isSessionTabRow(tabs.length, viewIds.length)) continue
    tabs.forEach((tab, index) => {
      const id = viewIds[index]
      const icon = hasTabIcon(id) ? icons.get(id) : undefined
      /* v8 ignore next -- an icon already in its tab is the steady state. */
      if (icon === undefined || icon.parentElement === tab) return
      tab.prepend(icon)
    })
  }
}

/**
 * Client plugin body: decorate the view tabs while the `conversation.view`
 * slot is declared, and remove everything it added when it is not.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.slots.inject('conversation.view', () => {
    const icons = buildTabIcons()
    const decorate = (): void => {
      decorateTabRow(icons, ctx.slots.entries('conversation.view').map(entry => entry.options.id))
    }
    let scheduled = false
    const schedule = (records: readonly MutationRecord[]): void => {
      if (scheduled || !touchesTabStrip(records)) return
      scheduled = true
      queueMicrotask(() => {
        scheduled = false
        decorate()
      })
    }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    decorate()
    return () => {
      observer.disconnect()
      for (const icon of icons.values()) icon.remove()
    }
  })
}
