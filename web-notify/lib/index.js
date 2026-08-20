/**
 * Browser notification plugin, node half (notification-v2.md Part B.2.1).
 * Pure client plugin: the empty apply exists so the plugin appears in the host
 * cordis.yml / Loader roster; the browser half ships via exports["./client"],
 * discovered through the package.json dsh.client declaration (same pattern as
 * ui-file-mentions). No host-side behavior — notifications fire in the browser
 * only, through the Web Notification API.
 */
export function apply() {}
