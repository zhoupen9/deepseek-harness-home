# ui-chat-tab-icons — profile integration record

Pure-client view-tab decoration, done entirely in user space (nothing under
/usr/lib/deepseek-harness is touched; everything lives in /home/zhoupeng/.dsh).

## What it adds

One shipped icon on each conversation view tab: Chat, Trajectory, Edits,
Changes, Git. It owns no view, no slot entry, and no locale namespace — it only
decorates the tab row the conversation shell already renders, matching tabs by
the `conversation.view` entry order so nothing depends on label text.

## Steps taken

1. Built `lib/` with the workspace toolchain (tsdown + lightningcss at
   /home/zhoupeng/.dsh; shared preset under `packages/client/`).
2. Installed the package as a **profile-local dependency**:
   `dsh plugin --profile web add link:/home/zhoupeng/.dsh/packages/client/ui-chat-tab-icons`,
   which pnpm links under `profiles/web/node_modules/` — the only position
   runtime profile resolution reads.
3. Inserted the loader row into `profiles/web/cordis.patch.yml`:
   ```yaml
   - insert:
       - id: ui-chat-tab-icons
         name: '@deepseek-ai/dsh-client-ui-chat-tab-icons'
   ```
   The web profile's `patchReload: live` recomposes the running loader — no
   server restart. A page refresh loads the new client bundle.

## Rebuild after source edits

```bash
cd /home/zhoupeng/.dsh/packages/client/ui-chat-tab-icons
/home/zhoupeng/.dsh/node_modules/.bin/tsdown
/home/zhoupeng/.dsh/node_modules/.bin/vitest run tests/tab-icons.client.spec.ts
```

## Verification

- Boot graph (`GET /plugins/events`) carries the row
  `@deepseek-ai/dsh-client-ui-chat-tab-icons`.
- Bundle route `/plugins/…client.js&rev=…` → HTTP 200 with the loader
  handoff; the factory requires only baseline rows (react, react-dom,
  react-dom/client, ui-primitives).
- Behavior: the Chat, Trajectory, Edits, Changes, and Git tabs each show their
  icon before the label, all in one fixed caption tone — the selected tab's
  business-blue label does not tint its icon; a view registered later keeps a
  plain tab; unloading the plugin removes every icon.

## Rollback

Remove the `ui-chat-tab-icons` insert row from
`profiles/web/cordis.patch.yml` and drop the dependency with
`dsh plugin --profile web remove @deepseek-ai/dsh-client-ui-chat-tab-icons`.
The tab row returns to labels alone.
