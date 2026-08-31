# @deepseek-ai/dsh-client-ui-edits — per-turn "Edits" view

A pure-frontend client plugin for DeepSeek Harness's web GUI. It records every
file mutation the agent performs — the `edit` and `write` tool results that
carry `FsDiffMeta` (`tool/result.meta.diffs`) in the session log — and shows
them grouped per turn in a new **Edits** tab of the conversation view.

## Status: INTEGRATED AND LIVE

Registered into the **running web GUI** at http://127.0.0.1:34585 via the
user profile (no harness-tree changes):

- Package: `/home/zhoupeng/.dsh/packages/client/ui-edits` (mirrors the harness
  `packages/client/ui-edits` layout so the real `clientBundle` tsdown preset runs).
- Loader entry: `insert` row in `/home/zhoupeng/.dsh/profiles/web/cordis.patch.yml`
  (id `ui-edits`, name `@deepseek-ai/dsh-client-ui-edits`).
- Resolution: symlink `/home/zhoupeng/.dsh/profiles/node_modules/@deepseek-ai/dsh-client-ui-edits`
  → this package (profile `node_modules` is the installation fallback).
- Verified live: the `/plugins/events` boot graph contains the
  `@deepseek-ai/dsh-client-ui-edits` entry (application phase) and its bundle
  route serves `window.__ModuleLoader__.load({ id, factory }) -> { apply, inject }`.

Refresh the GUI browser tab to activate the tab (the boot graph is re-read on
page load; the patch itself was applied by the profile's `patchReload: live`
watcher without restarting the server).

## How it works

- Reads **only persisted session events** (`tool/call` + `tool/result` with
  `meta.diffs`), so the view is replay-safe: the same records appear after a
  reload or session resume, with no extra storage.
- Groups changes per turn ("Turn 1", "Turn 2", …), ordered by landing seq.
- Renders each change with a plugin-owned inline diff (collapsible): removed
  lines on a dark red background, added lines on a dark green background, and
  the code always syntax-highlighted for well-known code extensions
  (`.ts`/`.js`/`.py`/`.go`/`.json`/…), plus the tool badge (`edit`/`write`),
  the file path, and an optional error marker.
- Registers exactly like `ui-trajectory`: a conversation view target
  (`edits`), one event Definition, a `useEdits` session hook, and one
  `conversation.view` tab — no service, no host-side code, no model-visible
  changes.

## Layout

```
packages/client/ui-edits/
  package.json            # @deepseek-ai/dsh-client-ui-edits (drop-in)
  tsconfig.json           # standalone build config (jsx react-jsx; see note)
  tsdown.config.ts        # clientBundle preset (harness-relative import)
  lib/                    # BUILT artifacts (tsdown output)
    client.js             #   browser bundle (loader handoff format)
    index.js, invariant.js#   node half
    types/                #   node-half hand-written entries (see note)
  src/index.ts            # host loader entry (no host behavior)
  src/invariant.ts        # invariant companion
  src/client/index.ts     # plugin body: views/events/hooks/slot registration
  src/client/edits-contract.ts        # EditsSnapshot/EditsEntry types + augmentations
  src/client/edits-definition.ts      # event state machine (match/start/update/buildViewNode)
  src/client/edits-snapshot-builder.ts# per-turn aggregation builder
  src/client/EditsView.tsx            # tab component
  src/client/EditsView.module.css
  src/client/EditsDiff.tsx            # inline diff renderer (backgrounds + highlighting)
  src/client/EditsDiff.module.css     # diff colors and syntax token colors
  src/client/edits-lang.ts            # extension -> language hint
  src/client/edits-highlight.ts       # line tokenizer
  src/client/locales.ts               # zh/en namespace 'edits'
  tests/edits-builder.client.spec.ts  # pure logic spec (all green)
  tests/edits-highlight.client.spec.ts# tokenizer + lang-mapping spec
  tests/client-bundle.client.spec.ts  # built-bundle spec (harness vitest)
```

## Notes

- **Build toolchain** (tsdown 0.22, lightningcss, typescript) is installed at the
  workspace root (`/home/zhoupeng/.dsh`) with the copied build preset files
  (`packages/client/tsdown.client.ts` + leaf modules, `scripts/client-build-environment.ts`,
  `tsconfig.base*.json`) so the harness `clientBundle` pipeline runs fully in
  the workspace. Rebuild after source edits:
  ```bash
  cd /home/zhoupeng/.dsh/packages/client/ui-edits
  /home/zhoupeng/.dsh/node_modules/.bin/tsdown
  ```
- **tsconfig.json** here is the standalone build config. When (if ever) this
  package is dropped into the harness checkout, restore the harness tsconfig
  (`extends ../../../tsconfig.base.client.json` + project references).
- **lib/types/index.js + invariant.js** are hand-written node-half entries (the
  clientBundle preset consumes them as the node-half entry points; they are
  trivial — a no-op `apply` and the invariant companion).
- **Removal**: delete the `insert` row from `profiles/web/cordis.patch.yml` and
  the symlink; the live watcher recomposes without the plugin.
