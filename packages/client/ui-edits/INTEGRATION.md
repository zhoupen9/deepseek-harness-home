# How this plugin is integrated (record)

Goal: add a pure-frontend client plugin to the running DeepSeek Harness web GUI
**without modifying the read-only harness tree** (`/usr/lib/deepseek-harness`).

## Mechanism (all user-space, under `~/.dsh`)

1. **Package** at `packages/client/ui-edits` — mirrors the harness
   `packages/client/ui-edits` layout so the real `clientBundle` tsdown preset
   (`../tsdown.client.ts`) runs unchanged.
2. **Built bundle** — `lib/client.js` produced by tsdown with the harness
   preset: `window.__ModuleLoader__.load({ id, factory })`, externals resolved
   from the platform module table (`react/jsx-runtime`,
   `@deepseek-ai/dsh-client-ui-primitives`), CSS modules compiled and injected.
3. **Resolution** — `profiles/node_modules/@deepseek-ai/dsh-client-ui-edits`
   symlinks to the package. The profile `node_modules` is the installation
   fallback (app-boot `healProfilesModuleFallback`); Node resolution from the
   profile anchor (the include plugin re-anchors the loader `baseUrl` to the
   profile directory) resolves the name.
4. **Loader entry** — `profiles/web/cordis.patch.yml` gains:
   ```yaml
   - insert:
       - id: ui-edits
         name: '@deepseek-ai/dsh-client-ui-edits'
   ```
   The web profile has `patchReload: live`, so the edit was applied to the
   running app without restart.

## Verified (against the live server)

- `GET /plugins/events` (SSE, public) boot graph contains
  `{"id":"@deepseek-ai/dsh-client-ui-edits","url":"/plugins/??…&rev=f38d39a0f481128c-46","inject":[…5 services…]}`
  in the application phase.
- The bundle route serves HTTP 200 with the built artifact; evaluating it
  yields the loader handoff and `{ apply, inject }` (smoke-tested).
- Unit logic spec: 13/13 passing.

## Rebuild / update after source edits

```bash
cd /home/zhoupeng/.dsh/packages/client/ui-edits
/home/zhoupeng/.dsh/node_modules/.bin/tsdown
```
Bundle bytes change → new revision; the running app's HMR/client-modules picks
up the artifact (bundle content reaches the graph through `rebuilt()`); a
browser refresh activates the new code.

## Rollback

Remove the `insert` row from `profiles/web/cordis.patch.yml` (watcher
recomposes) and delete the symlink.

## Why not the harness tree

The harness checkout is read-only for this session (sandbox denials). The
profile mechanism is the supported user-space extension point anyway: loader
entries are composed at runtime from enabled entries, and the client-modules
host scans them incrementally — no shell/web rebuild needed for a new plugin.
