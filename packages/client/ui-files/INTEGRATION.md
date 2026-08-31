# How this plugin is integrated (record)

Goal: add a pure-frontend client plugin to the running DeepSeek Harness web GUI
**without modifying the read-only harness tree** (`/usr/lib/deepseek-harness`).

## Mechanism (all user-space, under `~/.dsh`)

1. **Package** at `packages/client/ui-files` — mirrors the harness
   `packages/client/ui-files` layout so the real `clientBundle` tsdown preset
   (`../tsdown.client.ts`) runs unchanged.
2. **Built bundle** — `lib/client.js` produced by tsdown with the harness
   preset: `window.__ModuleLoader__.load({ id, factory })`, externals resolved
   from the platform module table (`react/jsx-runtime`,
   `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-store`,
   `@deepseek-ai/dsh-client-ui-slots`), CSS modules compiled and injected.
3. **Resolution** — `profiles/node_modules/@deepseek-ai/dsh-client-ui-files`
   symlinks to the package. The profile `node_modules` is the installation
   fallback (app-boot `healProfilesModuleFallback`); Node resolution from the
   profile anchor resolves the name.
4. **Loader entry** — `profiles/web/cordis.patch.yml` gains:
   ```yaml
   - insert:
       - id: ui-files
         name: '@deepseek-ai/dsh-client-ui-files'
   ```
   The web profile has `patchReload: live`, so the edit was applied to the
   running app without restart.

## Verified (against the live server)

- `GET /plugins/events` (SSE, public) boot graph contains
  `{"id":"@deepseek-ai/dsh-client-ui-files","url":"/plugins/??…&rev=…-48","inject":[7 services]}`
  in the application phase.
- The bundle route serves HTTP 200 with the built artifact; evaluating it
  yields the loader handoff and `{ apply, inject }` (covered by
  `tests/client-bundle.node.spec.ts`).
- Pure-logic + smoke specs: 36/36 passing.

## Rebuild / update after source edits

```bash
cd /home/zhoupeng/.dsh/packages/client/ui-files
/home/zhoupeng/.dsh/node_modules/.bin/tsdown
```
Bundle bytes change → new revision; the running app's client-modules picks up
the artifact; a browser refresh activates the new code.

## Rollback

Remove the `insert` row from `profiles/web/cordis.patch.yml` (watcher
recomposes) and delete the symlink.

## Why not the harness tree

The harness checkout is read-only for this session (sandbox denials). The
profile mechanism is the supported user-space extension point anyway: loader
entries are composed at runtime from enabled entries, and the client-modules
host scans them incrementally — no shell/web rebuild needed for a new plugin.
