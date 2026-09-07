# ui-session-metrics — profile integration record

Pure-consumer chat-header session metrics, done entirely in user space per
the usual direction (nothing under /usr/lib/deepseek-harness is touched;
everything lives in /home/zhoupeng/.dsh).

## What replaces what

- **Added**: a compact metrics capsule in the Session Header, left of the
  "Session log" download button (slot `conversation.session.header.tabs.utilities`,
  entry id `session-metrics`, order -1). Hover/focus opens the details panel.
- **Replaced**: the bottom-of-chat metrics strip — ui-chat's StatsLine row
  (slot `conversation.composer.dock`, entry id `stats`, priority 0). This
  plugin registers the same cell id at priority -1 (same-id cells clash only
  at equal priority; lowest priority renders) with an empty occupant, so the
  strip disappears while the plugin is mounted and its content is served by
  the header capsule instead. The shipped entry is shadowed, not unloaded.

## Steps taken

1. Built `lib/` with the workspace toolchain (tsdown + lightningcss at
   /home/zhoupeng/.dsh; shared preset under `packages/client/`).
2. Symlinked the package into the profile install fallback:
   `profiles/node_modules/@deepseek-ai/dsh-client-ui-session-metrics` →
   `packages/client/ui-session-metrics`.
3. Inserted the loader entry into `profiles/web/cordis.patch.yml`:
   ```yaml
   - insert:
       - id: ui-session-metrics
         name: '@deepseek-ai/dsh-client-ui-session-metrics'
   ```
   The web profile's `patchReload: live` recomposes the running loader — no
   server restart. A page refresh loads the new client bundle.

## Rebuild after source edits

```bash
cd /home/zhoupeng/.dsh/packages/client/ui-session-metrics
/home/zhoupeng/.dsh/node_modules/.bin/tsdown
/home/zhoupeng/.dsh/node_modules/.bin/vitest run tests/session-metrics.client.spec.ts
```

## Verification

- Boot graph (`GET /plugins/events`) carries the row
  `@deepseek-ai/dsh-client-ui-session-metrics` with inject
  `["slots","locale"]`.
- Bundle route `/plugins/…client.js&rev=…` → HTTP 200 with the
  `window.__ModuleLoader__.load({ id: "@deepseek-ai/dsh-client-ui-session-metrics", …})`
  handoff; bundle requires only baseline module-table rows (react,
  react/jsx-runtime, react-dom).
- Behavior: the bottom stats strip is gone; the header capsule shows
  cache-rate / input / output for a session with usage and opens the details
  panel on hover; disabling the patch row restores the shipped strip.

## Rollback

Remove the `ui-session-metrics` insert row from `profiles/web/cordis.patch.yml`
and delete `profiles/node_modules/@deepseek-ai/dsh-client-ui-session-metrics`.
The shipped StatsLine strip and the header are restored exactly (the shadowed
`stats` cell re-emerges once this plugin's entry disappears).
