/**
 * Files view plugin, node half. No host-side behavior — this plugin is
 * browser-only: directory listing rides the existing workspaces browse
 * capability and file content comes from the session snapshot. The browser
 * half ships via exports["./client"], discovered through the package.json
 * dsh.client declaration.
 */
export function apply() {}
