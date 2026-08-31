# @deepseek-ai/dsh-client-ui-changes — cumulative "Changes" view

A pure-frontend client plugin for DeepSeek Harness's web GUI. It reads the same
persisted file-mutation records as the **Edits** plugin (`edit`/`write`
`tool/result` events carrying `FsDiffMeta` in `meta.diffs`, plus write-call
args for created files) but presents the **current difference** instead of the
per-turn history: for each file it folds the whole loaded window into one net
original → current diff and shows it in a new **Changes** tab.

## Status: INTEGRATED AND LIVE

Registered into the **running web GUI** at http://127.0.0.1:34585 via the
user profile (no harness-tree changes):

- Package: `/home/zhoupeng/.dsh/packages/client/ui-changes` (mirrors the
  harness `packages/client/ui-changes` layout so the real `clientBundle`
  tsdown preset runs).
- Loader entry: `insert` row in `/home/zhoupeng/.dsh/profiles/web/cordis.patch.yml`
  (id `ui-changes`, name `@deepseek-ai/dsh-client-ui-changes`).
- Resolution: symlink `/home/zhoupeng/.dsh/profiles/node_modules/@deepseek-ai/dsh-client-ui-changes`
  → this package (profile `node_modules` is the installation fallback).
- Verified live: the `/plugins/events` boot graph contains the
  `@deepseek-ai/dsh-client-ui-changes` entry (application phase) and its bundle
  route serves `window.__ModuleLoader__.load({ id, factory }) -> { apply, inject }`.

Refresh the GUI browser tab to activate the tab (the boot graph is re-read on
page load; the patch itself was applied by the profile's `patchReload: live`
watcher without restarting the server).

## How it differs from ui-edits

| | Edits (ui-edits) | Changes (ui-changes) |
| --- | --- | --- |
| Unit | every applied result, grouped per turn | one card per file |
| Content | each result's hunk diff | the file's NET difference (original regions at first in-window mutation vs. current state) |
| Writes | result hunks only | created files reconstructed from the call's `content` |
| Diff style | custom `EditsDiff` (dark red/green +/- backgrounds, syntax highlighting) | custom `NetDiff` (aligned LCS diff with context rows, gap separators, dark red/green +/- backgrounds, syntax highlighting) |

## How it works

- **Definition** (`changes-definition.ts`): starts a Context on every
  `edit`/`write` call — both ordinary `tool/call`/`tool/result` pairs (settling
  on any result; a write-create carries no hunks meta, so its content comes from
  the call args) and nested PTC-mode `tool/code-dispatch-start`/`tool/code-dispatch`
  pairs (whose mutations are reconstructed from the dispatch arguments, since PTC
  mode logs no result `meta`). It projects one `ChangeMutation` per applied change:
  `hunks` (edit results / write updates) or `create` (write-create, content from
  the call args). Failed results are dropped — a failed edit changed nothing.
- **Reconstruction** (`changes-reconstruct.ts`): per file, folds the mutation
  stream (ascending seq) into one original/current document pair. Hunks patch in
  place when their context anchors; a region never seen before appends as its
  own block (marked `degraded` — the delta is still correct, only ordering is
  approximate). A create resets to the whole-file content, so later edits merge
  cleanly against it.
- **View** (`ChangesView.tsx` + `changes-diff.ts`): per-file cards sorted
  most-recently-changed first, each with a status badge (Created/Modified), the
  path, an aligned LCS net diff (2 context lines per change region, gaps,
  head/tail collapse, copy button, +added -removed footer) with dark red
  removed / dark green added backgrounds and syntax highlighting for well-known
  code extensions, the last-touch turn
  and time, and a degraded marker when reconstruction was approximate. A
  "Load earlier changes" button pages the window, like Edits/Trajectory.
