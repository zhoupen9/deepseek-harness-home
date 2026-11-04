/**
 * Registration descriptors for the To-dos pill, kept free of React and of the
 * browser CSS so unit specs can assert the wiring without a DOM.
 *
 * Two entries carry the move:
 * - the pill joins 'conversation.session.header.utilities' at order -12, one
 *   step left of the session-metrics capsule (order -11) and of the shipped
 *   'open-in-app' split button (order -10);
 * - the composer's To-dos cell ('conversation.input.dock', id 'todo') is
 *   shadowed by a null occupant at a lower priority. Same-id list entries
 *   coexist only at distinct priorities and the lowest live one renders, so
 *   the shipped card disappears while this plugin is mounted and comes back
 *   when it unloads.
 */

/** Header pill entry: the wide pill and its list panel. */
export const HEADER_ENTRY = {
  name: 'conversation.session.header.utilities',
  id: 'todo-pill',
  order: -12,
} as const

/** Composer dock cell occupied by the shipped To-dos card (ui-conversation's TodoDock). */
export const DOCK_SHADOW = {
  name: 'conversation.input.dock',
  // The shipped TodoDock cell id; reusing it addresses that card's cell.
  id: 'todo',
  // Below the shipped entry's default priority 0: the shadow occupant renders.
  priority: -1,
} as const

/**
 * Order of the neighbouring session-metrics capsule this pill sits left of.
 * Mirrored from that profile-local plugin so the drift guard can compare it.
 */
export const SESSION_METRICS_ORDER = -11
