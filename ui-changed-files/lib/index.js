/**
 * Changed-files pane plugin, node half. No host-side behavior — this plugin is
 * browser-only: the right-side pane renders purely from the client session
 * snapshot. The browser half ships via exports["./client"], discovered through
 * the package.json dsh.client declaration.
 */
export function apply() {}