- Reads **only persisted session events**, so the view is replay-safe.
- Registers exactly like `ui-trajectory`/ui-edits: a conversation view target
  (`changes`), one event Definition, a `useChanges` session hook, and one
  `conversation.view` tab (order 21, right after Edits) — no service, no
  host-side code, no model-visible changes.

## Layout

```
packages/client/ui-changes/
  package.json            # @deepseek-ai/dsh-client-ui-changes (drop-in)
  tsconfig.json           # standalone build config (jsx react-jsx; see note)
  tsdown.config.ts        # clientBundle preset (harness-relative import)
  lib/                    # BUILT artifacts (tsdown output)
    client.js             #   browser bundle (loader handoff format)
    index.js, invariant.js#   node half
    types/                #   node-half hand-written entries (see note)
  src/index.ts            # host loader entry (no host behavior)
  src/invariant.ts        # invariant companion
  src/client/index.ts     # plugin body: views/events/hooks/slot registration
  src/client/changes-contract.ts          # ChangesSnapshot/ChangeMutation types + augmentations
  src/client/changes-definition.ts        # event state machine (match/start/update/buildViewNode)
  src/client/changes-reconstruct.ts       # net per-file reconstruction (pure)
  src/client/changes-diff.ts              # LCS net-diff rows (pure)
  src/client/changes-lang.ts               # extension -> language hint mapping
  src/client/changes-highlight.ts          # line-based syntax tokenizer (pure)
  src/client/changes-text.ts              # shared line helpers
  src/client/changes-snapshot-builder.ts  # per-file aggregation builder
  src/client/ChangesView.tsx              # tab component (+ custom NetDiff surface)
  src/client/ChangesView.module.css
  src/client/locales.ts                   # zh/en namespace 'changes'
  tests/changes-logic.client.spec.ts      # reconstruction + net-diff spec (18 tests)
  tests/changes-builder.client.spec.ts    # definition + builder spec (15 tests)
  tests/changes-dispatch.client.spec.ts   # PTC-mode code-dispatch spec (6 tests)
  tests/changes-highlight.client.spec.ts  # highlighter + extension mapping spec (9 tests)
  tests/client-bundle.client.spec.ts      # built-bundle spec (harness vitest)
```

## Notes

- **Build toolchain** (tsdown 0.22, lightningcss, typescript, vitest) is
  installed at the workspace root (`/home/zhoupeng/.dsh`) with the copied
  build preset files (`packages/client/tsdown.client.ts` + leaf modules,
  `scripts/client-build-environment.ts`, `tsconfig.base*.json`) so the
  harness `clientBundle` pipeline runs fully in the workspace. Rebuild and
  test after source edits:
  ```bash
  cd /home/zhoupeng/.dsh/packages/client/ui-changes
  /home/zhoupeng/.dsh/node_modules/.bin/tsdown
  /home/zhoupeng/.dsh/node_modules/.bin/vitest run tests/changes-logic.client.spec.ts tests/changes-builder.client.spec.ts tests/changes-dispatch.client.spec.ts tests/changes-highlight.client.spec.ts
  ```
- **tsconfig.json** here is the standalone build config. When (if ever) this
  package is dropped into the harness checkout, restore the harness tsconfig
  (`extends ../../../tsconfig.base.client.json` + project references).
- **lib/types/index.js + invariant.js** are hand-written node-half entries (the
  clientBundle preset consumes them as the node-half entry points; they are
  trivial — a no-op `apply` and the invariant companion).
- **Known limits** (documented behavior, not bugs): a file touched only by
  `edit` (never written in-session) reconstructs only its touched regions —
  untouched parts of the file are invisible to the session log; regions whose
  context cannot be anchored appear in change order with a `≈` marker. An
  identical write-overwrite (before === after) has empty meta diffs and is
  presented as a create from the call args. Write-creates whose call head fell
  outside the loaded window cannot be reconstructed (no content available).
- **Removal**: delete the `insert` row from `profiles/web/cordis.patch.yml`
  and the symlink; the live watcher recomposes without the plugin.
