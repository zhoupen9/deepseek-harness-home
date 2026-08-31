# ui-changes — profile integration record

Mirror of ui-edits' integration, done entirely in user space per the user's
direction ("don't touch /usr/lib/deepseek-harness instead register in
/home/zhoupeng/.dsh/profiles").

## Steps taken

1. Built `lib/` with the workspace toolchain (tsdown 0.22 + lightningcss +
   typescript at /home/zhoupeng/.dsh; preset files copied under
   `packages/client/` + `scripts/`).
2. Symlinked the package into the profile install fallback:
   `profiles/node_modules/@deepseek-ai/dsh-client-ui-changes` →
   `packages/client/ui-changes`.
3. Inserted the loader entry into `profiles/web/cordis.patch.yml`:
   ```yaml
   - insert:
       - id: ui-changes
         name: '@deepseek-ai/dsh-client-ui-changes'
   ```
   The web profile's `patchReload: live` recomposed the running loader — no
   server restart.

## Verification (all against the live server, no auth channels)

- `GET /plugins/events` boot graph contains
  `{"id":"@deepseek-ai/dsh-client-ui-changes","url":"/plugins/??…/client.js&rev=…","inject":[…5 services]}`
  in the application phase.
- Bundle route `/plugins/??@deepseek-ai/dsh-client-ui-changes/client.js&rev=…`
  → HTTP 200, head is `window.__ModuleLoader__.load({ id: "@deepseek-ai/dsh-client-ui-changes", …})`.
- Node smoke eval of the served bundle: handoff id matches, exports are
  `['apply','inject']`, inject list `["slots","sessions","uiSession","uiConversation","locale"]`.
- 33/33 vitest specs green (reconstruction, net diff, definition, builder).

## Rebuild after source edits

```bash
cd /home/zhoupeng/.dsh/packages/client/ui-changes
/home/zhoupeng/.dsh/node_modules/.bin/tsdown
/home/zhoupeng/.dsh/node_modules/.bin/vitest run tests/changes-logic.client.spec.ts tests/changes-builder.client.spec.ts tests/changes-dispatch.client.spec.ts tests/changes-highlight.client.spec.ts
```
The served bundle is re-read from disk by the loader per page load (rev-hashed
by the profile watcher), so a rebuild + browser refresh is enough.

## Rollback

Remove the `ui-changes` insert row from `profiles/web/cordis.patch.yml` and
delete `profiles/node_modules/@deepseek-ai/dsh-client-ui-changes`.
